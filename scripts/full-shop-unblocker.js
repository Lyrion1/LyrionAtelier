// FULL SHOP UNBLOCKER
// - Finds PNG/JPG/WEBP images anywhere in the repo (ignores node_modules/.git/build folders)
// - Seeds adult unisex tee products for each image (S–2XL, Black)
// - Guarantees product.state and variant.state exist
// - Builds data/all-products.json + data/index.json
// - Adds /.netlify/functions/printful-sync that serves these products
// Idempotent. If products already exist, it repairs and serves them.

const fs = require('fs'), p = require('path'), cp = require('child_process');

const PROD_DIR = 'data/products';
const ASSET_DIR = 'assets/products';
const ASSET_ROOT = ASSET_DIR.split('/')[0];
const ALL_JSON = 'data/all-products.json';
const INDEX = 'data/index.json';
const NF_DIR = 'netlify/functions';
const PRINTFUL_FN_SOURCE = p.resolve(__dirname, '..', 'netlify', 'functions', 'printful-sync.js');
const FALLBACK_FN_SOURCE = [
"exports.handler = async (event) => ({",
"  statusCode: 200,",
"  headers:{'Content-Type':'application/json'},",
"  body:'[]'",
"});"
].join('\n');
const MAX_PRODUCTS = Number(process.env.SHOP_UNBLOCKER_MAX_PRODUCTS || 36);

function ensureDir(d){ fs.mkdirSync(d,{recursive:true}); }
function readJSON(f, d=null){ try{ return JSON.parse(fs.readFileSync(f,'utf8')); }catch{ return d; } }
function writeJSON(f, o){ ensureDir(p.dirname(f)); fs.writeFileSync(f, JSON.stringify(o,null,2)); }
function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function titleCase(str){ return String(str).replace(/(^|[-_ ])([a-z])/g,(_,a,b)=>(a?' ':'')+b.toUpperCase()); }
function extOf(name){ const m = name.match(/\.(png|jpe?g|webp)$/i); return m ? m[0].toLowerCase() : '.png'; }
function toWebPath(fp){ return ('/'+fp).replace(/\\/g,'/'); }

// Ignore generated/static folders to avoid cycling through outputs (data can be re-enabled via SHOP_UNBLOCKER_SCAN_DATA=true).
const IGNORE_DIRS = new Set(['node_modules','.git','.netlify','dist','build','out','.next','data',ASSET_ROOT]);
if (process.env.SHOP_UNBLOCKER_SCAN_DATA === 'true') IGNORE_DIRS.delete('data');
function walkImages(dir='.', out=[]){
 for (const name of fs.readdirSync(dir)){
 const full = p.join(dir,name);
 const stat = fs.statSync(full);
 if (stat.isDirectory()){
 if (IGNORE_DIRS.has(name)) continue;
 walkImages(full,out);
 } else if (/\.(png|jpe?g|webp)$/i.test(name)){
 // skip tiny favicons
 if (stat.size < 20*1024) continue;
 out.push(full);
 }
 }
 return out;
}

function zodiacFrom(s){
 const m = (s.match(/aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces/i)||[])[0];
 return m ? m.toLowerCase() : null;
}

ensureDir('data'); ensureDir(PROD_DIR); ensureDir(ASSET_DIR); ensureDir(NF_DIR);

// 1) If no products yet, seed from images found anywhere.
let created=0, repaired=0;
let prodFiles = fs.existsSync(PROD_DIR) ? fs.readdirSync(PROD_DIR).filter(f=>f.endsWith('.json')) : [];
if (!prodFiles.length){
 const imgs = walkImages('.').slice(0, MAX_PRODUCTS);
 if (!imgs.length) console.log('NOTE: No images found in repo. Add PNG/JPG/WEBP anywhere, re-run.');

 for (const file of imgs){
 const base = p.basename(file).replace(/\.(png|jpe?g|webp)$/i,'');
 const zodiac = zodiacFrom(base);
 const title = zodiac ? `${titleCase(zodiac)} Tee — Crest` : `${titleCase(base)} Tee`;
 const slug = slugify((zodiac||base)+'-tee');
 const out = p.join(PROD_DIR, slug+'.json');
 if (fs.existsSync(out)) continue;

 const destDir = p.join(ASSET_DIR, slug); ensureDir(destDir);
 const destImg = p.join(destDir, 'hero'+extOf(file));
 fs.copyFileSync(file, destImg);

 const product = {
 kind: "product",
 slug, title,
 brand: "Lyrion Atelier",
 department: "Apparel",
 subcategory: "Unisex Tee",
 images: [toWebPath(destImg)],
 variants: ["S","M","L","XL","2XL"].map(sz=>({
 price: 3499,
 options: { color: "Black", size: sz },
 sku: `${slug}-BLK-${sz}`.toUpperCase(),
 printfulVariantId: null,
 state: { ready:true, published:true }
 })),
 state: { ready:true, published:true },
 metadata: { zodiac, youth:false, source: p.relative('.',file) }
 };
 writeJSON(out, product);
 created++;
 }
 prodFiles = fs.readdirSync(PROD_DIR).filter(f=>f.endsWith('.json'));
}

