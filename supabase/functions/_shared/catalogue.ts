// The checkout's view of the shop: public/data/products.json (generated from
// data/catalogue.json) and data/house.json (written by the house engine), both
// read from the live site so a merged change takes effect without a redeploy.
import './house-core.js';
import { SITE_URL } from './env.ts';

export interface CheckoutVariant {
  size: string;
  color?: string;
  priceGBP: number; // pence
  printfulVariantId?: string;
}

export interface CheckoutProduct {
  id: string;
  name: string;
  type: string;
  fulfilment: 'printful' | 'digital' | 'manual' | 'enquiry';
  sign: string | null;
  seasonal: boolean;
  priceGBP: number;
  image: string;
  personalisation?: 'person' | 'couple' | 'pet' | 'newborn';
  variants: CheckoutVariant[];
}

export interface House {
  valid: boolean;
  lead_sign?: string;
  on_show?: string[];
  last_chance?: string[];
}

interface HouseCore {
  normaliseHouse(raw: unknown): House;
  productState(product: { seasonal: boolean; sign: string | null }, house: House): string;
  signFromBirthDate(month: number, day: number): string | null;
  todayISO(now?: Date): string;
  ELEMENT_OF: Record<string, string>;
  SIGNS: string[];
}

export const houseCore = (globalThis as unknown as { LyrionHouseCore: HouseCore }).LyrionHouseCore;

const TTL_MS = 60_000;
let cache: { at: number; products: CheckoutProduct[]; house: House } | null = null;

async function getJSON(url: string): Promise<unknown> {
  const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!resp.ok) throw new Error(`${url} -> ${resp.status}`);
  return resp.json();
}

export async function loadShop(): Promise<{ products: CheckoutProduct[]; house: House }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const products = await getJSON(`${SITE_URL}/public/data/products.json`) as CheckoutProduct[];
  // house.json is optional: missing or malformed means "everything as before".
  let house: House = { valid: false };
  try {
    house = houseCore.normaliseHouse(await getJSON(`${SITE_URL}/data/house.json`));
  } catch {
    house = { valid: false };
  }
  cache = { at: Date.now(), products, house };
  return cache;
}

/** Whether the house currently lets this product be ordered. */
export function resting(product: CheckoutProduct, house: House): boolean {
  return houseCore.productState(product, house) === 'retired';
}

/** Choose the variant a basket line refers to. */
export function pickVariant(
  product: CheckoutProduct,
  line: { variant?: string | null; size?: string | null; color?: string | null },
): CheckoutVariant | null {
  const variants = product.variants || [];
  if (line.variant) {
    return variants.find((v) => v.printfulVariantId === line.variant) ?? null;
  }
  const size = line.size && line.size !== 'Default' && line.size !== 'Standard' ? line.size : null;
  const matches = variants.filter((v) => (!size || v.size === size) && (!line.color || !v.color || v.color === line.color));
  if (matches.length === 1) return matches[0];
  if (!size && variants.length === 1) return variants[0];
  return null;
}
