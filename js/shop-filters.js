const defaultState = {
  category: 'all',
  zodiac: 'all',
  size: 'all',
  price: 'all',
  collection: 'all',
  palette: 'all',
  sort: 'featured'
};

export function apply(products, incomingState) {
  try {
    const list = Array.isArray(products) ? products : [];
    const savedState = typeof window !== 'undefined' ? window.LyrionAtelier?.shopState : undefined;
    let state = { ...defaultState, ...(savedState || {}) };
    if (incomingState && typeof incomingState === 'object') {
      state = { ...state, ...incomingState };
    }
    if (!list.length) return list;

    const category = String(state.category || 'all').toLowerCase();
    const zodiac = String(state.zodiac || 'all').toLowerCase();
    const palette = String(state.palette || 'all').toLowerCase();
    const collection = String(state.collection || 'all').toLowerCase();
    const size = String(state.size || 'all').toLowerCase();
    const sort = String(state.sort || 'featured').toLowerCase();

    const filtered = list.filter((p = {}) => {
      const published = p?.state?.published ?? true;
      const ready = p?.state?.ready ?? true;
      if (!published || !ready) return false;

      const productCategory = String(p?.category || p?.metadata?.category || '').toLowerCase() || 'all';
      const productZodiac = String(p?.zodiac || p?.metadata?.zodiac || '').toLowerCase() || 'all';
      const productPalette = String(p?.palette || p?.metadata?.palette || '').toLowerCase() || 'all';
      const productCollection = String(p?.collection || p?.metadata?.collection || '').toLowerCase() || 'all';
      const productSizes = [
        ...(Array.isArray(p?.sizes) ? p.sizes : []),
        ...(Array.isArray(p?.options?.size) ? p.options.size : []),
        ...(Array.isArray(p?.metadata?.size) ? p.metadata.size : [])
      ].map(s => String(s || '').toLowerCase());

      if (category !== 'all' && productCategory !== category) return false;
      if (zodiac !== 'all' && productZodiac !== zodiac) return false;
      if (palette !== 'all' && productPalette !== palette) return false;
      if (collection !== 'all' && productCollection !== collection) return false;
      if (size !== 'all' && !productSizes.includes(size)) return false;
      return true;
    });

    if (sort === 'price') {
      return filtered.sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
    }
    return filtered;
  } catch (err) {
    console.warn('filters disabled (safe mode):', err?.message || err);
    return Array.isArray(products) ? products : [];
  }
}
