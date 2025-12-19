console.log('Shop checkout script loaded');

document.addEventListener('click', async function(e) {
  const button = e.target.closest('.product-buy-btn, .add-to-cart-btn');
  if (!button) return;

  e.preventDefault();

  const productName = button.getAttribute('data-name');
  const productPrice = button.getAttribute('data-price');
  const variantId = button.getAttribute('data-variant-id');
  const productSlug = button.getAttribute('data-slug') || button.closest('[data-slug]')?.dataset.slug || '';
  
  console.log('Buy button clicked:', productName);
  
  // Show loading state
  const originalText = button.textContent;
  button.textContent = 'Processing...';
  button.disabled = true;
  
  if (!variantId) {
    const target = productSlug ? (productSlug.startsWith('/shop/') ? productSlug : `/shop/${productSlug}`) : null;
    if (target) {
      window.location.href = target;
      return;
    }
    button.textContent = originalText;
    button.disabled = false;
    return;
  }

  const success = await window.initiateCheckout({
    name: productName,
    price: productPrice,
    type: 'merchandise',
    variantId: variantId
  });
  
  if (!success) {
    // Restore button if checkout failed
    button.textContent = originalText;
    button.disabled = false;
  }
});
