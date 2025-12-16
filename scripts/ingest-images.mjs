import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import sharp from 'sharp';

const ROOT = process.cwd();
const INCOMING = path.join(ROOT,'_incoming');
const PRODUCTS_DIR = path.join(ROOT,'data','products');
const BRAND_DIRS = {
  adult: path.join(ROOT,'assets','artwork','adult'),
  youth: path.join(ROOT,'assets','artwork','youth'),
  home: path.join(ROOT,'assets','artwork','home'),
  digital: path.join(ROOT,'assets','artwork','digital'),
};

const ZOD = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

function readJSON(f){
  try{
    return JSON.parse(fs.readFileSync(f,'utf8'));
  }catch(e){
    console.warn('[readJSON] failed', f, e.message);
    return null;
  }
}
function slugTokens(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9-]+/g,'-'); }
function pickDept(p){
  if (p.department==='homeware') return 'home';
  if (p.department==='digital') return 'digital';
  const isYouth = p.subcategory && String(p.subcategory).includes('youth');
  if (p.department==='apparel') return isYouth ? 'youth' : 'adult';
  if (isYouth) return 'youth';
  return 'adult';
}

function expectedPath(p){
  // Use the first image path if present; otherwise compose sane defaults by department
  const first = (p.images&&p.images[0]) || '';
  if (first) return path.join(ROOT, first.replace(/^\//,''));
  const dept = pickDept(p);
  const base = dept==='home' ? 'jpg' : (dept==='digital' ? 'jpg' : 'png');
  const name = (p.slug||'product') + '.' + base;
  return path.join(BRAND_DIRS[dept], name);
}

function keywordsFor(p){
  const keys = new Set();
  const push = v => v && String(v).toLowerCase().split(/[^a-z0-9]+/).forEach(k => k && keys.add(k));
  push(p.slug); push(p.title); push(p.zodiac); push(p.collection);
  return Array.from(keys);
}

function scoreMatch(name, product){
  const low = name.toLowerCase();
  let s = 0;
  for (const k of keywordsFor(product)){
    if (low.includes(k)) s += 2;
  }
  // bonus for zodiac direct hit
  if (product.zodiac && low.includes(product.zodiac)) s += 3;
  // small bonus for department hints
  if (/youth|kid|child/.test(low) && pickDept(product)==='youth') s += 1;
  if (/poster|panel|grid/.test(low) && pickDept(product)==='home') s += 1;
  return s;
}

async function processImage(src, outPath){
  await fs.promises.mkdir(path.dirname(outPath), { recursive:true });
  const ext = path.extname(outPath).toLowerCase();
  // Normalize to square-friendly max 2400px while preserving AR
  const input = sharp(src).rotate();
  const meta = await input.metadata();
  const maxDim = 2400;
  const w = meta.width || maxDim, h = meta.height || maxDim;
  const scale = Math.min(maxDim / w, maxDim / h, 1);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  if (ext === '.jpg' || ext === '.jpeg'){
    await input.resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toFile(outPath);
  } else {
    await input.resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outPath);
  }
  // Also write webp sibling for performance
  const webpPath = outPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  await sharp(src).rotate().resize({ width, height, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toFile(webpPath);
}

async function main(){
  // Load products
  const files = fg.sync('data/products/*.json', { cwd: ROOT });
  const products = files.map(f => readJSON(path.join(ROOT, f))).filter(Boolean);

  // Map override
  let override = {};
  try {
    override = JSON.parse(fs.readFileSync(path.join(INCOMING,'map.json'),'utf8'));
  } catch (e) {
    console.warn('[map] no override map.json loaded', e.message);
  }

  // Collect incoming images
  const incoming = fg.sync(['_incoming/**/*.{png,jpg,jpeg,webp}'], { cwd: ROOT, absolute:true });

  let moves = [];
  for (const src of incoming){
    const base = path.basename(src);
    const hintedSlug = override[base];
    let targetProd = null;

    if (hintedSlug){
      targetProd = products.find(p => p.slug === hintedSlug) || null;
    } else {
      // Score every product and pick best
      let best = { s:-1, prod:null };
      for (const p of products){
        const s = scoreMatch(base, p);
        if (s > best.s) best = { s, prod: p };
      }
      if (best.s >= 2) targetProd = best.prod; // require minimal confidence
    }

    if (!targetProd){
      console.log('[skip] could not match', base);
      continue;
    }

    const out = expectedPath(targetProd);
    moves.push({ src, out });
  }

  // Deduplicate by output (last one wins)
  const byOut = new Map();
  for (const m of moves){ byOut.set(m.out, m); }

  let ok=0, skip=0;
  for (const m of byOut.values()){
    try {
      await processImage(m.src, m.out);
      console.log('[ok]', path.basename(m.src), '→', m.out.replace(ROOT,''));
      ok++;
    } catch (e){
      console.log('[error]', m.src, e.message); skip++;
    }
  }

  // Optionally clean processed files
  for (const m of byOut.values()){
    try { fs.unlinkSync(m.src); } catch {}
  }

  console.log('Done. Processed:', ok, 'Skipped:', skip);
}

await main();
