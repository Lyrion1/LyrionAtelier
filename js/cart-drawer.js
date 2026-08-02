// Lyrīon Atelier — slide-out cart drawer
// Hooks into the existing cart.js contract only (window.readCart, the
// `cart:updated` document event, and localStorage 'cart') so it never
// has to modify cart.js itself.
(function () {
  const CART_KEY = 'cart';

  function readCart() {
    if (typeof window.readCart === 'function') return window.readCart();
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
  }

  function formatPrice(amount) {
    const num = Number(amount);
    return `$${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
  }

  let drawer = null;
  let backdrop = null;
  let itemsEl = null;
  let subtotalEl = null;

  function ensureDrawer() {
    if (drawer) return drawer;

    backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'soho-cart-drawer-backdrop';
    backdrop.setAttribute('aria-label', 'Close cart');
    document.body.appendChild(backdrop);

    drawer = document.createElement('aside');
    drawer.className = 'soho-cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-label', 'Shopping bag');
    drawer.innerHTML = `
      <div class="soho-cart-drawer__head">
        <h2>Your Bag</h2>
        <button type="button" class="soho-cart-drawer__close" aria-label="Close cart">&times;</button>
      </div>
      <div class="soho-cart-drawer__items"></div>
      <div class="soho-cart-drawer__foot">
        <div class="soho-cart-drawer__subtotal"><span>Subtotal</span><span class="soho-cart-drawer__subtotal-amount">$0.00</span></div>
        <a href="/cart" class="soho-btn soho-btn--dark soho-btn--full">Checkout</a>
      </div>`;
    document.body.appendChild(drawer);

    itemsEl = drawer.querySelector('.soho-cart-drawer__items');
    subtotalEl = drawer.querySelector('.soho-cart-drawer__subtotal-amount');

    drawer.querySelector('.soho-cart-drawer__close').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });

    return drawer;
  }

  function render() {
    ensureDrawer();
    const cart = readCart();
    itemsEl.innerHTML = '';

    if (!cart.length) {
      itemsEl.innerHTML = '<p class="soho-cart-drawer__empty">Your bag is empty.</p>';
    } else {
      cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'soho-cart-drawer__item';
        const name = item.name || 'Product';
        const qty = item.quantity || 1;
        row.innerHTML = `
          <img src="${item.image || '/assets/catalog/placeholder.webp'}" alt="${name}" loading="lazy">
          <div>
            <p class="soho-cart-drawer__item-title">${name}</p>
            <p class="soho-cart-drawer__item-meta">Size ${item.size || '—'} &middot; Qty ${qty}</p>
            <button type="button" class="soho-cart-drawer__item-remove" data-index="${index}">Remove</button>
          </div>
          <span class="soho-cart-drawer__item-price">${formatPrice((Number(item.price) || 0) * qty)}</span>`;
        itemsEl.appendChild(row);
      });
    }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    subtotalEl.textContent = formatPrice(subtotal);

    itemsEl.querySelectorAll('.soho-cart-drawer__item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = readCart();
        next.splice(Number(btn.dataset.index), 1);
        writeCart(next);
        render();
      });
    });
  }

  function openDrawer() {
    ensureDrawer();
    render();
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('cart:updated', () => {
    if (drawer && drawer.classList.contains('is-open')) render();
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('a.cart-icon');
    if (!trigger) return;
    event.preventDefault();
    openDrawer();
  });

  window.LyrionCartDrawer = { open: openDrawer, close: closeDrawer };
})();
