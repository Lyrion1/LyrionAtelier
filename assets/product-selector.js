// assets/product-selector.js
import { loadProduct, routeIsEventish } from '/lib/catalog.js';
import { validateProduct } from '/lib/validateProduct.js';

function $(s,r=document){ return r.querySelector(s); }
function $all(s,r=document){ return Array.from(r.querySelectorAll(s)); }

async function initSelector(){
 // HARD GUARD: never run on Events/Codex/Contact
 if (routeIsEventish()) return;

 const el = document.getElementById('product-selector');
 if (!el) return;
 if (el.dataset.initialized) return;
 const slug = el.dataset.slug;
 if (!slug) return;

 const product = await loadProduct(slug);
 await validateProduct(product);
 el.dataset.initialized = 'true';

 const sizes = product.options?.size || [];
 const colors = product.options?.color || [];

 const wrap = document.createElement('div'); wrap.className='ps-wrap';
 const priceEl = document.createElement('div'); priceEl.className='ps-price';
 const colorRow = document.createElement('div'); colorRow.className='ps-options'; colorRow.dataset.opt='color';
 const sizeRow = document.createElement('div'); sizeRow.className='ps-options'; sizeRow.dataset.opt='size';
 const addBtn = document.createElement('button'); addBtn.className='ps-add'; addBtn.type='button'; addBtn.textContent='Add to cart';
 const note = document.createElement('div'); note.className='ps-note';

 wrap.append(priceEl);
 if (colors.length) wrap.append(colorRow);
 wrap.append(sizeRow, addBtn, note);
 el.appendChild(wrap);

 const mk = (v,sel=false)=>{ const b=document.createElement('button'); b.type='button'; b.className='ps-chip'; b.textContent=v; b.setAttribute('aria-pressed', sel?'true':'false'); return b; };
 colors.forEach((c,i)=> colorRow.appendChild(mk(c, i===0)));
 sizes.forEach((s,i)=> sizeRow.appendChild(mk(s, i===0)));

 const getSel = ()=>({
 color: colors.length ? colorRow.querySelector('.ps-chip[aria-pressed="true"]')?.textContent : (colors[0]||null),
 size: sizeRow.querySelector('.ps-chip[aria-pressed="true"]')?.textContent || sizes[0]
 });

 const findVar = (sel)=> (product.variants||[]).find(v=>{
 const okC = !sel.color || !v.options?.color || v.options.color === sel.color;
 return okC && v.options?.size === sel.size;
 });

 const price = c => `$${(c/100).toFixed(2)}`;
 const refresh = ()=>{
 const sel = getSel();
 const v = findVar(sel);
 if (!v){ addBtn.disabled = true; note.textContent='Unavailable'; priceEl.textContent=''; return; }
 addBtn.disabled = v.status && v.status !== 'active';
 priceEl.textContent = price(v.price);
 const pf = v.printfulVariantId ?? null;
 note.textContent = pf ? `Variant ready • ID ${pf}` : `Variant ready • Printful ID to be mapped`;
 };

 el.addEventListener('click', e=>{
 const btn = e.target.closest('.ps-chip'); if(!btn) return;
 const row = btn.parentElement; $all('.ps-chip', row).forEach(b=>b.setAttribute('aria-pressed','false'));
 btn.setAttribute('aria-pressed','true'); refresh();
 });

 addBtn.addEventListener('click', ()=>{
 const sel = getSel();
 const v = findVar(sel); if(!v) return;
 const quantity = 1;

 const variantId = v.variant?._id ?? v.printfulVariantId ?? product.slug;
 const payload = {
 slug: product.slug, title: product.title, price: v.price, sku: v.sku,
 variant: { _id: variantId, options: v.options },
 printfulVariantId: v.printfulVariantId ?? null, quantity, image: product.images?.[0] || null
 };
 const cartProduct = {
 id: variantId,
 name: product.title,
 price: v.price / 100,
 image: product.images?.[0] || null,
 category: product.department || 'product',
 printfulVariantId: v.printfulVariantId ?? null,
 variantId
 };

 if (typeof window.addToCart === 'function') { try { window.addToCart(cartProduct.id, quantity, v.options?.size, cartProduct); } catch(e){ console.warn('addToCart failed', e); } }
 else { document.dispatchEvent(new CustomEvent('cart:add', { detail: payload })); }

 try { window.dataLayer && window.dataLayer.push({ event:'add_to_cart', item: payload }); } catch(_) {}
 });

 refresh();
}

if (document.readyState !== 'loading') initSelector();
else document.addEventListener('DOMContentLoaded', initSelector);
