(function () {
  const path = (location.pathname || '').toLowerCase();
  const isEventish =
    path.startsWith('/codex') || path.startsWith('/events') || path.startsWith('/contact') || path.startsWith('/oracle');
  if (isEventish) return;

  const isShop = path.startsWith('/shop');
  const isPDP = path.startsWith('/product');
  if (!isShop && !isPDP) return;

  function inject() {
    const el = document.createElement('div');
    el.className = 'promobar';
    el.innerHTML =
      '<span class="lead">Bundle & Save</span>' +
      '<span class="pill" data-bundle="duo" role="button" tabindex="0">Duo: any 2 adult pieces • 10%</span>' +
      '<span class="pill" data-bundle="family" role="button" tabindex="0">Family: adult + youth same sign • 15%</span>' +
      '<span class="pill" data-bundle="poster" role="button" tabindex="0">Poster add-on • 20%</span>' +
      '<span class="pill" data-bundle="trinity" role="button" tabindex="0">Trinity (3+) • 15% off cheapest</span>';

    const host =
      document.querySelector('#shopGrid, #products-grid-local, #product-selector, main, .content, body') || document.body;
    const parent = host && host.parentElement;
    if (parent) parent.insertBefore(el, host);
    else document.body.prepend(el);
    document.dispatchEvent(new Event('promobar:ready'));

    if (!document.querySelector('link[href="/assets/promotions.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/promotions.css';
      document.head.appendChild(link);
    }
  }

  if (document.readyState !== 'loading') inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
