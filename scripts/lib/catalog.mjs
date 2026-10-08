/**
 * Shared catalogue rules for every Node script: the build, the CI checks and
 * the design intake workflow. data/catalogue.json is the one list of products;
 * the checkout price map (public/data/products.json) and the static product
 * pages are derived from it and checked against it.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');
export const CATALOGUE_PATH = path.join(REPO_ROOT, 'data', 'catalogue.json');
export const CHECKOUT_MAP_PATH = path.join(REPO_ROOT, 'public', 'data', 'products.json');
export const PRINTFUL_SNAPSHOT_PATH = path.join(REPO_ROOT, 'data', 'printful-sync.json');

const require = createRequire(import.meta.url);
export const houseCore = require('../../js/house-core.js');

/** The store settles in GBP: Stripe charges GBP and prices are stored in GBP. */
export const BASE_CURRENCY = 'GBP';

export const PRODUCT_TYPES = ['apparel', 'accessory', 'home', 'mystery-box', 'reading', 'certificate'];
export const FULFILMENT = ['printful', 'digital', 'manual', 'enquiry'];
export const PERSONALISATION = ['person', 'couple', 'pet', 'newborn'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Printful sync variant external ids (hex, as Printful generates them) or
// numeric sync variant ids.
const PRINTFUL_VARIANT = /^(?:[0-9a-f]{12,16}|\d{6,12})$/;

export async function loadCatalogue() {
  const raw = await readFile(CATALOGUE_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !Array.isArray(data.products)) {
    throw new Error('data/catalogue.json must be an object with a "products" array');
  }
  return data;
}

function isMoney(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 2000 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
}

function localFileExists(url, root = REPO_ROOT) {
  if (typeof url !== 'string' || !url.startsWith('/')) return true;
  const clean = decodeURI(url.split('?')[0].split('#')[0]);
  const candidates = [clean, `${clean}.html`, path.join(clean, 'index.html')];
  return candidates.some((c) => existsSync(path.join(root, c)));
}

/**
 * Every rule a product must meet. Returns a list of problems (empty = valid).
 * This is what makes a malformed catalogue fail CI.
 */
export function validateCatalogue(data, root = REPO_ROOT) {
  const errors = [];
  if (!data || typeof data !== 'object' || !Array.isArray(data.products)) {
    return ['data/catalogue.json must be an object with a "products" array'];
  }
  const slugs = new Set();
  const variantOwner = new Map();
  data.products.forEach((p, i) => {
    const at = p && typeof p.slug === 'string' && p.slug ? `"${p.slug}"` : `product #${i}`;
    if (!p || typeof p !== 'object') { errors.push(`${at} is not an object`); return; }
    if (typeof p.slug !== 'string' || !SLUG.test(p.slug)) errors.push(`${at}: slug must be lower-case words joined by hyphens`);
    else if (slugs.has(p.slug)) errors.push(`${at}: slug is used by more than one product`);
    else slugs.add(p.slug);
    if (typeof p.title !== 'string' || !p.title.trim()) errors.push(`${at}: title is missing`);
    if (p.sign !== null && !houseCore.isSign(p.sign)) errors.push(`${at}: sign must be one of the twelve signs with a capital letter, or null`);
    if (p.sign && p.element !== houseCore.ELEMENT_OF[p.sign]) errors.push(`${at}: element must be ${houseCore.ELEMENT_OF[p.sign]} for ${p.sign}`);
    if (!p.sign && p.element) errors.push(`${at}: element is set but sign is not`);
    if (typeof p.collection !== 'string' || !p.collection.trim()) errors.push(`${at}: collection is missing`);
    if (!PRODUCT_TYPES.includes(p.type)) errors.push(`${at}: type must be one of ${PRODUCT_TYPES.join(', ')}`);
    if (typeof p.description !== 'string') errors.push(`${at}: description must be text`);
    if (!Array.isArray(p.images) || !p.images.length || p.images.some((u) => typeof u !== 'string' || !u)) {
      errors.push(`${at}: needs at least one image`);
    } else {
      p.images.forEach((u) => { if (!localFileExists(u, root)) errors.push(`${at}: image ${u} does not exist`); });
    }
    if (p.link != null && (typeof p.link !== 'string' || !p.link.startsWith('/') || !localFileExists(p.link, root))) {
      errors.push(`${at}: link ${p.link} does not lead to a page in this site`);
    }
    if (typeof p.seasonal !== 'boolean') errors.push(`${at}: seasonal must be true or false`);
    if (typeof p.listed !== 'boolean') errors.push(`${at}: listed must be true or false`);
    if (p.seasonal === true && !p.sign) errors.push(`${at}: a seasonal product needs a sign`);
    if ((p.type === 'reading' || p.type === 'certificate') && p.seasonal) errors.push(`${at}: readings and certificates never retire, so seasonal must be false`);
    if (!FULFILMENT.includes(p.fulfilment)) errors.push(`${at}: fulfilment must be one of ${FULFILMENT.join(', ')}`);
    if (p.personalisation != null && !PERSONALISATION.includes(p.personalisation)) errors.push(`${at}: personalisation must be one of ${PERSONALISATION.join(', ')}`);
    if ((p.type === 'reading' || p.type === 'certificate') && !p.personalisation) errors.push(`${at}: readings and certificates need a personalisation kind`);

    if (!Array.isArray(p.variants) || !p.variants.length) {
      // An unlisted draft may not have its variants yet; anything for sale must.
      if (p.listed) errors.push(`${at}: needs at least one variant`);
      if (p.price_gbp != null && !(isMoney(p.price_gbp.min) && isMoney(p.price_gbp.max))) errors.push(`${at}: price_gbp must have min and max in pounds`);
      return;
    }
    const combos = new Set();
    p.variants.forEach((v, j) => {
      const vat = `${at} variant ${j}`;
      if (!v || typeof v !== 'object') { errors.push(`${vat} is not an object`); return; }
      if (typeof v.size !== 'string' || !v.size) errors.push(`${vat}: size is missing`);
      const combo = `${v.size}|${v.color || ''}`;
      if (combos.has(combo)) errors.push(`${vat}: size and colour repeat another variant`);
      combos.add(combo);
      // A built design waiting for the owner's price is unlisted with no price yet.
      const awaitingPrice = !p.listed && v.price_gbp === null;
      if (!awaitingPrice && !isMoney(v.price_gbp)) errors.push(`${vat}: price_gbp must be pounds and pence (51.99), not pence (5199)`);
      if (p.fulfilment === 'printful') {
        const id = v.printful_variant_id;
        if (typeof id !== 'string' || !PRINTFUL_VARIANT.test(id)) {
          errors.push(`${vat}: printful_variant_id ${JSON.stringify(id)} is not a Printful sync variant id`);
        } else if (variantOwner.has(id) && variantOwner.get(id) !== p.slug) {
          errors.push(`${vat}: Printful variant ${id} is also used by "${variantOwner.get(id)}"`);
        } else {
          variantOwner.set(id, p.slug);
        }
      }
    });
    if (p.fulfilment === 'printful' && (!p.printful || typeof p.printful !== 'object')) {
      errors.push(`${at}: a Printful product needs a "printful" block`);
    }
    const prices = p.variants.map((v) => v && v.price_gbp).filter(isMoney);
    if (!p.listed && p.price_gbp === null && !prices.length) return;
    if (!p.price_gbp || !isMoney(p.price_gbp.min) || !isMoney(p.price_gbp.max)) {
      errors.push(`${at}: price_gbp must have min and max in pounds`);
    } else if (prices.length) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (p.price_gbp.min !== min || p.price_gbp.max !== max) {
        errors.push(`${at}: price_gbp ${p.price_gbp.min} to ${p.price_gbp.max} disagrees with its variants (${min} to ${max})`);
      }
    }
  });
  return errors;
}

