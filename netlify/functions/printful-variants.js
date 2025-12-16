export async function handler(event) {
  try {
    const API = process.env.PRINTFUL_API_KEY;
    if (!API) return { statusCode: 200, body: JSON.stringify({ map: {}, note: 'PRINTFUL_API_KEY missing' }) };

    const params = event.queryStringParameters || {};
    const product_id = params.product_id || '';
    const sku_prefix = params.sku_prefix || '';

    const endpoint = product_id
      ? `https://api.printful.com/store/products/${product_id}`
      : 'https://api.printful.com/store/variants';

    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${API}` } });
    if (!res.ok) return { statusCode: res.status, body: await res.text() };

    const json = await res.json();
    let variants = [];
    // Try to normalize across endpoints/shapes
    if (json?.result?.sync_variants) variants = json.result.sync_variants;
    else if (json?.result?.variants) variants = json.result.variants;
    else if (Array.isArray(json?.result)) variants = json.result;

    const map = {};
    for (const v of variants) {
      const sku = v?.sku || v?.sync_variant?.sku || v?.variant?.sku;
      const id = v?.id || v?.sync_variant?.id || v?.variant_id || v?.variant?.id;
      if (!sku || !id) continue;
      if (!sku_prefix || sku.startsWith(sku_prefix)) map[sku] = id;
    }
    return { statusCode: 200, body: JSON.stringify({ map }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ map: {}, error: e?.message }) };
  }
}
