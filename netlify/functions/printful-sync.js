const fs = require('fs');
const p = require('path');

const formatPrice = num => {
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

exports.handler = async () => {
  try {
    const dir = p.join(process.cwd(), 'data', 'products');
    if (!fs.existsSync(dir)) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: [] }) };
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items = files.map(f => JSON.parse(fs.readFileSync(p.join(dir, f), 'utf8'))).filter(Boolean);

    const safeProducts = items.map((prod, idx) => {
      prod.state = Object.assign({ ready: true, published: true }, prod.state || {});

      const variants = (prod.variants || []).map((v, vidx) => {
        v = v || {};
        v.state = Object.assign({ ready: true, published: true }, v.state || {});
        const size = v.options?.size || v.size || 'M';
        const color = v.options?.color || v.color || 'Black';
        const price = Number.isFinite(v.price) ? v.price / 100 : 0;
        const image = v.image || (Array.isArray(prod.images) && prod.images.length ? prod.images[0] : '');
        return {
          id: v.sku || v.variant_id || `${prod.slug || 'product'}-${vidx}`,
          variant_id: v.printfulVariantId || v.variant_id || null,
          size,
          color,
          price,
          image,
          inStock: !!(v.state.ready && v.state.published),
          state: v.state
        };
      });

      const prices = variants.map(v => v.price).filter(Number.isFinite);
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      const priceRange = min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;

      const image = Array.isArray(prod.images) && prod.images.length ? prod.images[0] : '';

      return {
        id: prod.slug || `product-${idx + 1}`,
        name: prod.title || prod.slug || 'Product',
        description: prod.copy?.notes || prod.description || '',
        priceRange,
        thumbnail: image,
        sizes: [...new Set(variants.map(v => v.size).filter(Boolean))],
        colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
        variants,
        state: prod.state
      };
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: safeProducts }) };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: [] }) };
  }
};
