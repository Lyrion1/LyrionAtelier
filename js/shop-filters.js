/**
 * @typedef {"Men" | "Women" | "Unisex" | "Youth"} Audience
 * @typedef {Audience | "Accessories" | "Rituals"} Category
 * @typedef {"Zodiac" | "Lyrion Atelier Core"} Collection
 * @typedef {"Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo" | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces" | "None"} Zodiac
 * @typedef {{ category: Category, collection: Collection, zodiac: Zodiac, soldOut?: boolean }} ProductMeta
 */

const defaultState = {
  category: 'all',
  zodiac: 'all',
  size: 'all',
  price: 'all',
  collection: 'all',
  palette: 'all',
  sort: 'featured',
  search: ''
};

export function apply(products, incomingState) {
  try {
    const list = Array.isArray(products) ? products : [];
    const isSoldOut = (p = {}) => (p?.meta?.soldOut ?? p?.soldOut) === true;
    const savedState = typeof window !== 'undefined' ? window.LyrionAtelier?.shopState : undefined;
    let state = { ...defaultState, ...(savedState || {}) };
    if (incomingState && typeof incomingState === 'object') {
      state = { ...state, ...incomingState };
    }
    const includeSoldOut = state.includeSoldOut ?? list.some(isSoldOut);
    const baseList = includeSoldOut ? list : list.filter((p = {}) => !isSoldOut(p));
    if (!baseList.length) return baseList;

    const category = String(state.category || 'all').toLowerCase();
    const zodiac = String(state.zodiac || 'all').toLowerCase();
    const palette = String(state.palette || 'all').toLowerCase();
    const collection = String(state.collection || 'all').toLowerCase();
    const size = String(state.size || 'all').toLowerCase();
    const sort = String(state.sort || 'featured').toLowerCase();
    const search = String(state.search || '').toLowerCase().trim();

    const normalize = (val) => String(val || '').toLowerCase().trim();
    const toList = (value) => {
      if (Array.isArray(value)) return value;
      if (value === null || typeof value === 'undefined') return [];
      return String(value).split(',').map((v) => v.trim()).filter(Boolean);
    };
    
    // Cache for normalized values to avoid repeated string operations
    const normalizeCache = new Map();
    const cachedNormalize = (val) => {
      if (normalizeCache.has(val)) return normalizeCache.get(val);
      const result = normalize(val);
      normalizeCache.set(val, result);
      return result;
    };

    const filtered = baseList.filter((p = {}) => {
      const published = p?.state?.published ?? true;
      const ready = p?.state?.ready ?? true;
      if (!published || !ready) return false;

      // Hide accessoriesOnly products from main "All" view, but show when filtering by Accessories
      const isAccessoriesOnly = p?.accessoriesOnly === true;
      if (isAccessoriesOnly && category === 'all') return false;

      const meta = p?.meta || {};
      const productCategories = toList(meta.category || p?.category || p?.metadata?.category).map(cachedNormalize);
      
      // Early exit: check category match first (most selective filter)
      let categoryMatch = category === 'all';
      if (!categoryMatch) {
        categoryMatch = productCategories.includes(category) ||
          productCategories.some((c) => (c.endsWith('s') ? c.slice(0, -1) : c) === category);
      }
      if (!categoryMatch) return false;
      
      // Check zodiac filter early since it's a common filter
      if (zodiac !== 'all') {
        const productZodiac = cachedNormalize(meta.zodiac || p?.zodiac || p?.metadata?.zodiac || 'all') || 'all';
        if (productZodiac !== zodiac) return false;
      }
      
      // Check palette filter
      if (palette !== 'all') {
        const productPalettes = toList(p?.palette || p?.metadata?.palette).map(cachedNormalize);
        if (!productPalettes.includes(palette)) return false;
      }
      
      // Check collection filter
      if (collection !== 'all') {
        const productCollections = [
          ...toList(meta.collection || p?.collection),
          ...toList(p?.metadata?.collection)
        ].map(cachedNormalize);
        if (!productCollections.includes(collection)) return false;
      }
      
      // Check size filter
      if (size !== 'all') {
        const productSizes = [
          ...(Array.isArray(p?.sizes) ? p.sizes : []),
          ...(Array.isArray(p?.options?.size) ? p.options.size : []),
          ...(Array.isArray(p?.metadata?.size) ? p.metadata.size : [])
        ].map(s => String(s || '').toLowerCase());
        if (!productSizes.includes(size)) return false;
      }
      
      // Search filter (most expensive, run last)
      if (search) {
        const title = cachedNormalize(p?.title || p?.name || p?.slug || '');
        const desc = cachedNormalize(p?.description || p?.desc || '');
        if (!title.includes(search) && !desc.includes(search)) return false;
      }
      return true;
    });

    const NO_PRICE_SORT_WEIGHT = Number.MAX_SAFE_INTEGER;
    const priceValue = (p) => {
      if (Number.isFinite(p?.priceCents)) return Number(p.priceCents) / 100;
      const num = Number(p?.price);
      return Number.isFinite(num) ? num : NO_PRICE_SORT_WEIGHT;
    };

    if (sort === 'price') {
      return filtered.sort((a, b) => priceValue(a) - priceValue(b));
    }
    return filtered;
  } catch (err) {
    console.warn('filters disabled (safe mode):', err?.message || err);
    return Array.isArray(products) ? products : [];
  }
}
