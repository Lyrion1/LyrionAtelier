// /.netlify/functions/printful-sync
export async function handler(event) {
 try {
 const key = process.env.PRINTFUL_API_KEY || process.env.PRINTFUL_TOKEN || '';
 if (!key) return json(400, { error: 'Missing PRINTFUL_API_KEY in Netlify env' });

 const baseApi = 'https://api.printful.com';
 const site = (process.env.URL || `https://${event.headers['x-forwarded-host']}`).replace(/\/$/,'');
 const brandCfg = tryRead('data/brand-designs.json') || {};
 const idx = tryRead('data/index.json') || [];
 const slugs = (Array.isArray(idx) ? idx : []).filter(Boolean);
 const slugFilter = (event.queryStringParameters || {}).slug;
 const picked = slugFilter ? slugs.filter(s=>s===slugFilter) : slugs;

 const results = [];
 for (const slug of picked) {
 const prod = tryRead(`data/products/${slug}.json`);
 if (!prod || prod.kind!=='product') continue;

 const { productId, created } = await ensureSyncProduct(prod, key, baseApi, slug);

 // file URLs (HEAD check to include only what exists)
 const pxFront = Math.round(frontWidthIn(prod, brandCfg) * 300);
 const pxBack = Math.round((brandCfg?.sizes?.back_in || 12) * 300);
 const base = `${site}/printful-files/products/${slug}`;

 const files = [];
 if (await head(`${base}/front-${pxFront}px.png`)) files.push(file('front', `${base}/front-${pxFront}px.png`));
 if (await head(`${base}/back-${pxBack}px.png`)) files.push(file('back', `${base}/back-${pxBack}px.png`));
 if (await head(`${base}/sleeve-crest-1_2in.png`)) files.push(file('sleeve_right', `${base}/sleeve-crest-1_2in.png`));
 if (await head(`${base}/backneck-sun-1_25in.png`)) files.push(file('label_outside', `${base}/backneck-sun-1_25in.png`));
 if (await head(`${base}/inside-label-3x4in.png`)) files.push(file('label_inside', `${base}/inside-label-3x4in.png`));

 const detail = await pfGET(`${baseApi}/store/products/${productId}`, key);
 const existing = (detail?.result?.sync_variants || []);
 const existBySku = Object.fromEntries(existing.map(v=>[v.sku, v.id]));

 let createdN=0, updatedN=0, skippedN=0;
 for (const v of (prod.variants || [])) {
 if (!v || v.hidden === true) continue;
 if (!v.printfulVariantId) { skippedN++; continue; }
 const payload = {
 retail_price: centsToPrice(v.price || 0),
 variant_id: v.printfulVariantId,
 sku: String(v.sku || `${slug}-${v.options?.color||''}-${v.options?.size||''}`).replace(/\s+/g,'').toUpperCase(),
 files
 };
 if (existBySku[payload.sku]) { await pfPUT(`${baseApi}/store/variants/${existBySku[payload.sku]}`, key, payload); updatedN++; }
 else { await pfPOST(`${baseApi}/store/variants`, key, { sync_product_id: productId, ...payload }); createdN++; }
 }
 results.push({ slug, productId, created, createdN, updatedN, skippedN });
 }
 return json(200, { ok:true, results });

 } catch (e) {
 return json(500, { error: e?.message || 'sync error' });
 }
}

function json(code, body){ return { statusCode: code, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }; }
function tryRead(f){ try{ return JSON.parse(require('fs').readFileSync(f,'utf8')); }catch{ return null; } }
async function head(url){ try{ const r = await fetch(url,{method:'HEAD'}); return r.ok; } catch { return false; } }
function centsToPrice(c){ return (Number(c||0)/100).toFixed(2); }
function file(type, url){ return { type, url }; }
function frontWidthIn(p, cfg){
 const sub=(p.subcategory||'').toLowerCase();
 let w=12; if (sub.includes('crew')) w=11.5; if (sub.includes('hood')) w=12;
 const fronts = new Set([...(cfg?.fronts?.adult||[]), ...(cfg?.fronts?.youth||[])]);
 if (fronts.has(p.slug)) w = cfg?.sizes?.front_in || w;
 if (p.slug==='aquarian-current-hoodie') w=6;
 return w;
}

async function ensureSyncProduct(prod, key, baseApi, slug){
 const found = await pfGET(`${baseApi}/store/products?external_id=${encodeURIComponent(slug)}`, key);
 const id = found?.result?.[0]?.id;
 if (id) {
 await pfPUT(`${baseApi}/store/products/${id}`, key, { sync_product: { name: prod.title, external_id: slug } }).catch(()=>{});
 return { productId:id, created:false };
 }
 const created = await pfPOST(`${baseApi}/store/products`, key, { sync_product: { name: prod.title, external_id: slug } });
 return { productId: created?.result?.id, created:true };
}
async function pfGET(url, key){ const r = await fetch(url, { headers:{ Authorization:`Bearer ${key}` } }); if(!r.ok) throw new Error('GET '+r.status+' '+url); return r.json(); }
async function pfPOST(url, key, body){ const r = await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` }, body: JSON.stringify(body)}); if(!r.ok){ const t=await r.text(); throw new Error('POST '+r.status+' '+url+' '+t); } return r.json(); }
async function pfPUT(url, key, body){ const r = await fetch(url,{ method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` }, body: JSON.stringify(body)}); if(!r.ok){ const t=await r.text(); throw new Error('PUT '+r.status+' '+url+' '+t); } return r.json(); }
