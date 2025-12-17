export function apply(products){
  const safe = (Array.isArray(products) ? products : []).filter(Boolean);
  return safe.filter(p => (p?.state?.published ?? false) && (p?.state?.ready ?? false));
}
