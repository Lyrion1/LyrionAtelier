window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  bindCartActions();
});

function bindCartActions() {
  const clearCartButton = document.getElementById('clear-cart-button');
  clearCartButton?.addEventListener('click', clearCart);
}
