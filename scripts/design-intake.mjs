#!/usr/bin/env node
/**
 * Design intake: from an approved design and its artwork to a product.
 *
 * For every entry in data/designs-queue.json (written by the house engine)
 * whose status is "awaiting artwork", once artwork/incoming/design-{id}.png
 * exists and the design has not been built yet:
 *   1. find the Printful blank for its garment (data/garments.json),
 *   2. check the artwork against Printful's printfile for that placement,
 *   3. create the product in the Printful store,
 *   4. generate mockups with Printful's mockup generator and save them,
 *   5. add the product to data/catalogue.json, seasonal, for its sign,
 *   6. record the result in data/designs-built.json.
 * data/designs-queue.json itself is never modified.
 *
 * Products are listed only when the owner has set prices for their garment
 * in data/garments.json; until then they are built but unlisted, and a later
 * run lists them as soon as the prices are there.
 *
 * Environment: PRINTFUL_API_KEY (without it, nothing is built), PRINTFUL_STORE_ID (optional),
 * ARTWORK_BASE_URL (where Printful can fetch the artwork; defaults to the
 * repository's raw files at the current commit), PRINTFUL_API_BASE (tests).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, CATALOGUE_PATH, houseCore, validateCatalogue } from './lib/catalog.mjs';

const ROOT = process.env.INTAKE_ROOT ? path.resolve(process.env.INTAKE_ROOT) : REPO_ROOT;
const QUEUE = path.join(ROOT, 'data', 'designs-queue.json');
const BUILT = path.join(ROOT, 'data', 'designs-built.json');
const GARMENTS = path.join(ROOT, 'data', 'garments.json');
const CATALOGUE = process.env.INTAKE_ROOT ? path.join(ROOT, 'data', 'catalogue.json') : CATALOGUE_PATH;
const API = process.env.PRINTFUL_API_BASE || 'https://api.printful.com';
const MAX_ATTEMPTS = 5;

async function readJSON(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function pf(method, url, body) {
  const headers = { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`, 'Content-Type': 'application/json' };
  if (process.env.PRINTFUL_STORE_ID) headers['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
  const res = await fetch(`${API}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.code && data.code >= 400)) throw new Error(`Printful ${method} ${url}: ${data?.error?.message || data?.result || res.status}`);
  return data.result;
}

/** Width and height of a PNG from its header. */
export function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('artwork is not a PNG file');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function garmentFor(design, garments) {
  const text = `${design.garment || ''} ${design.name || ''}`.toLowerCase();
  for (const [key, g] of Object.entries(garments)) {
    if (g.match.some((m) => text.includes(m))) return { key, ...g };
  }
  return null;
}

export function slugFor(design, garmentKey, taken) {
  const base = (design.name || `${design.sign} ${garmentKey}`)
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let slug = base || `design-${design.id}`;
  if (taken.has(slug)) slug = `${slug}-${design.id}`;
  return slug;
}

/** Scale the artwork to fit the printfile, centred at the top. */
export function position(art, printfile) {
  const scale = Math.min(printfile.width / art.width, printfile.height / art.height);
  const width = Math.round(art.width * scale);
  const height = Math.round(art.height * scale);
  return { area_width: printfile.width, area_height: printfile.height, width, height, top: 0, left: Math.round((printfile.width - width) / 2) };
}

async function findBlank(g) {
  const products = await pf('GET', '/products');
  const hit = products.find((p) => String(p.model) === g.printful.model && String(p.brand).toLowerCase() === g.printful.brand.toLowerCase());
  if (!hit) throw new Error(`no Printful catalogue product ${g.printful.brand} ${g.printful.model}`);
  const detail = await pf('GET', `/products/${hit.id}`);
  const variants = detail.variants.filter((v) => String(v.color).toLowerCase() === g.colour.toLowerCase());
  if (!variants.length) throw new Error(`${g.printful.brand} ${g.printful.model} has no ${g.colour} variants`);
  return { product: detail.product, variants };
}

