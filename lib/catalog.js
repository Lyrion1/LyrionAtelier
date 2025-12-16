// lib/catalog.js
export function routeIsEventish() {
 const p = location.pathname.toLowerCase();
 return p.startsWith('/codex') || p.startsWith('/events') || p.includes('/codex') || p.includes('/events') || p.startsWith('/contact');
}
export function isSellable(item){ return item?.kind === 'product' && item?.edition !== 'archive'; }

export async function loadProduct(slug){
 if (window.PRODUCT_DATA && window.PRODUCT_DATA.slug === slug) return window.PRODUCT_DATA;
 const res = await fetch(`/data/products/${slug}.json`, { cache: 'no-store' });
 if (!res.ok) throw new Error(`Product not found: ${slug}`);
 const data = await res.json();
 (data.variants||[]).forEach(v=>{
 v.variant = v.variant || {};
 if (typeof v.variant._id === 'undefined') v.variant._id = v.printfulVariantId ?? null;
 });
 return data;
}
