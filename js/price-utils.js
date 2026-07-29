export const PRICE_FALLBACK = '—';
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF']);
const BASE_RATES = {
  USD: 1,
  EUR: 0.93,
  GBP: 1,
  CAD: 1.37,
  AUD: 1.53,
  NZD: 1.67,
  JPY: 156,
  CHF: 0.88
};

export function currencySymbol(code = 'USD') {
  const upper = String(code || 'USD').toUpperCase();
  if (upper === 'USD') return '$';
  if (upper === 'EUR') return '€';
  if (upper === 'GBP') return '£';
  if (upper === 'JPY') return '¥';
  if (upper === 'CHF') return 'CHF ';
  return '$';
}

export function priceNumber(source = {}) {
  const num = Number(
    source?.price ??
      source?.priceUSD ??
      source?.priceCents ??
      source?.retail_price
  );
  return Number.isFinite(num) ? num : null;
}

export function centsFrom(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num >= 200 ? Math.round(num) : Math.round(num * 100);
}

export function formatPrice(value, fallback = PRICE_FALLBACK) {
  const localization = typeof window !== 'undefined' ? (window.__lyrionLocalization || {}) : {};
  return formatPriceWithCurrency(value, localization.currency || 'USD', fallback, localization.language || 'en');
}

export function formatPriceWithCurrency(value, currency = 'USD', fallback = PRICE_FALLBACK, language = 'en') {
  const cents = centsFrom(value);
  if (cents === null) return fallback;
  const localizationCurrency = typeof window !== 'undefined' ? window.__lyrionLocalization?.currency : null;
  const targetCurrencyRaw = localizationCurrency || currency;
  const targetCurrency = SUPPORTED_CURRENCIES.has(String(targetCurrencyRaw).toUpperCase()) ? String(targetCurrencyRaw).toUpperCase() : 'USD';
  const converted = (cents / 100) * (BASE_RATES[targetCurrency] || 1);
  try {
    return new Intl.NumberFormat(language || 'en', {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: targetCurrency === 'JPY' ? 0 : 2
    }).format(converted);
  } catch {
    return `${currencySymbol(targetCurrency)}${converted.toFixed(targetCurrency === 'JPY' ? 0 : 2)}`;
  }
}
