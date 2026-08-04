export const PRICE_FALLBACK = '—';
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'CHF']);

/**
 * Catalog prices are stored in GBP and Stripe settles in GBP, so GBP is the
 * base at rate 1 and every other currency is one step from that same figure.
 * js/main.js owns the live rates and publishes them on window; this fallback
 * only applies before that script has run. Both tables are GBP based on
 * purpose: when they disagreed (this one had a USD base with GBP pinned at 1)
 * the same product could render at two different prices depending on which
 * code path drew it.
 */
const FALLBACK_RATES = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.74,
  AUD: 1.94,
  NZD: 2.12,
  JPY: 198,
  CHF: 1.12
};
const BASE_CURRENCY = 'GBP';

function rateFor(currency) {
  const live = typeof window !== 'undefined' ? window.__lyrionRates : null;
  const table = (live && typeof live === 'object') ? live : FALLBACK_RATES;
  const rate = Number(table[currency]);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

/** Same retail rounding main.js uses, so both paths produce identical figures. */
function retailRound(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return n;
  return Math.max(0.99, Math.round(n) - 0.01);
}

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
  return formatPriceWithCurrency(value, localization.currency || BASE_CURRENCY, fallback, localization.language || 'en');
}

export function formatPriceWithCurrency(value, currency = BASE_CURRENCY, fallback = PRICE_FALLBACK, language = 'en') {
  const cents = centsFrom(value);
  if (cents === null) return fallback;
  const localizationCurrency = typeof window !== 'undefined' ? window.__lyrionLocalization?.currency : null;
  const targetCurrencyRaw = localizationCurrency || currency;
  const targetCurrency = SUPPORTED_CURRENCIES.has(String(targetCurrencyRaw).toUpperCase()) ? String(targetCurrencyRaw).toUpperCase() : BASE_CURRENCY;
  const base = cents / 100;
  // The base currency is the price as stored and as charged, so it is never
  // rounded or scaled. Only genuine conversions get retail rounding.
  const converted = targetCurrency === BASE_CURRENCY
    ? base
    : (targetCurrency === 'JPY'
        ? Math.round(base * rateFor(targetCurrency))
        : retailRound(base * rateFor(targetCurrency)));
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
