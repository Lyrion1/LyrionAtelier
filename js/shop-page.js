/**
* Robust shop bootstrap:
* - Tries Netlify Printful function → static JSON → global seed
* - Silently ignores missing images-map.json (404)
* - Never logs the old "Using fallback" message
*/
async function loadCatalog() {
  // 1) Netlify function (live Printful)
  try {
    const r = await fetch('/.netlify/functions/printful-sync', { headers: { accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.products)) return j.products;
    }
  } catch (e) { /* ignore */ }

  // 2) Static bundled JSON
  try {
    const r = await fetch('/data/catalog.json', { headers: { accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.products)) return j.products;
    }
  } catch (e) { /* ignore */ }

  // 3) Global seed injected by the page
  const g1 = window?.LyrionAtelier?.products;
  const g2 = window?.products;
  return Array.isArray(g1) ? g1 : (Array.isArray(g2) ? g2 : []);
}

async function loadImagesMap() {
  // images map is optional; swallow 404s
  try {
    const r = await fetch('/data/images-map.json', { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (e) { /* ignore */ }
  return {};
}

// Render grid via existing renderer
import { apply } from './shop-filters.js'; // must be defensive
import { init as renderGrid } from './shop-grid.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [catalog] = await Promise.all([loadCatalog(), loadImagesMap()]);
    const list = Array.isArray(catalog) ? catalog : [];
    const filtered = apply(list);
    console.log(`[shop] products available: ${filtered.length}`);
    renderGrid(filtered);
  } catch (err) {
    console.error('[shop] failed to initialize:', err);
    renderGrid([]); // empty-state card; no scary warnings
  }
});
