import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import sharp from 'sharp';
import archiver from 'archiver';

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT,'data','products');
const INDEX_FILE = path.join(ROOT,'data','index.json');
const BRAND_CFG = path.join(ROOT,'data','brand-designs.json');

const OUT_BASE = path.join(ROOT,'printful-files','products');
const BRAND = {
 sun: path.join(ROOT,'printful-files','brand','sun-1_25in.png'), // 375 px
 adult: path.join(ROOT,'printful-files','brand','logo-adult-1_2in.png'), // 360 px
 youth: path.join(ROOT,'printful-files','brand','logo-youth-1_2in.png'), // 360 px
 neck: path.join(ROOT,'printful-files','brand','neck-label-3x4in.png') // 900x1200
};

function loadJSON(file, def=null){ try{ return JSON.parse(fs.readFileSync(file,'utf8')); }catch{ return def; } }
function loadSlugs(){
 try { const s = JSON.parse(fs.readFileSync(INDEX_FILE,'utf8')); if (Array.isArray(s)&&s.length) return s; } catch {}
 return fg.sync('*.json',{cwd:PRODUCTS_DIR}).map(f=>f.replace(/\.json$/,''));
}
function loadProduct(slug){ return loadJSON(path.join(PRODUCTS_DIR, slug+'.json')); }
function money(c){ return (Number(c||0)/100).toFixed(2); }

const cfg = Object.assign({backs:{adult:[],youth:[]},fronts:{adult:[],youth:[]},sizes:{back_in:12,front_in:12}}, loadJSON(BRAND_CFG, {}));
const isBackAdult = slug => new Set(cfg.backs.adult).has(slug);
const isBackYouth = slug => new Set(cfg.backs.youth).has(slug);
const isFrontAdult= slug => new Set(cfg.fronts.adult).has(slug);
const isFrontYouth= slug => new Set(cfg.fronts.youth).has(slug);

function dept(p){
 const sub=(p.subcategory||'').toLowerCase();
 if ((p.department||'').toLowerCase()==='homeware') return 'home';
 if ((p.department||'').toLowerCase()==='digital') return 'digital';
 if (sub.includes('youth')||sub.includes('kid')) return 'youth';
 return 'adult';
}

function frontWidthIn(p){
 const sub=(p.subcategory||'').toLowerCase();
 let w=12; if (sub.includes('crew')) w=11.5; if (sub.includes('hood')) w=12;
 if (p.slug==='aquarian-current-hoodie') w=6; // special crest hoodie
 // allow override to pure brand-front
 if (isFrontAdult(p.slug) || isFrontYouth(p.slug)) w = cfg.sizes.front_in || w;
 return w;
}
function backWidthIn(p){ return cfg.sizes.back_in || 12; }

function firstImagePath(p){
 const img=(p.images||[])[0]||''; if (img) return path.join(ROOT, img.replace(/^\//,''));
 const guess=fg.sync('assets/artwork/**/*'+(p.slug||'')+'*.{png,jpg,jpeg,webp}',{cwd:ROOT,absolute:true})[0];
 return guess||null;
}
async function ensurePNGsrc(src){
 if(!src) return null; const ext=path.extname(src).toLowerCase();
 if(ext==='.png') return src; const tmp=src.replace(/\.(jpg|jpeg|webp)$/i,'.png'); await sharp(src).png().toFile(tmp); return tmp;
}
async function saveSquare(src,size,outPath){
 await fs.promises.mkdir(path.dirname(outPath),{recursive:true});
 await sharp(src).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toFile(outPath);
}
async function makeFront(p,outDir){
 // brand-front override?
 const useBrandFront = isFrontAdult(p.slug) || isFrontYouth(p.slug);
 const widthIn = frontWidthIn(p);
 const px = Math.round(widthIn*300);
 let src = null;
 if (useBrandFront) src = isFrontYouth(p.slug) ? BRAND.youth : BRAND.adult;
 else src = firstImagePath(p);
 if (!src) return null;
 const srcPNG = await ensurePNGsrc(src);
 const meta = await sharp(srcPNG).metadata();
 const h = Math.round((meta.height||px) * (px/(meta.width||px)));
 const canvas = sharp({ create: { width:px, height:h, channels:4, background:{r:0,g:0,b:0,alpha:0} } });
 const buf = await sharp(srcPNG).resize({ width:px, fit:'contain' }).png().toBuffer();
 const out = path.join(outDir, `front-${px}px.png`);
 await canvas.composite([{input:buf,left:0,top:0}]).png({compressionLevel:9}).toFile(out);
 return { file: out, px, width_in: widthIn, brand_front: useBrandFront };
}
async function makeBackLogo(p,outDir){
 const useAdult = isBackAdult(p.slug);
 const useYouth = isBackYouth(p.slug);
 if (!useAdult && !useYouth) return null;
 const logo = useYouth ? BRAND.youth : BRAND.adult;
 const widthIn = backWidthIn(p);
 const px = Math.round(widthIn*300);
 const out = path.join(outDir, `back-${px}px.png`);
 await saveSquare(logo, px, out);
 return { file: out, px, width_in: widthIn, logo: useYouth?'youth':'adult' };
}
async function copyIfExists(src,dest){ try{ await fs.promises.access(src,fs.constants.R_OK); await fs.promises.mkdir(path.dirname(dest),{recursive:true}); await fs.promises.copyFile(src,dest); return dest; }catch{ return null; } }

async function zipDir(dir, zipPath){
 await fs.promises.mkdir(path.dirname(zipPath),{recursive:true});
 const out = fs.createWriteStream(zipPath); const archive=archiver('zip',{zlib:{level:9}});
 return new Promise((resolve,reject)=>{ out.on('close',()=>resolve(zipPath)); archive.on('error',reject); archive.pipe(out); archive.directory(dir,false); archive.finalize(); });
}

async function run(){
 const slugs = loadSlugs();
 for(const slug of slugs){
 const p = loadProduct(slug); if(!p || p.kind!=='product') continue;
 const dir = path.join(OUT_BASE, slug); await fs.promises.mkdir(dir,{recursive:true});

 const deptName = dept(p);
 const crestSrc = deptName==='youth' ? BRAND.youth : BRAND.adult;

 const front = await makeFront(p, dir);
 const sleeve= await copyIfExists(crestSrc, path.join(dir,'sleeve-crest-1_2in.png'));
 const back = await makeBackLogo(p, dir);
 const neck = await copyIfExists(BRAND.neck, path.join(dir,'inside-label-3x4in.png'));
 const bneck = await copyIfExists(BRAND.sun, path.join(dir,'backneck-sun-1_25in.png'));

 const manifest = {
 title:p.title, slug, department:p.department, subcategory:p.subcategory,
 priceUSD: p.variants && p.variants[0] ? money(p.variants[0].price) : '0.00',
 front: front ? { file:path.basename(front.file), width_px:front.px, width_in:front.width_in, brand_front:!!front.brand_front } : null,
 back_logo: back ? { file:path.basename(back.file), width_px:back.px, width_in:back.width_in, logo:back.logo } : null,
 sleeve_crest: sleeve ? path.basename(sleeve) : null,
 backneck_sun: bneck ? path.basename(bneck) : null,
 inside_label: neck ? path.basename(neck) : null
 };
 await fs.promises.writeFile(path.join(dir,'manifest.json'), JSON.stringify(manifest,null,2));
 await zipDir(dir, path.join(dir,'pack.zip'));
 console.log('[pack]', slug);
 }
}
await run();
