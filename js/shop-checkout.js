console.log('Shop checkout script loaded');

document.addEventListener('click', async function(e) {
  const buyLink = e.target.closest('.product-buy-btn');
  if (buyLink) {
    const cleanSlug = (raw = '') =>
      raw
        .replace(/^\/+/, '')
        .replace(/^shop\//, '')
        .replace(/\.html$/, '');
    const href = buyLink.getAttribute('href');
    const productSlug =
      buyLink.getAttribute('data-slug') ||
      buyLink.dataset.productId ||
      buyLink.closest('[data-slug]')?.dataset.slug ||
      buyLink.closest('[data-id]')?.dataset.id ||
      '';
    const slugFragment = (cleanSlug(productSlug) || '').toLowerCase();
    const normalizedHref = href && href.trim() && href !== '#' ? href : null;
    const detailUrl = slugFragment ? `/product.html?slug=${encodeURIComponent(slugFragment)}` : null;
    const legacyUrl = slugFragment ? `/shop/${slugFragment}.html` : null;
    const target = normalizedHref || detailUrl || legacyUrl;
    if (target) {
      e.preventDefault();
      window.location.href = target;
    }
    return;
  }

  const button = e.target.closest('.add-to-cart-btn');
  if (!button) return;

  e.preventDefault();

  const productName = button.getAttribute('data-name');
  const productPrice = button.getAttribute('data-price');
  const variantId = button.getAttribute('data-variant-id');
  
  console.log('Add to cart clicked:', productName);
  
  // Show loading state
  const originalText = button.textContent;
  button.textContent = 'Processing...';
  button.disabled = true;
  
  if (!variantId) {
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
