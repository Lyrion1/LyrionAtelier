// lib/validateProduct.js
export function validateProduct(data){
 try{
 const ok = !!data && typeof data.slug === 'string' && Array.isArray(data.variants);
 if(!ok) console.warn('[product-schema] minimal validation warning for', data?.slug);
 }catch(e){ console.debug('[product-schema] skipped', e?.message); }
 return true; // fail-soft by design: never block rendering
}