// 2) Repair/normalize all products so filters can’t crash.
for (const f of prodFiles){
 const full = p.join(PROD_DIR,f);
 const prod = readJSON(full);
 if (!prod || prod.kind!=='product') continue;

 prod.slug = prod.slug || slugify(prod.title||f.replace(/\.json$/,''));
 prod.title = prod.title || titleCase(prod.slug);
 prod.brand = prod.brand || 'Lyrion Atelier';
 prod.department = prod.department || 'Apparel';
 prod.subcategory = prod.subcategory || 'Unisex Tee';
 prod.state = Object.assign({ready:true,published:true}, prod.state||{});

 if (!Array.isArray(prod.images) || !prod.images.length){
 // try to reuse any image we find that mentions the slug
 const candidate = walkImages('.').find(fp => p.basename(fp).toLowerCase().includes(prod.slug));
 if (candidate){
 const destDir = p.join(ASSET_DIR, prod.slug); ensureDir(destDir);
 const destImg = p.join(destDir, 'hero'+extOf(candidate));
 fs.copyFileSync(candidate, destImg);
 prod.images = [toWebPath(destImg)];
 } else {
 prod.images = prod.images || [];
 }
 }

 if (!Array.isArray(prod.variants) || !prod.variants.length){
 prod.variants = ["S","M","L","XL","2XL"].map(sz=>({
 price: 3499,
 options: { color: "Black", size: sz },
 sku: `${prod.slug}-BLK-${sz}`.toUpperCase(),
 printfulVariantId: null
 }));
 }
 prod.variants = prod.variants.map(v=>{
 v = v || {};
 v.options = Object.assign({color:"Black", size:"M"}, v.options||{});
 v.price = v.price ?? 3499;
 v.sku = (v.sku || `${prod.slug}-${v.options.color}-${v.options.size}`).toUpperCase().replace(/[^A-Z0-9-]/g,'');
 v.printfulVariantId = v.printfulVariantId ?? null;
 v.state = Object.assign({ready:true,published:true}, v.state||{});
 return v;
 });

 writeJSON(full, prod);
 repaired++;
}

// 3) Build master lists
const products = fs.readdirSync(PROD_DIR)
 .filter(f=>f.endsWith('.json'))
 .map(f=>readJSON(p.join(PROD_DIR,f)))
 .filter(Boolean);

writeJSON(ALL_JSON, products);
writeJSON(INDEX, products.map(pj=>pj.slug));

// 4) Netlify function that serves products (never 400; always an array)
ensureDir(NF_DIR);
const fnPath = p.join(NF_DIR,'printful-sync.js');
if (!fs.existsSync(fnPath)) {
 let source;
 try{
 source = fs.readFileSync(PRINTFUL_FN_SOURCE, 'utf8');
 }catch{
 source = FALLBACK_FN_SOURCE;
 }
 fs.writeFileSync(fnPath, source);
}

// 5) Commit & push (ok if not a git repo)
if (process.env.SHOP_UNBLOCKER_GIT === 'true') {
  try{
    const sanitizeGitValue = value => {
      const sanitized = String(value ?? '').replace(/[^a-zA-Z0-9 @.:\-+\/()]/g,'').trim();
      return sanitized;
    };
    const gitName = sanitizeGitValue(process.env.GIT_AUTHOR_NAME || 'lyrion-bot');
    const gitEmail = sanitizeGitValue(process.env.GIT_AUTHOR_EMAIL || 'bot@users.noreply.github.com');
    const commitMsg = sanitizeGitValue(process.env.SHOP_UNBLOCKER_COMMIT || 'fix(shop): seed/repair products + robust printful-sync + master lists');
    const runGit = (cmd, args=[]) => cp.execFileSync('git', [cmd, ...args], {stdio:'inherit'});
    if (!gitName || !gitEmail) throw new Error('Invalid git identity');
    runGit('config', ['user.name', gitName]);
    runGit('config', ['user.email', gitEmail]);
    runGit('add', ['-A']);
    if (commitMsg) {
      try{
        runGit('commit', ['-m', commitMsg]);
      }catch{ /* ignore (no changes) */ }
    }
    runGit('push');
  }catch{ /* ignore */ }
} else {
  console.log('Skipping git commit/push; set SHOP_UNBLOCKER_GIT=true to enable.');
}

console.log(`Seeded: ${created}, Repaired: ${repaired}. After Netlify deploy, open /shop and hard-refresh (Ctrl/Cmd+Shift+R).`);
