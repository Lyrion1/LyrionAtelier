import { routeIsEventish } from '/lib/catalog.js';

let state = {
  category: 'all',
  zodiac: 'all',
  priceRange: [0, 1000],
  products: []
};

// Global filters helper
window.__LYRION_FILTERS = window.__LYRION_FILTERS || {
  state: { sign: new Set(), element: new Set(), collection: new Set(), palette: new Set(), size: new Set(), price: new Set(), sort: 'featured' },
  // Price bands in cents
  bands: { 'Under $50': [0, 4999], '$50–$79': [5000, 7999], '$80–$200': [8000, 20000] },
  mount(items) {
    if (routeIsEventish()) return;
    const path = (location.pathname || '').toLowerCase();
    const isShop = path === '/shop' || path === '/shop/' || path.startsWith('/shop/index');
    if (!isShop) return;

    // Ensure container above grid
    let host = document.getElementById('shop-filters');
    if (!host) {
      const grid = document.getElementById('shop-grid');
      host = document.createElement('div'); host.id = 'shop-filters';
      grid?.parentElement?.insertBefore(host, grid || null) || document.body.prepend(host);
    }

    // Inject CSS once
    if (!document.querySelector('link[href="/assets/shop-filters.css"]')) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/shop-filters.css'; document.head.appendChild(link);
    }

    // Build UI
    const uniques = (key) => {
      const vals = new Set();
      for (const p of items) {
        if (key === 'size') {
          (p?.options?.size || []).forEach(s => vals.add(s));
        } else if (key === 'price') {
          // handled via bands
        } else {
          const v = p[key === 'sign' ? 'zodiac' : key];
          if (v) vals.add(v);
        }
      }
      return Array.from(vals);
    };

    const wrap = document.createElement('div'); wrap.className = 'shop-filters';
    wrap.innerHTML = `
<div class="sf-group" data-k="sign">
<span class="sf-label">Sign</span>
<div class="sf-chips"></div>
</div>
<div class="sf-group" data-k="element">
<span class="sf-label">Element</span>
<div class="sf-chips"></div>
</div>
<div class="sf-group" data-k="collection">
<span class="sf-label">Collection</span>
<div class="sf-chips"></div>
</div>
<div class="sf-group" data-k="palette">
<span class="sf-label">Palette</span>
<div class="sf-chips"></div>
</div>
<div class="sf-group" data-k="size">
<span class="sf-label">Size</span>
<div class="sf-chips"></div>
</div>
<div class="sf-group" data-k="price">
<span class="sf-label">Price</span>
<div class="sf-chips"></div>
</div>
<button class="sf-reset" type="button">Reset</button>
<div class="sf-sort">
<label for="sf-sort">Sort</label>
<select id="sf-sort">
<option value="featured">Featured</option>
<option value="price-asc">Price: Low to High</option>
<option value="price-desc">Price: High to Low</option>
<option value="zodiac-az">Zodiac A→Z</option>
<option value="new-in">New In</option>
</select>
</div>
`;
    host.innerHTML = ''; host.appendChild(wrap);

    const chip = (val, active = false) => {
      const b = document.createElement('button'); b.className = 'sf-chip'; b.type = 'button';
      b.textContent = val; b.setAttribute('aria-pressed', active ? 'true' : 'false'); return b;
    };

    const groups = [
      ['sign', uniques('sign')],
      ['element', uniques('element')],
      ['collection', uniques('collection')],
      ['palette', uniques('palette')],
      ['size', uniques('size')],
      ['price', Object.keys(this.bands)]
    ];

    for (const [k, vals] of groups) {
      const row = wrap.querySelector(`.sf-group[data-k="${k}"] .sf-chips`);
      vals.forEach(v => row.appendChild(chip(v, false)));
    }

    // URL → state
    const params = new URLSearchParams(location.search);
    const setFromQuery = (k) => {
      const raw = params.get(k); if (!raw) return;
      raw.split(',').map(s => s.trim()).filter(Boolean).forEach(v => this.state[k].add(v));
    };
    ['sign', 'element', 'collection', 'palette', 'size', 'price'].forEach(setFromQuery);
    const qsSort = params.get('sort'); if (qsSort) this.state.sort = qsSort;

    // Apply initial chip states
    for (const [k] of groups) {
      const act = this.state[k];
      if (!(act instanceof Set) || !act.size) continue;
      wrap.querySelectorAll(`.sf-group[data-k="${k}"] .sf-chip`).forEach(b => {
        if (act.has(b.textContent)) b.setAttribute('aria-pressed', 'true');
      });
    }
    wrap.querySelector('#sf-sort').value = this.state.sort;

    // Interactions
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.sf-chip'); if (!b) return;
      const grp = b.closest('.sf-group'); const k = grp.getAttribute('data-k');
      const isOn = b.getAttribute('aria-pressed') === 'true';
      if (isOn) { b.setAttribute('aria-pressed', 'false'); this.state[k].delete(b.textContent); }
      else { b.setAttribute('aria-pressed', 'true'); this.state[k].add(b.textContent); }
      this.syncURL(); this.notify();
    });
    wrap.querySelector('.sf-reset').addEventListener('click', () => {
      for (const k of ['sign', 'element', 'collection', 'palette', 'size', 'price']) this.state[k].clear();
      this.state.sort = 'featured';
      wrap.querySelectorAll('.sf-chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
      wrap.querySelector('#sf-sort').value = 'featured';
      this.syncURL(); this.notify();
    });
    wrap.querySelector('#sf-sort').addEventListener('change', (e) => {
      this.state.sort = e.target.value; this.syncURL(); this.notify();
    });

    this.notify(); // initial fire
  },
  syncURL() {
    const q = new URLSearchParams();
    for (const k of ['sign', 'element', 'collection', 'palette', 'size', 'price']) {
      if (this.state[k].size) q.set(k, Array.from(this.state[k]).join(','));
    }
    if (this.state.sort && this.state.sort !== 'featured') q.set('sort', this.state.sort);
    const qs = q.toString();
    const url = location.pathname + (qs ? ('?' + qs) : '');
    history.replaceState({}, '', url);
  },
  apply(items) {
    let out = items.slice();

    const has = (k, val) => !this.state[k].size || this.state[k].has(val);
    const priceIn = (cents) => {
      if (!this.state.price.size) return true;
      for (const key of this.state.price) {
        const [min, max] = this.bands[key] || [0, Infinity];
        if (cents >= min && cents <= max) return true;
      }
      return false;
    };

    out = out.filter(p => {
      const base = (p.variants?.[0]?.price) || 0;
      const sizeSet = this.state.size;
      const sizeOK = !sizeSet.size || (p?.options?.size || []).some(s => sizeSet.has(s));
      return has('sign', p.zodiac) &&
        has('element', p.element) &&
        has('collection', p.collection) &&
        has('palette', p.palette) &&
        sizeOK &&
        priceIn(base);
    });

    // Sorting
    const s = this.state.sort || 'featured';
    if (s === 'price-asc') out.sort((a, b) => (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0));
    else if (s === 'price-desc') out.sort((a, b) => (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0));
    else if (s === 'zodiac-az') out.sort((a, b) => ('' + (a.zodiac || '')).localeCompare('' + (b.zodiac || '')));
    else if (s === 'new-in') out.reverse(); // by index order (latest last in index → reverse = newest first)

    return out;
  },
  notify() { document.dispatchEvent(new CustomEvent('filters:change')); }
};

function applyFilters() {
  if (!state || typeof state !== 'object') {
    console.error('Filter state not initialized');
    return [];
  }
  const products = Array.isArray(state.products) ? state.products : [];
  const [minPrice = 0, maxPrice = Infinity] = state.priceRange || [];

  return products.filter(product => {
    const inCategory = state.category === 'all' || product.category === state.category;
    const inZodiac = state.zodiac === 'all' || product.zodiac === state.zodiac;
    const price = typeof product.price === 'number' ? product.price : Number(product.price || 0);
    const inPriceRange = price >= minPrice && price <= maxPrice;
    return inCategory && inZodiac && inPriceRange;
  });
}

export { applyFilters };

export function mountFilters(items) {
  state.products = items || [];
  window.ShopFilters = { applyFilters, state };
  window.__LYRION_FILTERS.mount(items);
}
