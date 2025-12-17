export function apply(products, state) {
  try {
    const list = Array.isArray(products) ? products : [];
    const s = state && typeof state === 'object' ? state : {};
    if (!list.length) return list;

    // if specific filter buckets missing, treat as "no filters"
    const emptyOrMissing = (v) => v == null || (Array.isArray(v) && v.length === 0);

    const cat = emptyOrMissing(s.category)
      ? (window?.LyrionAtelier?.filterState?.category ?? 'all').toLowerCase()
      : String(s.category).toLowerCase();
    const zod = emptyOrMissing(s.zodiac)
      ? (window?.LyrionAtelier?.filterState?.zodiac ?? 'all').toLowerCase()
      : String(s.zodiac).toLowerCase();

    return list.filter((p) => {
      const published = p?.state?.published ?? true;
      const ready = p?.state?.ready ?? true;
      if (!published || !ready) return false;

      if (cat !== 'all') {
        const pc = String(p?.category ?? '').toLowerCase();
        if (pc !== cat) return false;
      }
      if (zod !== 'all') {
        const pz = String(p?.zodiac ?? '').toLowerCase();
        if (pz !== zod) return false;
      }
      return true;
    });
  } catch (err) {
    console.warn('filters disabled (safe mode):', err?.message || err);
    return Array.isArray(products) ? products : [];
  }
}
