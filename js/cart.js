// Lyrīon Atelier - Shopping Cart Functionality

/**
 * Add Product to Cart
 * Adds a product to the shopping cart with selected size and quantity
 * @param {number} productId - The ID of the product to add
 * @param {number} quantity - The quantity to add (default: 1)
 */
function addToCart(productId, quantity = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found', 'error');
    return;
  }
  
  // Get selected size if on product page
  const selectedSize = document.querySelector('.size-option.active');
  const size = selectedSize ? selectedSize.textContent : 'M';
  
  // Get cart from localStorage
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Check if product already exists in cart with same size
  const existingItemIndex = cart.findIndex(item => 
    item.id === productId && item.size === size
  );
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: product.price,
      size: size,
      quantity: quantity,
      image: product.image,
      category: product.category
    });
  }
  
  // Save cart to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Update cart count with animation
  updateCartCount();
  
  // Show success toast notification
  showToast(`${product.name} (${size}) added to cart! 🛒`, 'success');
  
  // Add cart icon bounce animation
  const cartIcon = document.querySelector('.cart-icon');
  if (cartIcon) {
    cartIcon.classList.add('cart-bounce');
    setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
  }
}

/**
 * Remove Item from Cart
 * Removes a specific product with given size from cart
 * @param {number} productId - The ID of the product to remove
 * @param {string} size - The size of the product to remove
 */
function removeFromCart(productId, size) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const itemToRemove = cart.find(item => item.id === productId && item.size === size);
  
  cart = cart.filter(item => !(item.id === productId && item.size === size));
  localStorage.setItem('cart', JSON.stringify(cart));
  
  displayCart();
  updateCartCount();
  
  if (itemToRemove) {
    showToast(`${itemToRemove.name} removed from cart`, 'info');
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
  
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart.find(item => item.id === productId && item.size === size);
  
  if (item) {
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
    updateCartCount();
  }
}

/**
 * Display Cart Items
 * Renders all items in the shopping cart
 */
function displayCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
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
      <td class="cart-price">$${item.price.toFixed(2)}</td>
      <td>
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
          <input type="number" class="quantity-input" value="${item.quantity}" 
                 onchange="updateQuantity(${item.id}, '${item.size}', parseInt(this.value))" min="1" aria-label="Quantity">
          <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td class="cart-total"><strong>$${(item.price * item.quantity).toFixed(2)}</strong></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="removeFromCart(${item.id}, '${item.size}')" 
                aria-label="Remove ${item.name} from cart">Remove</button>
      </td>
    `;
    cartTableBody.appendChild(row);
  });
  
  // Calculate and update order summary
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  
  updateOrderSummary(subtotal, shipping, total);
}

/**
 * Update Order Summary
 * Updates the order summary display with current totals
 */
function updateOrderSummary(subtotal, shipping, total) {
  const subtotalElement = document.getElementById('cart-subtotal');
  const shippingElement = document.getElementById('cart-shipping');
  const totalElement = document.getElementById('cart-total');
  
  if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingElement) shippingElement.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
}

/**
 * Clear All Items from Cart
 * Removes all items from the shopping cart after confirmation
 */
function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    localStorage.removeItem('cart');
    displayCart();
    updateCartCount();
    showToast('Cart cleared', 'info');
  }
}

/**
 * Proceed to Checkout
 * Validates cart and redirects to checkout page
 */
function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }
  window.location.href = 'checkout.html';
}

/**
 * Handle Checkout Form Submission
 * Processes checkout form and handles payment
 */
function handleCheckoutForm(event) {
  event.preventDefault();
  if (typeof window.processStripePayment === 'function') {
    window.processStripePayment(event);
    return;
  }
  showToast('Payment is currently unavailable. Please try again in a moment.', 'error');
}

/**
 * Display Checkout Summary
 * Shows order summary on checkout page
 */
function displayCheckoutSummary() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
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
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  
  html += `
    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
      <span>Subtotal:</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
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
      const productId = parseInt(this.getAttribute('data-product-id'));
      const quantityInput = document.getElementById('product-quantity');
      const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
      addToCart(productId, quantity);
    });
  }
  
});
