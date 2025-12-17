(function () {
  const log = (...args) => console.log('[shop]', ...args);

  // DOM
  const gridEl =
    document.querySelector('[data-shop-grid]') ||
    document.querySelector('#products-grid') ||
    document.querySelector('#shopGrid') ||
    document.querySelector('.products-grid');
  const spinnerEl =
    document.querySelector('#shop-loading') ||
    document.querySelector('.shop-loading') ||
    document.querySelector('#products-loading') ||
    document.querySelector('.products-loading');
  const emptyEl =
    document.querySelector('#shop-empty') || document.querySelector('.shop-empty');

  const PLACEHOLDER_SVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#111A2B"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#8BA0D7" font-family="Inter, system-ui, sans-serif" font-size="20">
        Image loading…
      </text>
    </svg>
    `);

  const resolveImg = (src) => {
    if (!src) return PLACEHOLDER_SVG;
    if (src.startsWith('http')) return src;
    if (src.startsWith('/')) return src;
    return `/assets/${src}`; // mild default; won’t be used if src is absolute
  };

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} ${res.status} ${res.statusText || ''}`.trim());
    return res.json();
  }

  async function loadProductsResilient() {
    // 1) window variable (if previous PR exposed it)
    if (
      window.LyrionAtelier &&
      Array.isArray(window.LyrionAtelier.products) &&
      window.LyrionAtelier.products.length
    ) {
      log('using window.LyrionAtelier.products');
      return window.LyrionAtelier.products;
    }
    if (Array.isArray(window.products) && window.products.length) {
      log('using legacy window.products');
      return window.products;
    }

    // 2) Netlify function (ok if missing)
    try {
      const fromFn = await fetchJson('/.netlify/functions/printful-sync');
      if (fromFn && Array.isArray(fromFn.products) && fromFn.products.length) {
        log('using printful-sync function');
        return fromFn.products;
      }
    } catch (e) {
      log('printful-sync unavailable:', e.message);
    }

    // 3) Local fallback
    try {
      const fromLocal = await fetchJson('/data/catalog.json');
      if (fromLocal && Array.isArray(fromLocal.products) && fromLocal.products.length) {
        log('using local /data/catalog.json');
        return fromLocal.products;
      }
    } catch (e) {
      log('local catalog missing:', e.message);
    }

    return []; // nothing
  }

  function stopSpinner() {
    if (spinnerEl) spinnerEl.style.display = 'none';
  }

  function showEmpty() {
    if (emptyEl) {
      emptyEl.style.display = 'block';
    } else if (gridEl) {
      gridEl.style.display = '';
      const note = document.createElement('div');
      note.className = 'shop-empty-note';
      note.innerHTML =
        `We're aligning the stars <br/>Catalog is updating. Please check back shortly.`;
      note.style.textAlign = 'center';
      note.style.padding = '2rem 0';
      gridEl.appendChild(note);
    }
  }

  function clearStrays() {
    // remove any stray thumbnails stuck at the bottom from prior bad renders
    document.querySelectorAll('.thumb, .thumb-strip, .stray-thumb').forEach((n) =>
      n.remove()
    );
  }

  function render(products) {
    if (!gridEl) return;
    gridEl.style.display = '';
    gridEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    products.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'product-card';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = resolveImg(p.image);
      img.alt = p.title || 'product';
      img.onerror = () => {
        img.src = PLACEHOLDER_SVG;
      };

      const title = document.createElement('h3');
      title.className = 'product-title';
      title.textContent = p.title || 'Untitled';

      const price = document.createElement('div');
      price.className = 'product-price';
      const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : n);
      price.textContent = `${p.currency || 'USD'} ${fmt(p.price || 0)}`;

      const actions = document.createElement('div');
      actions.className = 'product-actions';
      const viewBtn = document.createElement('a');
      viewBtn.href = `/product/${encodeURIComponent(p.id)}`;
      viewBtn.className = 'btn btn-secondary';
      viewBtn.textContent = 'View';
      const buyBtn = document.createElement('button');
      buyBtn.type = 'button';
      buyBtn.className = 'btn btn-primary';
      buyBtn.textContent = 'Buy Now';
      buyBtn.addEventListener('click', () => {
        // Reuse existing cart/checkout hooks if present
        if (window.addToCart) window.addToCart(p);
        else console.info('Added to cart:', p.title || p.id);
      });

      actions.appendChild(viewBtn);
      actions.appendChild(buyBtn);

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(price);
      card.appendChild(actions);
      frag.appendChild(card);
    });

    gridEl.appendChild(frag);
  }

  (async function init() {
    try {
      clearStrays();
      const products = await loadProductsResilient();
      stopSpinner();

      if (!products || !products.length) {
        console.warn('No products available. Using fallback.');
        showEmpty();
        return;
      }
      console.log('[shop] products available:', products.length);
      render(products);
    } catch (e) {
      stopSpinner();
      console.error('Shop init failed:', e);
      showEmpty();
    }
  })();
})();
