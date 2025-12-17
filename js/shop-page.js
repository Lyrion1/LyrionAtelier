import { loadCatalog } from './catalog.js'; // existing file from earlier PR
import { apply } from './shop-filters.js'; // must NOT assume p.state always exists
import { init as renderGrid } from './shop-grid.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load from Netlify → local JSON → globals (handled inside loadCatalog)
    const raw = await loadCatalog();
    // Filter safely (guards in shop-filters.js)
    const filtered = apply(Array.isArray(raw) ? raw : []);
    console.log(`[shop] products available: ${filtered.length}`);
    renderGrid(filtered); // shop-grid handles the empty state gracefully
  } catch (err) {
    console.error('[shop] failed to load catalog:', err);
    renderGrid([]); // show empty-state card, not errors
  }
});
