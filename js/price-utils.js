export const PRICE_FALLBACK = '—';

export function centsFrom(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num >= 200 ? Math.round(num) : Math.round(num * 100);
}

export function formatPrice(value, fallback = PRICE_FALLBACK) {
  const cents = centsFrom(value);
  return cents !== null ? `$${(cents / 100).toFixed(2)}` : fallback;
}
