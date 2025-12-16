// netlify/functions/sku-csv.js
const fs = require('fs');
const path = require('path');

function listProductsDir(root){
 const out = [];
 try {
 const files = fs.readdirSync(root);
 for (const f of files){
 if (!/\.json$/i.test(f)) continue;
 try {
 const content = fs.readFileSync(path.join(root, f), 'utf8');
 const j = JSON.parse(content);
 out.push(j);
 } catch (err) { console.error('parse error', f, err?.message); }
 }
 } catch (err) { console.error('list dir failed', root, err?.message); }
 return out;
}
function money(c){ return (Number(c||0)/100).toFixed(2); }

const FRONT_WIDTH_DEFAULT = 12;
const FRONT_WIDTH_CREW = 11.5;
const FRONT_WIDTH_HOOD = 12;
const DIM_SLEEVE_CREST_IN = 1.2;
const DIM_BACK_NECK_IN = 1.25;

async function buildResponse(){
 try{
 const idxPath = 'data/index.json';
 let slugs = [];
 try { slugs = JSON.parse(fs.readFileSync(idxPath,'utf8')); } catch (err) { console.error('index load failed', err?.message); }
 // Load by index if present, else glob the folder
 let prods = [];
 if (Array.isArray(slugs) && slugs.length){
 for (const slug of slugs){
 const f = path.join('data','products', slug + '.json');
 try { prods.push(JSON.parse(fs.readFileSync(f,'utf8'))); } catch (err) { console.error('product load failed', f, err?.message); }
 }
 } else {
 prods = listProductsDir(path.join('data','products'));
 }

 // Filter: only kind=product
 prods = prods.filter(p => (p && p.kind === 'product'));

 // CSV header
 const cols = [
 'Title','Slug','Department','Subcategory','Collection','Edition',
 'Zodiac','Element','Palette',
 'VariantColor','VariantSize','SKU','PriceUSD',
 'PrintfulVariantId','BrandMark_Wrist','BackNeckSun','InsideLabel',
 'Front_Width_in','Sleeve_Crest_in','BackNeck_in','Notes','Image'
 ];
 const rows = [cols.join(',')];

 for (const p of prods){
 // Heuristic: suggest front width by subcategory
 const sub = (p.subcategory||'').toLowerCase();
 let frontW = FRONT_WIDTH_DEFAULT;
 if (sub.includes('crew')) frontW = FRONT_WIDTH_CREW;
 if (sub.includes('hood')) frontW = FRONT_WIDTH_HOOD;

 const wrist = p.brand_marks?.wrist_logo || '';
 const backNeck = p.brand_marks?.back_neck_favicon ? DIM_BACK_NECK_IN : '';
 const inside = p.brand_marks?.inside_label ? '3x4' : '';

 for (const v of (p.variants||[])){
 const row = [
 `"${(p.title||'').replace(/"/g,'""')}"`,
 p.slug || '',
 p.department || '',
 p.subcategory || '',
 p.collection || '',
 p.edition || '',
 p.zodiac || '',
 p.element || '',
 p.palette || '',
 v.options?.color || '',
 v.options?.size || '',
 v.sku || '',
 money(v.price || 0),
 v.printfulVariantId ?? '',
 wrist,
 backNeck,
 inside,
 frontW, DIM_SLEEVE_CREST_IN, DIM_BACK_NECK_IN,
 `"${(p.copy?.notes||'').replace(/"/g,'""')}"`,
 (p.images&&p.images[0]) || ''
 ];
 rows.push(row.join(','));
 }
 }

 const csv = rows.join('\n');
 return { statusCode: 200, headers: {'Content-Type':'text/csv','Content-Disposition':'attachment; filename="lyrion-printful-skus.csv"'}, body: csv };
 } catch (e){
 return { statusCode: 500, body: 'CSV error: ' + (e?.message||'unknown') };
 }
}

exports.handler = async function(event){
 if (event && event.httpMethod && event.httpMethod !== 'GET') {
 return { statusCode: 405, body: 'Method Not Allowed' };
 }
 return buildResponse();
};
