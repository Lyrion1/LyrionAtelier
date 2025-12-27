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
      buyLink.getAttribute('data-product-id') ||
      buyLink.closest('[data-slug]')?.dataset.slug ||
      buyLink.closest('[data-id]')?.dataset.id ||
      '';
    const slugFragment = (cleanSlug(productSlug) || '').toLowerCase();
    const normalizedHref = href && href.trim() && href !== '#' ? href : null;
    const detailUrl = slugFragment ? `/shop/${encodeURIComponent(slugFragment)}` : null;
    const legacyUrl = slugFragment ? `/shop/${slugFragment}` : null;
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

  const productId =
    button.getAttribute('data-product-id') ||
    button.getAttribute('data-variant-id') ||
    button.getAttribute('data-slug') ||
    button.closest('[data-id]')?.dataset.id ||
    button.closest('[data-slug]')?.dataset.slug ||
    '';
  const catalog = Array.isArray(window?.LyrionAtelier?.products) ? window.LyrionAtelier.products : [];
  const product =
    catalog.find((p) => String(p.id) === String(productId)) ||
    catalog.find((p) => String(p.slug || '') === String(productId)) ||
    null;
  const priceAttr = button.getAttribute('data-price');
  const fallbackProduct = product || {
    id: productId,
    name: button.getAttribute('data-name') || 'Product',
    price: priceAttr ? Number(String(priceAttr).replace(/[^0-9.]/g, '')) : null,
    image: button.closest('.product-card')?.querySelector('img')?.src || null
  };

  const originalText = button.textContent;
  button.textContent = 'Adding…';
  button.disabled = true;

  const result = typeof addToCart === 'function' ? addToCart(productId, null, 1, fallbackProduct) : { ok: false };
  if (result?.ok) {
    button.textContent = 'Added ✓';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  } else {
    button.textContent = originalText;
    button.disabled = false;
  }
});
