// Lyrion Atelier - Shopping Cart Functionality

// Add to cart
function addToCart(productId, quantity = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // Get selected size if on product page
  const selectedSize = document.querySelector('.size-option.active');
  const size = selectedSize ? selectedSize.textContent : 'M';
  
  // Get cart from localStorage
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Check if product already exists in cart
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
      image: product.image
    });
  }
  
  // Save cart to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Update cart count
  updateCartCount();
  
  // Show confirmation
  alert(`${product.name} (${size}) added to cart!`);
}

// Remove from cart
function removeFromCart(productId, size) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart = cart.filter(item => !(item.id === productId && item.size === size));
  localStorage.setItem('cart', JSON.stringify(cart));
  
  displayCart();
  updateCartCount();
}

// Update quantity in cart
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

// Display cart
function displayCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartTableBody = document.querySelector('.cart-table tbody');
  const emptyCartMessage = document.getElementById('empty-cart-message');
  
  if (!cartTableBody) return;
  
  if (cart.length === 0) {
    cartTableBody.innerHTML = '';
    if (emptyCartMessage) {
      emptyCartMessage.style.display = 'block';
    }
    updateOrderSummary(0, 0, 0);
    return;
  }
  
  if (emptyCartMessage) {
    emptyCartMessage.style.display = 'none';
  }
  
  cartTableBody.innerHTML = '';
  
  cart.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="cart-item-image">
          ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<!-- Placeholder: ${item.name} Image -->`}
        </div>
      </td>
      <td>
        <strong>${item.name}</strong><br>
        <small>Size: ${item.size}</small>
      </td>
      <td>$${item.price.toFixed(2)}</td>
      <td>
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', ${item.quantity - 1})">-</button>
          <input type="number" class="quantity-input" value="${item.quantity}" 
                 onchange="updateQuantity(${item.id}, '${item.size}', parseInt(this.value))" min="1">
          <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', ${item.quantity + 1})">+</button>
        </div>
      </td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
      <td>
        <button class="btn btn-outline" onclick="removeFromCart(${item.id}, '${item.size}')" 
                style="padding: 0.5rem 1rem;">Remove</button>
      </td>
    `;
    cartTableBody.appendChild(row);
  });
  
  // Update order summary
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  
  updateOrderSummary(subtotal, shipping, total);
}

// Update order summary
function updateOrderSummary(subtotal, shipping, total) {
  const subtotalElement = document.getElementById('cart-subtotal');
  const shippingElement = document.getElementById('cart-shipping');
  const totalElement = document.getElementById('cart-total');
  
  if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingElement) shippingElement.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
}

// Clear cart
function clearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    localStorage.removeItem('cart');
    displayCart();
    updateCartCount();
  }
}

// Checkout
function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  window.location.href = 'checkout.html';
}

// Handle checkout form
function handleCheckoutForm(event) {
  event.preventDefault();
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  // In a real application, this would process the payment
  alert('Thank you for your order! Your cosmic package is on its way to you. 🌟');
  
  // Clear cart
  localStorage.removeItem('cart');
  
  // Redirect to home page
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 2000);
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', function() {
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
  
  // Add event listener for checkout form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutForm);
  }
});

// Display checkout summary
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
          <small>Size: ${item.size} | Qty: ${item.quantity}</small>
        </div>
        <div>$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `;
  });
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;
  
  html += `
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>Shipping:</span>
      <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
    </div>
    <div class="summary-row total">
      <span>Total:</span>
      <span>$${total.toFixed(2)}</span>
    </div>
  `;
  
  html += '</div>';
  summaryContainer.innerHTML = html;
}
