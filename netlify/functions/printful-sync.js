const fs = require('fs');
const p = require('path');

const formatPrice = num => {
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

const createResponse = products => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ products })
});

const DEFAULT_SIZE = 'M';
const DEFAULT_COLOR = 'Black';

const safeReadJSON = file => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`printful-sync: unable to read JSON product file at ${file}: ${err?.message || err}`);
    return null;
  }
};

const generateVariantId = (variant, prod, idx, vidx) =>
  variant.sku || variant.variant_id || `${prod.slug || 'product'}-${idx}-${vidx}`;

const generateProductId = (prod, file, idx) =>
  prod.slug || file.replace(/\.json$/i, '') || `product-${idx + 1}`;

const extractVariantOption = (variant, key, fallback) =>
  variant.options?.[key] || variant[key] || fallback;

const uniqueValues = arr => [...new Set(arr.filter(Boolean))];

const centsToDollars = value => {
  const cents = Number(value);
  return Number.isFinite(cents) ? cents / 100 : 0;
};

exports.handler = async () => {
  try {
    const dir = p.join(process.cwd(), 'data', 'products');
    if (!fs.existsSync(dir)) {
      return createResponse([]);
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const items = files
      .map(file => ({ file, product: safeReadJSON(p.join(dir, file)) }))
      .filter(entry => Boolean(entry.product));

    const safeProducts = items.map(({ product: prod, file }, idx) => {
      prod.state = Object.assign({ ready: true, published: true }, prod.state || {});

      const variants = (prod.variants || []).filter(Boolean).map((variant, vidx) => {
        variant.state = Object.assign({ ready: true, published: true }, variant.state || {});
        const size = extractVariantOption(variant, 'size', DEFAULT_SIZE);
        const color = extractVariantOption(variant, 'color', DEFAULT_COLOR);
        // data stores prices as integer cents; convert to dollar amounts for UI display
        const price = centsToDollars(variant.price);
        const image = variant.image || (Array.isArray(prod.images) && prod.images.length ? prod.images[0] : '');
        return {
          id: generateVariantId(variant, prod, idx, vidx),
          variant_id: variant.printfulVariantId || variant.variant_id || null,
          size,
          color,
          price,
          image,
          inStock: !!(variant.state?.ready && variant.state?.published),
          state: variant.state
        };
      });

      const priceStats = variants.reduce(
        (acc, v) => {
          if (!Number.isFinite(v.price)) return acc;
          acc.min = acc.min === null ? v.price : Math.min(acc.min, v.price);
          acc.max = acc.max === null ? v.price : Math.max(acc.max, v.price);
          return acc;
        },
        { min: null, max: null }
      );
      const hasPrice = priceStats.min !== null && priceStats.max !== null;
      const min = hasPrice ? priceStats.min : 0;
      const max = hasPrice ? priceStats.max : min;
      const priceRange = hasPrice
        ? (min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`)
        : 'Price unavailable';

      const image = Array.isArray(prod.images) && prod.images.length ? prod.images[0] : '';

      return {
        id: generateProductId(prod, file, idx),
        name: prod.title || prod.slug || 'Product',
        description: prod.copy?.notes || prod.description || '',
        priceRange,
        thumbnail: image,
        sizes: uniqueValues(variants.map(v => v.size)),
        colors: uniqueValues(variants.map(v => v.color)),
        variants,
        state: prod.state
      };
    });

    return createResponse(safeProducts);
  } catch (e) {
    console.error(`printful-sync: failed to load products from ${p.join(process.cwd(), 'data', 'products')}: ${e?.message || e}`);
    return createResponse([]);
  }
};
