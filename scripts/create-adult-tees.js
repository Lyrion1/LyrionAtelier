// REPAIR PRODUCTS + SEED FROM /_incoming IF EMPTY
// - Builds adult tees from images in /_incoming if no products exist
// - Ensures product.state and variant.state exist
// - Ensures images exist (copies to /assets/products/<slug>/hero.*)
// - Rebuilds data/index.json
// Safe to run again.

const fs = require('fs'), p = require('path'), cp = require('child_process');

const INCOMING = '_incoming';
const PROD_DIR = 'data/products';
const ASSET_DIR = 'assets/products';
const INDEX = 'data/index.json';

function ensureDir(d){ fs.mkdirSync(d,{recursive:true}); }
function readJSON(f, def=null){ try{ return JSON.parse(fs.readFileSync(f,'utf8')); } catch { return def; } }
function writeJSON(f, obj){ ensureDir(p.dirname(f)); fs.writeFileSync(f, JSON.stringify(obj,null,2)); }
function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function titleCase(str){ return String(str).replace(/(^|[-_ ])([a-z])/g,(_,a,b)=>(a?' ':'')+b.toUpperCase()); }
function extOf(name){ const m = name.match(/\.(png|jpe?g|webp)$/i); return m ? m[0].toLowerCase() : '.png'; }

ensureDir('data'); ensureDir(PROD_DIR); ensureDir(ASSET_DIR);

// 1) existing products?
const existing = fs.readdirSync(PROD_DIR).filter(f=>f.endsWith('.json'));
let created = 0, patched = 0;

async function seedFromIncoming(){
 const files = fs.existsSync(INCOMING) ? fs.readdirSync(INCOMING).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)) : [];
 if (!files.length) return;

 for (const file of files){
 const base = file.replace(/\.(png|jpe?g|webp)$/i, '');
 const zodiac = ((base.match(/aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces/i)||[])[0]) || null;
 const title = zodiac ? `${titleCase(zodiac)} Tee — Crest` : `${titleCase(base)} Tee`;
 const slug = slugify((zodiac||base) + '-tee');
 const out = p.join(PROD_DIR, slug + '.json');
 if (fs.existsSync(out)) continue;

 const destDir = p.join(ASSET_DIR, slug); ensureDir(destDir);
 const destImg = p.join(destDir, 'hero' + extOf(file));
 fs.copyFileSync(p.join(INCOMING,file), destImg);

 const product = {
 kind: "product",
 slug,
 title,
 brand: "Lyrion Atelier",
 department: "Apparel",
 subcategory: "Unisex Tee",
 images: [('/' + destImg).replace(/\\/g,'/')],
 variants: ["S","M","L","XL","2XL"].map(sz=>({
 price: 3499,
 options: { color: "Black", size: sz },
 sku: `${slug}-BLK-${sz}`.toUpperCase(),
 printfulVariantId: null,
 state: { ready: true, published: true }
 })),
 state: { ready: true, published: true },
 metadata: { zodiac: zodiac ? zodiac.toLowerCase() : null, youth: false, source: file }
 };

 writeJSON(out, product); created++;
 }
}

function repairAll(){
 const files = fs.readdirSync(PROD_DIR).filter(f=>f.endsWith('.json'));
 for (const f of files){
 const full = p.join(PROD_DIR, f);
 const prod = readJSON(full);
 if (!prod || prod.kind !== 'product') continue;

 // Ensure basics
 prod.slug = prod.slug || slugify(prod.title||f.replace(/\.json$/,''));
 prod.title = prod.title || titleCase(prod.slug);
 prod.brand = prod.brand || 'Lyrion Atelier';
 prod.department = prod.department || 'Apparel';
 prod.subcategory = prod.subcategory || 'Unisex Tee';
 prod.state = Object.assign({ ready:true, published:true }, prod.state || {});

 // Ensure image
 if (!Array.isArray(prod.images) || !prod.images.length){
 // try to find a matching incoming file
 const inc = fs.existsSync(INCOMING) ? fs.readdirSync(INCOMING).find(n => {
 const lower = n.toLowerCase();
 return lower.startsWith(prod.slug.toLowerCase()) && /\.(png|jpe?g|webp)$/i.test(lower);
 }) : null;
 if (inc){
 const destDir = p.join(ASSET_DIR, prod.slug); ensureDir(destDir);
 const destImg = p.join(destDir, 'hero' + extOf(inc));
 fs.copyFileSync(p.join(INCOMING, inc), destImg);
 prod.images = [('/' + destImg).replace(/\\/g,'/')];
 }
 }

 // Ensure variants
 if (!Array.isArray(prod.variants) || !prod.variants.length){
 prod.variants = ["S","M","L","XL","2XL"].map(sz=>({
 price: prod.price || 3499,
 options: { color: "Black", size: sz },
 sku: `${prod.slug}-BLK-${sz}`.toUpperCase(),
 printfulVariantId: null
 }));
 }
 prod.variants = prod.variants.map(v=>{
 v = v || {};
 v.options = Object.assign({ color:"Black", size:"M" }, v.options||{});
 v.price = v.price ?? 3499;
 v.sku = (v.sku || `${prod.slug}-${v.options.color}-${v.options.size}`).toUpperCase().replace(/[^A-Z0-9-]/g,'');
 v.printfulVariantId = v.printfulVariantId ?? null;
 v.state = Object.assign({ ready:true, published:true }, v.state || {});
 return v;
 });

 writeJSON(full, prod); patched++;
 }
}

(async () => {
 if (!existing.length) await seedFromIncoming();
 repairAll();

 // Rebuild index.json from real files
 const slugs = fs.readdirSync(PROD_DIR)
 .filter(f=>f.endsWith('.json'))
 .map(f=>readJSON(p.join(PROD_DIR,f)))
 .filter(Boolean)
 .map(pj=>pj.slug)
 .filter(Boolean);

 writeJSON(INDEX, slugs);

 // Commit (ok if not a git repo)
 try{
 cp.execSync('git config user.name "lyrion-bot" && git config user.email "bot@users.noreply.github.com"', {stdio:'inherit'});
 cp.execSync('git add -A && git commit -m "fix(products): seed/repair products + rebuild index" || echo "No changes"', {stdio:'inherit', shell:true});
 cp.execSync('git push', {stdio:'inherit'});
 }catch(e){ console.log('git push skipped (ok):', e?.message || e); }

 console.log(`Products created: ${created}, repaired: ${patched}. Open /shop and hard-refresh (Cmd/Ctrl+Shift+R).`);
})();
