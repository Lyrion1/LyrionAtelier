/*
 * House guard for the hand-built product pages in shop/*.html. Each page names
 * its product in <meta name="lyrion:product">; if the house has that sign
 * resting, the add-to-bag button is switched off and says why.
 */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="lyrion:product"]');
  if (!meta || !window.LyrionHouse) return;
  var slug = meta.getAttribute('content');
  function run() {
    window.LyrionHouse.load().then(function (ctx) {
      var product = window.LyrionHouse.find(ctx, slug);
      if (!product) return;
      var addBtn = document.getElementById('add-to-cart-btn');
      var buyBtn = document.getElementById('buy-now-btn');
      window.LyrionHouse.guardProductPage(product, { buttons: [addBtn, buyBtn], anchor: addBtn });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
