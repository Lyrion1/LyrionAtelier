window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  displayCart();
  bindCartActions();
});

function bindCartActions() {
  const checkoutButton = document.getElementById('checkout-button');
  const clearCartButton = document.getElementById('clear-cart-button');

  checkoutButton?.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

  clearCartButton?.addEventListener('click', clearCart);
}
