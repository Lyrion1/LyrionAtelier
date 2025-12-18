// Load products from global and render; hide loader as soon as we have an answer
(() => {
  const loader = document.querySelector('[data-shop-loader]') || document.getElementById('shop-loader');
  const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
  const products = (window.LyrionAtelier && window.LyrionAtelier.products) || window.products || [];
  console.log('[shop] using window.LyrionAtelier.products');
  if (!Array.isArray(products) || products.length === 0) {
    // if truly empty, show a light message; do NOT block UI forever
    show(loader, false);
    const grid = document.querySelector('[data-grid="products"]') || document.getElementById('products-grid');
    if (grid) grid.innerHTML = "<div class=\"note subtle\">We're aligning the stars — catalog is updating, please check back shortly.</div>";
    return;
  }
  show(loader, false);
  // optional: sort featured first if tag "featured" exists
  const featuredFirst = [...products].sort((a,b) => {
    const af = (a.tags||[]).includes('featured') ? 0 : 1;
    const bf = (b.tags||[]).includes('featured') ? 0 : 1;
    return af - bf;
  });
  if (typeof mountGrid === 'function') mountGrid(featuredFirst);
})();
