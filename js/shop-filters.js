export function apply(list) {
  if (!Array.isArray(list)) return [];
  const ui = window?.LyrionAtelier?.filterState ?? {};
  const cat = (ui.category ?? 'all').toLowerCase();
  const zod = (ui.zodiac ?? 'all').toLowerCase();

  return list.filter(p => {
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
}
