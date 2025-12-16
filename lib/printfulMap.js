export async function resolvePrintfulIds(product) {
  try {
    // Early out if all variants already mapped
    if (!product?.variants?.length) return product;
    if (product.variants.every(v => v.printfulVariantId)) return product;

    // Attempt a sku_prefix from the first variant ("LY-EG-SCO-TEE-NOIR-XS" -> "LY-EG-SCO-TEE-NOIR")
    const firstSku = product.variants[0]?.sku || '';
    const parts = firstSku.split('-');
    const sku_prefix = parts.length > 4 ? parts.slice(0, parts.length - 1).join('-') : '';

    const url = `/netlify/functions/printful-variants?${new URLSearchParams({ sku_prefix })}`;
    const res = await fetch(url, { cache: 'no-store' });
    const { map = {} } = await res.json();

    for (const v of product.variants) {
      const id = map[v.sku];
      if (id) {
        v.printfulVariantId = id;
        v.variant = v.variant || {};
        if (!v.variant._id) v.variant._id = id;
      }
    }
  } catch (e) {
    console.debug('[printfulMap] skipped:', e?.message);
  }
  return product;
}
