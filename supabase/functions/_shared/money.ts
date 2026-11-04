// Same presentment rule as js/money.js. Keep the two in step:
// tests/money.test.mjs checks the shared examples.
//
// GBP catalogue pence is the only price. A requested currency is multiplied
// by data/fx-rates.json (fetched from the live site, so a rate edit does not
// need a function redeploy) and rounded:
//   GBP  — unchanged
//   JPY  — nearest whole yen
//   else — nearest whole unit, then minus 0.01, so the charge ends in .99
// The browser is never trusted for an amount.

import { SITE_URL } from './env.ts';

export const BASE = 'GBP';
export const FALLBACK_RATES: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.74,
  AUD: 1.94,
  NZD: 2.12,
  JPY: 198,
  CHF: 1.12,
};
const ZERO_DECIMAL = new Set(['JPY']);
export const SHIPPING_FREE_GBP_PENCE = 5000;
export const SHIPPING_COST_GBP_PENCE = 599;

export interface Presentment {
  currency: string;
  major: number;
  minor: number;
}

export function normaliseCurrency(code: unknown): string {
  const upper = String(code || BASE).toUpperCase();
  return Object.prototype.hasOwnProperty.call(FALLBACK_RATES, upper) ? upper : BASE;
}

export function applyRates(raw: unknown): Record<string, number> {
  const rates = { ...FALLBACK_RATES };
  const next = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  for (const code of Object.keys(FALLBACK_RATES)) {
    if (code === BASE) {
      rates[code] = 1;
      continue;
    }
    const n = Number(next[code]);
    if (Number.isFinite(n) && n > 0) rates[code] = n;
  }
  return rates;
}

const rateCache: { at: number; rates: Record<string, number> } = { at: 0, rates: { ...FALLBACK_RATES } };

/** Rates published with the site. Falls back to the copy baked in above. */
export async function loadRates(): Promise<Record<string, number>> {
  if (Date.now() - rateCache.at < 60_000) return rateCache.rates;
  try {
    const resp = await fetch(`${SITE_URL}/data/fx-rates.json`, { headers: { 'Cache-Control': 'no-cache' } });
    if (resp.ok) {
      const data = await resp.json() as { rates?: unknown };
      rateCache.rates = applyRates(data?.rates);
      rateCache.at = Date.now();
    }
  } catch {
    rateCache.rates = applyRates(null);
  }
  return rateCache.rates;
}

export function presentmentPence(gbpPence: number, code: unknown, rates: Record<string, number>): Presentment {
  const pence = Math.round(Number(gbpPence));
  const currency = normaliseCurrency(code);
  if (!Number.isFinite(pence) || pence <= 0) return { currency, major: 0, minor: 0 };
  if (currency === BASE) return { currency, major: pence / 100, minor: pence };
  const rate = Number(rates[currency]);
  const safe = Number.isFinite(rate) && rate > 0 ? rate : 1;
  if (ZERO_DECIMAL.has(currency)) {
    const yen = Math.round((pence / 100) * safe);
    return { currency, major: yen, minor: yen };
  }
  const nearest = Math.round((pence * safe) / 100);
  const major = Math.max(0.99, nearest - 0.01);
  return { currency, major, minor: Math.round(major * 100) };
}