/** Products that can go into a basket at all (the house may still rest them). */
export function sellable(product) {
  return product.listed === true && product.fulfilment !== 'enquiry';
}

/**
 * One checkout price map entry. Older fields (priceGBP, sizes,
 * printfulVariantId) keep the currently deployed checkout function working;
 * the variant list is what the current function prices and fulfils from.
 */
export function toCheckoutEntry(p) {
  const entry = {
    id: p.slug,
    name: p.title,
    type: p.type,
    fulfilment: p.fulfilment,
    sign: p.sign,
    seasonal: p.seasonal,
    priceGBP: Math.round(p.price_gbp.min * 100),
    image: p.images[0]
  };
  if (p.personalisation) entry.personalisation = p.personalisation;
  const sizes = [...new Set(p.variants.map((v) => v.size))];
  if (p.fulfilment === 'printful') {
    entry.sizes = sizes;
    entry.printfulVariantId = p.variants.map((v) => v.printful_variant_id);
  }
  entry.variants = p.variants.map((v) => {
    const out = { size: v.size };
    if (v.color) out.color = v.color;
    out.priceGBP = Math.round(v.price_gbp * 100);
    if (v.printful_variant_id) out.printfulVariantId = v.printful_variant_id;
    return out;
  });
  return entry;
}

export function buildCheckoutMap(catalogue) {
  return catalogue.products.filter(sellable).map(toCheckoutEntry);
}
