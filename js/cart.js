// Lyrīon Atelier - Shopping Cart Functionality

const CART_KEY = 'cart';
const notify = (message, type = 'info') => {
  if (typeof showToast === 'function') {
    showToast(message, type);
    return;
  }
  if (type === 'error') console.warn(message);
};

const toNumber = (val) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

const toCents = (val) => {
  const num = toNumber(val);
  if (num === null) return null;
  return Math.round(num * 100);
};

const readCart = () => {
  try {
    const stored = localStorage.getItem(CART_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCart = (cart = []) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const event = new CustomEvent('cart:updated', { detail: { cart } });
  document.dispatchEvent(event);
};

const inferAudience = (product = {}) => {
  const gender = String(product.gender || product.audience || '').toLowerCase();
  if (gender.includes('youth') || gender.includes('kid')) return 'youth';
  if (product.category && String(product.category).toLowerCase().includes('youth')) return 'youth';
  if (Array.isArray(product.tags) && product.tags.some((t) => String(t).toLowerCase().includes('youth'))) {
    return 'youth';
  }
  return 'adult';
};

const inferSign = (product = {}) => {
  const hints = [
    product.zodiac,
    product.sign,
    product.id,
    product.slug,
    product.name,
    ...(Array.isArray(product.tags) ? product.tags : [])
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  return SIGNS.find((sign) => hints.some((h) => h.includes(sign))) || null;
};

const isPosterItem = (product = {}) => {
  const label = (product.category || product.name || '').toLowerCase();
  if (label.includes('poster')) return true;
  return Array.isArray(product.tags) && product.tags.some((t) => String(t).toLowerCase().includes('poster'));
};

const resolveCatalogProduct = (productId, fallback) => {
  if (fallback) return fallback;
  const idStr = String(productId);
  const fromGlobal = Array.isArray(window?.LyrionAtelier?.products)
    ? window.LyrionAtelier.products.find((p) => String(p.id) === idStr || String(p.slug || '') === idStr)
    : null;
  if (fromGlobal) return fromGlobal;
  if (typeof products !== 'undefined' && Array.isArray(products)) {
    const match = products.find((p) => String(p.id) === idStr || String(p.slug || '') === idStr);
    if (match) return match;
  }
  return null;
};

const resolvePrice = (product = {}, variant = null) => {
  if (variant) {
    const cents = toNumber(variant.priceCents);
    if (cents !== null) return cents / 100;
    const directVariantPrice = toNumber(variant.price);
    if (directVariantPrice !== null) return directVariantPrice;
  }
  if (typeof product.price === 'number') return product.price;
  if (product.price && typeof product.price === 'object') {
    if (typeof product.price.min === 'number') return product.price.min;
    if (typeof product.price.amount === 'number') return product.price.amount;
  }
  if (product.priceCents) return toNumber(product.priceCents) / 100;
  return null;
};

const buildCartItem = (product, size, quantity, variant) => {
  const price = resolvePrice(product, variant);
  const image = product.image || (Array.isArray(product.images) ? product.images[0] : null) || null;
  const audience = inferAudience(product);
  const zodiac = inferSign(product);
  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name || product.title || 'Product',
    price,
    size: size || 'Default',
    quantity,
    image,
    category: product.category || product.meta?.category || '',
    audience,
    zodiac,
    poster: isPosterItem(product),
    printfulVariantId: product.printfulVariantId || product.variantId || variant?.printfulVariantId || variant?.variant_id || null,
    variantId: variant?.id || variant?.store_variant_id || variant?.storeVariantId || null
  };
};

/**
 * Add Product to Cart
 * Adds a product to the shopping cart with selected size and quantity
 * @param {number|string} productId - The ID/slug of the product to add
 * @param {string|null} size - Selected size
 * @param {number} quantity - The quantity to add (default: 1)
 */
function addToCart(productId, size = null, quantity = 1, customProduct = null, variant = null) {
  if (typeof size === 'number' && typeof quantity !== 'number') {
    quantity = size;
    size = null;
  }
  const product = resolveCatalogProduct(productId, customProduct);
  if (!product) {
    notify('Product not found', 'error');
    return { ok: false };
  }

  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const selectedSize =
    size ||
    document.querySelector('.size-option.active')?.textContent ||
    document.querySelector('.size-chip.active')?.dataset.size ||
    'Default';
  const item = buildCartItem(product, selectedSize, normalizedQuantity, variant);
  const price = toNumber(item.price);
  if (!Number.isFinite(price)) {
    notify('Invalid price for this item.', 'error');
    return { ok: false };
  }

  let cart = readCart();
  const matchIndex = cart.findIndex(
    (entry) =>
      String(entry.id) === String(item.id) &&
      entry.size === item.size &&
      (entry.printfulVariantId || '') === (item.printfulVariantId || '')
  );

  if (matchIndex > -1) {
    cart[matchIndex].quantity += normalizedQuantity;
    cart[matchIndex].price = price;
    cart[matchIndex].audience = item.audience;
    cart[matchIndex].zodiac = item.zodiac;
    cart[matchIndex].poster = item.poster;
  } else {
    cart.push(item);
  }

  writeCart(cart);
  updateCartCount();
  notify(`${item.name} (${item.size}) added to cart! 🛒`, 'success');

  const cartIcon = document.querySelector('.cart-icon');
  if (cartIcon) {
    cartIcon.classList.add('cart-bounce');
    setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
  }
  return { ok: true, item };
}

/**
 * Remove Item from Cart
 * Removes a specific product with given size from cart
 * @param {number} productId - The ID of the product to remove
 * @param {string} size - The size of the product to remove
 */
function removeFromCart(productId, size) {
  let cart = readCart();
  const itemToRemove = cart.find(item => String(item.id) === String(productId) && item.size === size);
  cart = cart.filter(item => !(String(item.id) === String(productId) && item.size === size));
  writeCart(cart);
  displayCart();
  updateCartCount();
  if (itemToRemove) {
    notify(`${itemToRemove.name} removed from cart`, 'info');
  }
}

/**
 * Update Item Quantity in Cart
 * Updates the quantity of a specific item in the cart
 * @param {number} productId - The ID of the product
 * @param {string} size - The size of the product
 * @param {number} newQuantity - The new quantity
 */
function updateQuantity(productId, size, newQuantity) {
  if (newQuantity < 1) {
    removeFromCart(productId, size);
    return;
  }

  let cart = readCart();
  const item = cart.find(item => String(item.id) === String(productId) && item.size === size);

  if (item) {
    item.quantity = newQuantity;
    writeCart(cart);
    displayCart();
    updateCartCount();
  }
}

function evaluateBundleDiscount(cart = readCart()) {
  const subtotalCents = (cart || []).reduce((sum, item) => {
    const price = toNumber(item?.price) || 0;
    const qty = Number.isFinite(item?.quantity) ? item.quantity : 1;
    return sum + Math.round(price * 100) * qty;
  }, 0);
  return { selectedBundle: null, savingsCents: 0, eligibleBundles: [], subtotalCents };
}

const formatMoney = (amount) => `$${amount.toFixed(2)}`;

const syncBundleChips = () => {};
const bindBundleChips = () => {};

/**
 * Display Cart Items
 * Renders all items in the shopping cart
 */
function displayCart() {
  const cart = readCart();
  const cartTableBody = document.querySelector('.cart-table tbody');
  const emptyCartMessage = document.getElementById('empty-cart-message');
  
  if (!cartTableBody) return;
  
  // Show empty cart message if cart is empty
  if (cart.length === 0) {
    cartTableBody.innerHTML = '';
    if (emptyCartMessage) {
      emptyCartMessage.style.display = 'block';
    }
    updateOrderSummary(0, 0, 0);
    return;
  }
  
  // Hide empty cart message
  if (emptyCartMessage) {
    emptyCartMessage.style.display = 'none';
  }
  
  cartTableBody.innerHTML = '';
  
  // Render each cart item
  cart.forEach(item => {
    const unitPrice = toNumber(item.price) || 0;
    const lineTotal = unitPrice * (item.quantity || 1);
    const row = document.createElement('tr');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <td>
        <div class="cart-item-image">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : `<div class="placeholder-image">📦</div>`}
        </div>
      </td>
      <td>
        <strong>${item.name}</strong><br>
        <small style="color: var(--gray-medium);">Size: ${item.size}</small>
      </td>
      <td class="cart-price">${formatMoney(unitPrice)}</td>
      <td>
        <div class="quantity-controls">
          <button class="quantity-btn decrement" aria-label="Decrease quantity">-</button>
          <input type="number" class="quantity-input" value="${item.quantity}" min="1" aria-label="Quantity">
          <button class="quantity-btn increment" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td class="cart-total"><strong>${formatMoney(lineTotal)}</strong></td>
      <td>
        <button class="btn btn-outline btn-sm remove-item" 
                aria-label="Remove ${item.name} from cart">Remove</button>
      </td>
    `;
    const decrementButton = row.querySelector('.quantity-btn.decrement');
    const incrementButton = row.querySelector('.quantity-btn.increment');
    const quantityInput = row.querySelector('.quantity-input');
    const removeButton = row.querySelector('.remove-item');

    decrementButton?.addEventListener('click', () => updateQuantity(item.id, item.size, item.quantity - 1));
    incrementButton?.addEventListener('click', () => updateQuantity(item.id, item.size, item.quantity + 1));
    quantityInput?.addEventListener('change', (event) => {
      const value = parseInt(event.target.value, 10);
      updateQuantity(item.id, item.size, value);
    });
    removeButton?.addEventListener('click', () => removeFromCart(item.id, item.size));

    cartTableBody.appendChild(row);
  });
  
  // Calculate and update order summary
  const subtotal = cart.reduce((sum, item) => sum + ((toNumber(item.price) || 0) * (item.quantity || 1)), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const { savingsCents } = evaluateBundleDiscount(cart);
  const discount = (savingsCents || 0) / 100;
  const total = subtotal - discount + shipping;
  updateOrderSummary(subtotal, shipping, total, discount);
}

/**
 * Update Order Summary
 * Updates the order summary display with current totals
 */
function updateOrderSummary(subtotal, shipping, total, discount = 0) {
  const subtotalElement = document.getElementById('cart-subtotal');
  const shippingElement = document.getElementById('cart-shipping');
  const totalElement = document.getElementById('cart-total');
  const discountRow = document.getElementById('cart-discount');
  if (subtotalElement) subtotalElement.textContent = formatMoney(subtotal);
  if (shippingElement) shippingElement.textContent = shipping === 0 ? 'FREE' : formatMoney(shipping);
  if (discountRow) {
    if (discount > 0) {
      discountRow.textContent = `-${formatMoney(discount)}`;
      discountRow.parentElement.style.display = '';
    } else {
      discountRow.parentElement.style.display = 'none';
    }
  }
  if (totalElement) totalElement.textContent = formatMoney(total);
}

/**
 * Clear All Items from Cart
 * Removes all items from the shopping cart after confirmation
 */
function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    localStorage.removeItem(CART_KEY);
    displayCart();
    updateCartCount();
    notify('Cart cleared', 'info');
  }
}

/**
 * Proceed to Checkout
 * Validates cart and redirects to checkout page
 */
function proceedToCheckout() {
  const cart = readCart();
  if (cart.length === 0) {
    notify('Your cart is empty!', 'error');
    return;
  }
  window.location.href = '/checkout';
}

/**
 * Handle Checkout Form Submission
 * Processes checkout form and handles payment
 */
function handleCheckoutForm(event) {
  event.preventDefault();
  const paymentHandler = (window.lyrionCheckout && typeof window.lyrionCheckout.processPayment === 'function')
    ? window.lyrionCheckout.processPayment
    : null;
  if (paymentHandler) {
    paymentHandler(event);
    return;
  }
  notify('Payment is currently unavailable. Please try again in a moment.', 'error');
}

/**
 * Display Checkout Summary
 * Shows order summary on checkout page
 */
function displayCheckoutSummary() {
  const cart = readCart();
  const summaryContainer = document.getElementById('checkout-cart-summary');
  
  if (!summaryContainer) return;
  
  if (cart.length === 0) {
    summaryContainer.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }
  
  let html = '<div class="order-summary">';
  html += '<h3>Order Summary</h3>';
  
  cart.forEach(item => {
    html += `
      <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
        <div>
          <strong>${item.name}</strong><br>
          <small style="color: var(--gray-medium);">Size: ${item.size} | Qty: ${item.quantity}</small>
        </div>
        <div>$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `;
  });
  
  const subtotal = cart.reduce((sum, item) => sum + ((toNumber(item.price) || 0) * (item.quantity || 1)), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const { savingsCents } = evaluateBundleDiscount(cart);
  const discount = (savingsCents || 0) / 100;
  const total = subtotal - discount + shipping;
  
  html += `
    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span>Subtotal:</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `<div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span>Discount:</span>
      <span>- $${discount.toFixed(2)}</span>
    </div>` : ''}
    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span>Shipping:</span>
      <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
    </div>
    <div class="summary-row total" style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--purple); font-size: 1.25rem; font-weight: 600;">
      <span>Total:</span>
      <span>$${total.toFixed(2)}</span>
    </div>
  `;
  
  html += '</div>';
  summaryContainer.innerHTML = html;
}

/**
 * Initialize Cart Functionality
 * Sets up event listeners and displays cart data
 */
document.addEventListener('DOMContentLoaded', function() {
  // Display cart on cart page
  if (document.querySelector('.cart-table')) {
    displayCart();
  }
  
  // Display cart summary on checkout page
  if (document.getElementById('checkout-cart-summary')) {
    displayCheckoutSummary();
  }
  
  // Add event listener for add to cart button on product page
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      // Prefer explicit product id, then slug, then variant id for fallback.
      const idAttributes = ['data-product-id', 'data-slug', 'data-variant-id'];
      const productId = idAttributes
        .map((attr) => this.getAttribute(attr))
        .find((val) => val) || null;
      const quantityInput = document.getElementById('product-quantity');
      const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
      if (!productId) {
        notify('Product not found', 'error');
        return;
      }
      const parsedProductId = Number.isFinite(Number(productId)) ? Number(productId) : productId;
      addToCart(parsedProductId, null, quantity);
    });
  }
});

// expose helpers for checkout payloads
window.evaluateBundleDiscount = window.evaluateBundleDiscount || evaluateBundleDiscount;
window.readCart = window.readCart || readCart;
window.addToCart = window.addToCart || addToCart;
