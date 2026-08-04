document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  bindCartActions();
});

function bindCartActions() {
  const clearCartButton = document.getElementById('clear-cart-button');
  clearCartButton?.addEventListener('click', clearCart);
}