async function mockups(productId, variantIds, placement, imageUrl, pos) {
  const task = await pf('POST', `/mockup-generator/create-task/${productId}`, {
    variant_ids: variantIds.slice(0, 1),
    format: 'jpg',
    files: [{ placement, image_url: imageUrl, position: pos }],
  });
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, process.env.PRINTFUL_API_BASE ? 10 : 4000));
    const res = await pf('GET', `/mockup-generator/task?task_key=${encodeURIComponent(task.task_key)}`);
    if (res.status === 'completed') {
      const urls = [];
      for (const m of res.mockups || []) {
        if (m.mockup_url) urls.push(m.mockup_url);
        for (const e of m.extra || []) if (e.url) urls.push(e.url);
      }
      return urls;
    }
    if (res.status === 'failed') throw new Error(`mockup generation failed: ${res.error || 'no reason given'}`);
  }
  throw new Error('mockup generation timed out');
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not download mockup ${url}: ${res.status}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

function priceFor(g, size) {
  const table = g.price_gbp_by_size;
  return table && typeof table[size] === 'number' ? table[size] : null;
}

/** List built designs whose garment now has a price for every size. */
function applyPrices(catalogue, garments) {
  let listed = 0;
  for (const p of catalogue.products) {
    if (!p.design || p.listed || p.price_gbp !== null) continue;
    const g = garments[p.design.garment];
    if (!g) continue;
    const prices = p.variants.map((v) => priceFor(g, v.size));
    if (prices.some((x) => x === null)) continue;
    p.variants.forEach((v, i) => { v.price_gbp = prices[i]; });
    p.price_gbp = { min: Math.min(...prices), max: Math.max(...prices) };
    p.listed = true;
    listed += 1;
  }
  return listed;
}

