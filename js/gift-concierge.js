/*
 * Gift Concierge: from a recipient's birthday to a ready set. The sign comes
 * from the date; the set is a piece of that sign that can be ordered today
 * (or a core piece while the sign rests), a Solar Return Reading, and a
 * certificate. The gift note travels through the basket and checkout to the
 * Printful packing slip and to the reading and certificate emails.
 */
(function () {
  'use strict';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SHOP_TYPES = ['apparel', 'accessory', 'home'];
  var READING = 'solar-return-reading';
  var COUPLE_CERT = 'compatibility-digital-certificate';
  var NEWBORN_CERT = 'newborn-birth-chart-keepsake';
  var ctx = null;

  var $ = function (sel) { return document.querySelector(sel); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function money(gbp) { return '$' + Number(gbp).toFixed(2); } // site price token; js/main.js shows local currency

  function fillSelects() {
    var day = $('#gc-day');
    var month = $('#gc-month');
    for (var d = 1; d <= 31; d += 1) day.append(new Option(String(d), String(d)));
    MONTHS.forEach(function (m, i) { month.append(new Option(m, String(i + 1))); });
    var q = new URLSearchParams(location.search);
    if (q.get('day')) day.value = q.get('day');
    if (q.get('month')) month.value = q.get('month');
    if (q.get('for')) $('#gc-name').value = q.get('for');
  }

  function bySlug(slug) { return ctx.products.find(function (p) { return p.slug === slug; }); }

  function pieceFor(sign) {
    var all = ctx.products.filter(function (p) { return SHOP_TYPES.indexOf(p.type) !== -1 && p.listed; });
    var shop = all.filter(function (p) { return p.purchasable; });
    var own = shop.filter(function (p) { return p.sign === sign; });
    if (own.length) return { product: own[0], why: null };
    var core = shop.filter(function (p) { return p.houseState === 'core' || p.houseState === 'open'; });
    var hasSign = all.some(function (p) { return p.sign === sign; });
    return {
      product: core[0] || null,
      why: hasSign
        ? 'The ' + sign + ' collection is resting until its season returns, so this is a piece from the core collection.'
        : 'There is no ' + sign + ' piece in the collection yet, so this is a piece from the core collection.'
    };
  }

  function card(kind, product, body) {
    var c = el('article', 'gc-card');
    c.dataset.kind = kind;
    var img = el('img');
    img.src = product.images[0];
    img.alt = product.title;
    img.width = 600; img.height = 750; img.loading = 'lazy';
    var info = el('div', 'gc-card__body');
    var include = el('label', 'gc-include');
    var box = document.createElement('input');
    box.type = 'checkbox'; box.checked = true; box.dataset.slug = product.slug;
    include.append(box, document.createTextNode(' Include'));
    info.append(el('p', 'house-row__eyebrow', kind), el('h3', null, product.title));
    var price = el('p', 'gc-price', (product.price_range.max > product.price_range.min ? 'From ' : '') + money(product.price_range.min));
    info.append(price);
    body.forEach(function (n) { if (n) info.append(n); });
    info.append(include);
    c.append(img, info);
    return c;
  }

  function render(e) {
    if (e) e.preventDefault();
    var name = $('#gc-name').value.trim();
    var day = Number($('#gc-day').value);
    var month = Number($('#gc-month').value);
    var year = Number($('#gc-year').value) || null;
    var out = $('#gc-result');
    var err = $('#gc-error');
    err.textContent = '';
    var probe = new Date(Date.UTC(2000, month - 1, day));
    if (!day || !month || probe.getUTCDate() !== day) { err.textContent = 'Please choose a real day and month.'; return; }
    if (year && (year < 1900 || year > new Date().getFullYear())) { err.textContent = 'Please check the year.'; return; }
    var sign = ctx.core.signFromBirthDate(month, day);
    var element = ctx.core.ELEMENT_OF[sign];
    var iso = year ? year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') : null;
    var ageYears = iso ? (Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / (365.25 * 86400000) : null;

    out.innerHTML = '';
    var head = el('div', 'house-row__head');
    head.append(el('p', 'house-row__eyebrow', element + ' sign'), el('h2', 'house-row__title', (name ? name + ' is ' : 'They are ') + (/^[AEIOU]/.test(sign) ? 'an ' : 'a ') + sign));
    out.append(head);
    var grid = el('div', 'gc-grid');

    var piece = pieceFor(sign);
    if (piece.product) {
      var sizes = el('select', 'gc-size');
      sizes.setAttribute('aria-label', 'Size for ' + piece.product.title);
      piece.product.variants.forEach(function (v) {
        sizes.append(new Option(v.size + (v.color ? ', ' + v.color : '') + ' · ' + money(v.price), v.printfulVariantId));
      });
      var note = piece.why ? el('p', 'cart-details__hint', piece.why) : null;
      grid.append(card('The piece', piece.product, [note, sizes]));
    }

    var reading = bySlug(READING);
    if (reading) {
      grid.append(card('The reading', reading, [el('p', 'cart-details__hint', 'A reading for the year ahead from their birthday, written for reflection and read by us before it is sent.')]));
    }

    var certSlug = ageYears !== null && ageYears < 2 ? NEWBORN_CERT : COUPLE_CERT;
    var cert = bySlug(certSlug);
    if (cert) {
      var extra = [];
      if (certSlug === COUPLE_CERT) {
        extra.push(el('p', 'cart-details__hint', 'For two people. Add who they are paired with, or leave it out.'));
        var pn = el('input'); pn.id = 'gc-partner-name'; pn.placeholder = 'Partner’s name'; pn.maxLength = 40;
        var pd = el('input'); pd.id = 'gc-partner-date'; pd.type = 'date'; pd.max = new Date().toISOString().slice(0, 10);
        var l1 = el('label', null, 'Partner’s name'); l1.htmlFor = 'gc-partner-name';
        var l2 = el('label', null, 'Partner’s date of birth'); l2.htmlFor = 'gc-partner-date';
        var wrap = el('div', 'house-form'); wrap.append(l1, pn, l2, pd);
        extra.push(wrap);
      }
      grid.append(card('The certificate', cert, extra));
    }
    out.append(grid);

    var giftBox = el('div', 'house-form gc-gift');
    giftBox.innerHTML = '<label for="gc-note">Gift note (optional)</label><textarea id="gc-note" maxlength="200" rows="3"></textarea>' +
      '<p class="hint">Printed on the packing slip of the piece, and included with the reading and certificate.</p>' +
      '<label for="gc-email">Email the reading and certificate to them (optional)</label><input id="gc-email" type="email" autocomplete="off">' +
      '<p class="hint">Leave empty to receive them yourself and pass them on.</p>';
    var add = el('button', 'soho-btn soho-btn--dark soho-btn--full', 'Add the set to my basket');
    add.type = 'button';
    var status = el('p', 'gc-error'); status.setAttribute('role', 'alert');
    giftBox.append(add, status);
    out.append(giftBox);
    out.hidden = false;
    head.scrollIntoView({ behavior: 'smooth', block: 'start' });

    add.addEventListener('click', function () {
      status.textContent = '';
      var chosen = Array.prototype.filter.call(out.querySelectorAll('.gc-include input'), function (b) { return b.checked; }).map(function (b) { return b.dataset.slug; });
      if (!chosen.length) { status.textContent = 'Choose at least one item.'; return; }
      var needsDate = chosen.some(function (s) { return s === READING || s === certSlug; });
      if (needsDate && !iso) { status.textContent = 'Readings and certificates need the year of birth too. Please add it above.'; return; }
      var person = { name: name || 'The birthday guest', date: iso };
      var added = 0;
      chosen.forEach(function (slug) {
        var p = bySlug(slug);
        if (!p) return;
        if (slug === piece.product.slug) {
          var vid = out.querySelector('.gc-size').value;
          var variant = p.variants.find(function (v) { return v.printfulVariantId === vid; });
          if (window.addToCart && window.addToCart(p.slug, variant.size, 1, p, variant).ok) added += 1;
          return;
        }
        var details = { people: [person] };
        if (slug === COUPLE_CERT) {
          var partnerName = $('#gc-partner-name').value.trim();
          var partnerDate = $('#gc-partner-date').value;
          if (!partnerName || !partnerDate) return; // left out when no partner is given
          details.people.push({ name: partnerName, date: partnerDate });
        }
        var res = window.queueCheckoutItem({ id: p.slug, slug: p.slug, name: p.title, price: p.price, size: 'Standard', quantity: 1, category: p.type, image: p.images[0] });
        if (res && res.ok) {
          try {
            var cart = JSON.parse(localStorage.getItem('cart') || '[]');
            var line = cart.find(function (i) { return (i.slug || i.id) === p.slug; });
            if (line) { line.details = details; line.personalisation = p.personalisation; }
            localStorage.setItem('cart', JSON.stringify(cart));
          } catch (e2) { /* storage blocked */ }
          added += 1;
        }
      });
      try {
        localStorage.setItem('lyrion_gift', JSON.stringify({ note: $('#gc-note').value.slice(0, 200), recipient: $('#gc-email').value.trim() }));
      } catch (e3) { /* storage blocked */ }
      if (!added) { status.textContent = 'Nothing could be added. For the certificate, add the partner’s name and date, or untick it.'; return; }
      location.href = '/cart';
    });
  }

  function start() {
    fillSelects();
    window.LyrionHouse.load().then(function (c) {
      ctx = c;
      $('#gc-form').addEventListener('submit', render);
      var q = new URLSearchParams(location.search);
      if (q.get('day') && q.get('month')) render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
