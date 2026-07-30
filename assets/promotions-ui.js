(function () {
  function removeLegacyPromotions() {
    document.querySelectorAll('.promobar, .bundle-strip, .promo-strip, .sale-badge, [data-bundle], [data-promo]').forEach((node) => {
      node.remove();
    });
  }

  if (document.readyState !== 'loading') removeLegacyPromotions();
  else document.addEventListener('DOMContentLoaded', removeLegacyPromotions);
})();