export async function run() {
  const queue = await readJSON(QUEUE, null);
  const built = await readJSON(BUILT, []);
  const garments = (await readJSON(GARMENTS, { garments: {} })).garments;
  const catalogue = JSON.parse(await readFile(CATALOGUE, 'utf8'));
  const before = JSON.stringify([catalogue, built]);
  const report = { built: 0, waiting: 0, failed: 0, listed: 0 };

  report.listed = applyPrices(catalogue, garments);

  if (!Array.isArray(queue)) {
    console.log('No usable data/designs-queue.json; nothing to build.');
  } else if (!process.env.PRINTFUL_API_KEY) {
    console.log('Skipped building designs: PRINTFUL_API_KEY is not set. Designs wait in the queue until it is.');
  } else {
    const sha = process.env.GITHUB_SHA || 'main';
    const repo = process.env.GITHUB_REPOSITORY || 'Lyrion1/LyrionAtelier';
    const artworkBase = process.env.ARTWORK_BASE_URL || `https://raw.githubusercontent.com/${repo}/${sha}`;
    const taken = new Set(catalogue.products.map((p) => p.slug));

    for (const design of queue) {
      if (!design || design.status !== 'awaiting artwork' || design.action !== 'design') continue;
      const record = built.find((b) => b.id === design.id);
      if (record && (record.status === 'built' || record.attempts >= MAX_ATTEMPTS)) continue;
      const artPath = path.join(ROOT, 'artwork', 'incoming', `design-${design.id}.png`);
      if (!existsSync(artPath)) { report.waiting += 1; continue; }

      const entry = record || { id: design.id, attempts: 0 };
      if (!record) built.push(entry);
      entry.attempts += 1;
      entry.last_attempt = new Date().toISOString();
      try {
        if (!houseCore.isSign(design.sign)) throw new Error(`sign "${design.sign}" is not one of the twelve signs`);
        const g = garmentFor(design, garments);
        if (!g) throw new Error(`no garment in data/garments.json matches "${design.garment}"`);
        const technique = /embroider/i.test(design.decoration || '') ? 'embroidery' : 'print';
        const placement = g.placements[technique];
        const art = pngSize(await readFile(artPath));

        const blank = await findBlank(g);
        const printfiles = await pf('GET', `/mockup-generator/printfiles/${blank.product.id}`);
        const pfId = (printfiles.variant_printfiles?.[0]?.placements || {})[placement];
        const printfile = (printfiles.printfiles || []).find((f) => f.printfile_id === pfId);
        if (!printfile) throw new Error(`Printful has no ${placement} printfile for ${blank.product.model}`);
        if (art.width < printfile.width * 0.5 || art.height < printfile.height * 0.5) {
          throw new Error(`artwork is ${art.width}×${art.height}px; ${placement} needs about ${printfile.width}×${printfile.height}px (${printfile.dpi} DPI)`);
        }

        const imageUrl = `${artworkBase}/artwork/incoming/design-${design.id}.png`;
        const pos = position(art, printfile);
        const title = design.name || `${design.sign} ${g.key.charAt(0).toUpperCase()}${g.key.slice(1)}`;
        const created = await pf('POST', '/store/products', {
          sync_product: { name: title },
          sync_variants: blank.variants.map((v) => {
            const price = priceFor(g, v.size);
            return {
              variant_id: v.id,
              ...(price ? { retail_price: price.toFixed(2) } : {}),
              files: [{ type: placement, url: imageUrl, position: pos }],
            };
          }),
        });
        const detail = await pf('GET', `/store/products/${created.id}`);
        const syncVariants = detail.sync_variants || [];

        const urls = await mockups(blank.product.id, blank.variants.map((v) => v.id), placement, imageUrl, pos);
        if (!urls.length) throw new Error('the mockup generator returned no images');
        const slug = slugFor(design, g.key, taken);
        const images = [];
        for (const [i, url] of urls.slice(0, 6).entries()) {
          const rel = `/images/products/${slug}-${i + 1}.jpg`;
          await download(url, path.join(ROOT, rel));
          images.push(rel);
        }

        const variants = blank.variants.map((v) => {
          const sv = syncVariants.find((s) => s.variant_id === v.id);
          return { size: v.size, price_gbp: priceFor(g, v.size), printful_variant_id: String(sv?.external_id || sv?.id) };
        });
        const prices = variants.map((v) => v.price_gbp);
        const priced = prices.every((x) => typeof x === 'number');
        taken.add(slug);
        catalogue.products.push({
          slug,
          title,
          sign: design.sign,
          element: houseCore.ELEMENT_OF[design.sign],
          collection: `${design.sign} Collection`,
          category: g.category,
          type: g.type,
          description: [design.story, design.wording ? `Wording: ${design.wording}` : ''].filter(Boolean).join('\n\n'),
          images,
          link: null,
          price_gbp: priced ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
          variants,
          fulfilment: 'printful',
          printful: { product: blank.product.title || blank.product.model, sync_product_id: created.id },
          seasonal: true,
          listed: priced,
          tags: [design.sign.toLowerCase(), `${houseCore.ELEMENT_OF[design.sign].toLowerCase()}-sign`, 'zodiac'],
          design: { id: design.id, garment: g.key, palette: design.palette || null, approved: design.approved || null },
        });
        Object.assign(entry, {
          status: 'built',
          built_at: new Date().toISOString(),
          slug,
          printful_sync_product_id: created.id,
          images,
          listed: priced,
          note: priced ? 'Listed for sale.' : `Built and unlisted: set price_gbp_by_size for "${g.key}" in data/garments.json to list it.`,
          error: null,
        });
        report.built += 1;
      } catch (err) {
        Object.assign(entry, { status: entry.attempts >= MAX_ATTEMPTS ? 'failed' : 'retrying', error: err.message });
        report.failed += 1;
      }
    }
  }

  const problems = validateCatalogue(catalogue, ROOT);
  if (problems.length) throw new Error(`refusing to write an invalid catalogue:\n  ${problems.join('\n  ')}`);
  // Write only when something changed, so a quiet run leaves no commit behind.
  if (JSON.stringify([catalogue, built]) !== before) {
    await writeFile(CATALOGUE, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
    await writeFile(BUILT, `${JSON.stringify(built, null, 2)}\n`, 'utf8');
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => {
    console.log(`Design intake: ${r.built} built, ${r.listed} newly listed, ${r.waiting} waiting for artwork, ${r.failed} failed.`);
  }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
