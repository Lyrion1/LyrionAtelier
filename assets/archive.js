import { routeIsEventish } from '/lib/catalog.js';

async function loadIndex() {
  try { const r = await fetch('/data/index.json', { cache: 'no-store' }); return await r.json(); }
  catch { return []; }
}
async function loadProd(slug) {
  try { const r = await fetch('/data/products/' + slug + '.json', { cache: 'no-store' }); return await r.json(); }
  catch { return null; }
}
function card(p) {
  const el = document.createElement('div');
  el.className = 'vault-card';
  el.innerHTML = `
  <div class="vault-body">
    <img alt="${p.title}" loading="lazy" src="${(p.images || [])[0] || ''}" />
    <div class="vault-meta">
      <div class="vault-title">${p.title}</div>
      <div class="vault-tag">Archive</div>
      <form name="vault-waitlist" data-product="${p.slug}" method="POST" data-netlify="true" netlify>
        <input type="hidden" name="product" value="${p.slug}">
        <input type="email" name="email" placeholder="Your email" required>
        <button type="submit">Request restock</button>
      </form>
    </div>
  </div>`;
  return el;
}
async function init() {
  if (routeIsEventish()) return;
  const root = document.getElementById('archive-grid'); if (!root) return;
  const slugs = await loadIndex();
  const items = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(p => p.edition === 'archive');
  root.classList.add('vault-grid');
  items.forEach(p => root.appendChild(card(p)));
}
if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
