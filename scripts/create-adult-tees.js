// Make products (adult tees) from every image in /_incoming/
// Safe to run again. Creates product JSON + copies images to /assets/products/ + updates data/index.json

const fs = require('fs'), p = require('path'), cp = require('child_process');

const IN = '_incoming';
const PROD = 'data/products';
const ASSET = 'assets/products';

function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function titleCase(str){return str.replace(/(^|[-_ ])([a-z])/g,(_,a,b)=>(a?' ':'')+b.toUpperCase());}

fs.mkdirSync('data',{recursive:true});
fs.mkdirSync(PROD,{recursive:true});
fs.mkdirSync(ASSET,{recursive:true});

let index=[]; try{ index=JSON.parse(fs.readFileSync('data/index.json','utf8')); }catch{}

const files=(fs.existsSync(IN)?fs.readdirSync(IN):[]).filter(f=>/\.(png|jpe?g|webp)$/i.test(f));
if(!files.length){ console.log('No images in /_incoming/. Upload first, then run again.'); process.exit(0); }

for(const file of files){
 const base=p.basename(file).replace(/\.(png|jpe?g|webp)$/i,'');
 const zMatch=base.match(/aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces/i);
 const zodiac=zMatch?zMatch[0].toLowerCase():null;

 const title=zodiac?`${titleCase(zodiac)} Tee — Crest`:`${titleCase(base)} Tee`;
 const slug=slugify((zodiac?zodiac:base)+'-tee');
 const prodPath=p.join(PROD,slug+'.json');
 if(fs.existsSync(prodPath)){ console.log('skip existing', slug); continue; }

 // copy image to product assets
 const src=p.join(IN,file);
 const destDir=p.join(ASSET,slug);
 fs.mkdirSync(destDir,{recursive:true});
 const destImg=p.join(destDir,'hero'+p.extname(file).toLowerCase());
 fs.copyFileSync(src,destImg);

 const product={
 kind:"product",
 slug,
 title,
 brand:"Lyrion Atelier",
 department:"Apparel",
 subcategory:"Unisex Tee",
 images:[('/'+destImg).replace(/\\/g,'/')],
 variants:["S","M","L","XL","2XL"].map(sz=>({
 price:3499, // USD $34.99
 options:{color:"Black",size:sz},
 sku:`${slug}-BLK-${sz}`,
 printfulVariantId:null
 })),
 metadata:{zodiac,youth:false,source:file}
 };

 fs.writeFileSync(prodPath, JSON.stringify(product,null,2));
 if(!index.includes(slug)) index.push(slug);
 console.log('created', slug);
}

fs.writeFileSync('data/index.json', JSON.stringify(index,null,2));

try{
 cp.execSync('git config user.name "lyrion-bot" && git config user.email "bot@users.noreply.github.com"', {stdio:'inherit'});
 cp.execSync('git add -A && git commit -m "feat(products): initial adult tees from images" || echo "No changes"', {stdio:'inherit', shell:true});
 cp.execSync('git push', {stdio:'inherit'});
}catch(e){ console.log('git push skipped (ok):', e?.message || e); }

console.log('Done. Visit /shop to see the new tees.');
