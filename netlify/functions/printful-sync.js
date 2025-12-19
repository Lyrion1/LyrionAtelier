const fs = require('fs');
const p = require('path');

const DATA_FILE = p.join(process.cwd(), 'data', 'all-products.json');
const DEFAULT_SIZE = 'M';
const DEFAULT_COLOR = 'Black';
const isHttp = url => typeof url === 'string' && /^https?:\/\//i.test(url.trim());

const formatPrice = num => {
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

const createResponse = products => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(products)
});

const createLegacyResponse = products => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ products })
});

const centsToDollars = value => {
  const cents = Number(value);
  return Number.isFinite(cents) ? cents / 100 : 0;
};

const uniqueValues = arr => [...new Set(arr.filter(Boolean))];

const generateVariantId = (variant, prod, idx, vidx) =>
  variant.sku || variant.variant_id || `${prod.slug || 'product'}-${idx}-${vidx}`;

const generateProductId = (prod, file, idx) =>
  prod.slug || file || `product-${idx + 1}`;

const extractVariantOption = (variant, key, fallback) =>
  variant.options?.[key] || variant[key] || fallback;

const pickPrintfulImage = (prod = {}, variants = []) => {
  const fromThumbnail = isHttp(prod.thumbnail_url) ? prod.thumbnail_url : null;
  if (fromThumbnail) return fromThumbnail;

  const variantsWithFiles = variants.filter(v => Array.isArray(v?.files) && v.files.length > 0);
  const previewFromVariant = variantsWithFiles.map(v => {
    const files = v.files || [];
    const preferred = files.find(f => f && ['preview', 'default'].includes(String(f?.type || '').toLowerCase()) && isHttp(f?.preview_url));
    if (preferred) return preferred.preview_url;
    const firstPreview = files.find(f => isHttp(f?.preview_url));
    return firstPreview?.preview_url || null;
  }).find(Boolean);
  if (previewFromVariant) return previewFromVariant;

  const anyPreview = variantsWithFiles.map(v => {
    const firstFile = v.files?.[0] || null;
    return isHttp(firstFile?.preview_url) ? firstFile.preview_url : null;
  }).find(Boolean);

  return anyPreview || '';
};

const isOracleOrEvent = (prod = {}) => {
  const category = String(prod.category || prod.kind || prod.type || '').toLowerCase();
  const tags = (prod.tags || []).map(t => String(t || '').toLowerCase());
  return category === 'oracle' || category === 'event' || tags.includes('oracle') || tags.includes('event');
};

const normalizeVariant = (variant, prod, idx, vidx) => {
  const safeVariant = variant || {};
  safeVariant.state = Object.assign({ ready: true, published: true }, safeVariant.state || {});
  const size = extractVariantOption(safeVariant, 'size', DEFAULT_SIZE);
  const color = extractVariantOption(safeVariant, 'color', DEFAULT_COLOR);
  const price = centsToDollars(safeVariant.price);
  const image = safeVariant.image || (Array.isArray(prod.images) && prod.images.length ? prod.images[0] : '');

  return {
    id: generateVariantId(safeVariant, prod, idx, vidx),
    variant_id: safeVariant.printfulVariantId || safeVariant.variant_id || null,
    size,
    color,
    price,
    image,
    inStock: !!(safeVariant.state?.ready && safeVariant.state?.published),
    state: safeVariant.state
  };
};

const normalizeProduct = (prod = {}, idx) => {
  const safeProd = prod || {};
  safeProd.state = Object.assign({ ready: true, published: true }, safeProd.state || {});

  const rawVariants = (safeProd.variants || []).filter(Boolean);
  const bestImage = pickPrintfulImage(safeProd, rawVariants);
  safeProd.image = bestImage || '';
  safeProd.images = bestImage ? [bestImage] : [];

  const variants = rawVariants.map((variant, vidx) =>
    normalizeVariant(variant, safeProd, idx, vidx)
  );

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

  const image = bestImage || '';
  const slug = generateProductId(safeProd, safeProd.metadata?.source || safeProd.slug, idx);
  const category = safeProd.category || safeProd.metadata?.category || safeProd.subcategory || safeProd.department || '';
  const zodiac = safeProd.zodiac || safeProd.metadata?.zodiac || '';
  const tags = uniqueValues([
    ...(Array.isArray(safeProd.tags) ? safeProd.tags : []),
    safeProd.palette,
    safeProd.collection,
    safeProd.options?.collection,
    safeProd.options?.palette
  ]);

  return {
    id: slug,
    slug,
    name: safeProd.title || safeProd.slug || 'Product',
    title: safeProd.title || safeProd.name || safeProd.slug || 'Product',
    description: safeProd.copy?.notes || safeProd.description || '',
    priceRange,
    price: min,
    thumbnail: image,
    image,
    images: image ? [image] : [],
    sizes: uniqueValues(variants.map(v => v.size)),
    colors: uniqueValues(variants.map(v => v.color)),
    category,
    zodiac,
    palette: safeProd.palette || safeProd.metadata?.palette,
    collection: safeProd.collection || safeProd.metadata?.collection,
    variantId: variants[0]?.variant_id || variants[0]?.id || null,
    tags,
    variants,
    state: safeProd.state
  };
};

exports.handler = async event => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return createResponse([]);
    }

    const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
    const safeProducts = (Array.isArray(items) ? items : [])
      .filter(prod => !isOracleOrEvent(prod))
      .map((prod, idx) => normalizeProduct(prod, idx));

    const legacyRequested = event?.queryStringParameters?.legacy === '1';

    return legacyRequested ? createLegacyResponse(safeProducts) : createResponse(safeProducts);
  } catch (e) {
    console.error(`printful-sync: failed to load products from ${DATA_FILE}: ${e?.message || e}`);
    return createResponse([]);
  }
};
