/*
 * Basket extras on /cart:
 *   - the birth details each reading or certificate is written from,
 *   - an optional gift note (printed on the Printful packing slip, and
 *     included with readings and certificates we email),
 *   - an optional email to send readings and certificates straight to,
 *   - a note on any line the catalogue no longer sells.
 * Details are kept with the basket line in localStorage so they survive a
 * reload, and js/checkout-embed.js sends them to create-checkout.
 */
(function () {
  'use strict';

  var CART_KEY = 'cart';
  var GIFT_KEY = 'lyrion_gift';
  var MAX_NOTE = 200;

  var KINDS = {
    person: { people: ['The person this reading is for'], question: true },
    couple: { people: ['First person', 'Second person'] },
    pet: { people: ['Your pet'], species: true, dateLabel: 'Birthday or adoption day' },
    newborn: { people: ['The baby'] }
  };

  function readCart() {
    try { var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; }
  }
  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage full or blocked */ }
  }
  function readGift() {
    try { return JSON.parse(localStorage.getItem(GIFT_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeGift(g) {
    try { localStorage.setItem(GIFT_KEY, JSON.stringify(g)); } catch (e) { /* ignore */ }
  }
  function slugOf(item) { return String(item.slug || item.id || ''); }

  var products = {};

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.append(c); });
    return node;
  }

  function field(id, label, input, hint) {
    var wrap = el('div', { class: 'cart-details__field' });
    wrap.append(el('label', { for: id, text: label }), input);
    if (hint) wrap.append(el('p', { class: 'cart-details__hint', text: hint }));
    return wrap;
  }

  function personFields(prefix, title, person, kind) {
    var cfg = KINDS[kind];
    var set = el('fieldset', { class: 'cart-details__person' });
    set.append(el('legend', { text: title }));
    var name = el('input', { id: prefix + '-name', type: 'text', maxlength: '40', autocomplete: 'off', 'data-key': 'name' });
    name.value = person.name || '';
    var date = el('input', { id: prefix + '-date', type: 'date', min: '1900-01-01', max: new Date().toISOString().slice(0, 10), 'data-key': 'date' });
    date.value = person.date || '';
    set.append(field(prefix + '-name', 'Name', name), field(prefix + '-date', cfg.dateLabel || 'Date of birth', date));
    if (kind !== 'pet') {
      var time = el('input', { id: prefix + '-time', type: 'time', 'data-key': 'time' });
      time.value = person.time || '';
      var place = el('input', { id: prefix + '-place', type: 'text', maxlength: '60', autocomplete: 'off', 'data-key': 'place' });
      place.value = person.place || '';
      set.append(field(prefix + '-time', 'Time of birth (optional)', time), field(prefix + '-place', 'Place of birth (optional)', place));
    }
    return set;
  }

  function renderItem(item, index) {
    var product = products[slugOf(item)];
    var kind = product && product.personalisation;
    if (!kind || !KINDS[kind]) return null;
    var cfg = KINDS[kind];
    var details = item.details || { people: [] };
    var box = el('section', { class: 'cart-details__item', 'data-index': String(index) });
    box.append(el('h3', { text: product.title }));
    box.append(el('p', { class: 'cart-details__hint', text: kind === 'couple'
      ? 'We write this from both birth dates. Times and places are printed on the certificate if you add them.'
      : 'We write this from the birth date below and read it ourselves before it is sent, within 48 hours.' }));
    cfg.people.forEach(function (title, i) {
      box.append(personFields('cd-' + index + '-' + i, title, (details.people || [])[i] || {}, kind));
    });
    if (cfg.species) {
      var species = el('input', { id: 'cd-' + index + '-species', type: 'text', maxlength: '30', 'data-key': 'species', placeholder: 'Cat, dog, horse…' });
      species.value = details.species || '';
      box.append(field('cd-' + index + '-species', 'What kind of animal', species));
    }
    if (cfg.question) {
      var q = el('textarea', { id: 'cd-' + index + '-question', maxlength: '160', rows: '2', 'data-key': 'question' });
      q.value = details.question || '';
      box.append(field('cd-' + index + '-question', 'A theme to reflect on (optional)', q, 'Readings are for reflection and entertainment. They do not predict events or advise on health, money or legal matters.'));
    }
    box.addEventListener('input', function () { save(box, index, kind); });
    return box;
  }

  function save(box, index, kind) {
    var cart = readCart();
    if (!cart[index]) return;
    var people = Array.prototype.map.call(box.querySelectorAll('fieldset'), function (fs) {
      var p = {};
      fs.querySelectorAll('[data-key]').forEach(function (input) { if (input.value) p[input.dataset.key] = input.value.trim(); });
      return p;
    });
    var details = { people: people };
    var species = box.querySelector('[data-key="species"]');
    var question = box.querySelector('[data-key="question"]');
    if (species && species.value.trim()) details.species = species.value.trim();
    if (question && question.value.trim()) details.question = question.value.trim();
    cart[index].details = details;
    cart[index].personalisation = kind;
    writeCart(cart);
  }

  function renderGift(host, hasDigital) {
    var gift = readGift();
    var box = el('section', { class: 'cart-details__item cart-details__gift' });
    box.append(el('h3', { text: 'Sending it as a gift?' }));
    var note = el('textarea', { id: 'gift-note', maxlength: String(MAX_NOTE), rows: '3' });
    note.value = gift.note || '';
    var count = el('p', { class: 'cart-details__hint', 'aria-live': 'polite' });
    var updateCount = function () { count.textContent = (MAX_NOTE - note.value.length) + ' characters left'; };
    updateCount();
    box.append(field('gift-note', 'Gift note (optional)', note, 'Printed on the packing slip of pieces we post, and included with readings and certificates we email.'), count);
    var recipient = null;
    if (hasDigital) {
      recipient = el('input', { id: 'gift-recipient', type: 'email', autocomplete: 'off', maxlength: '200' });
      recipient.value = gift.recipient || '';
      box.append(field('gift-recipient', 'Email the reading or certificate to (optional)', recipient, 'Leave empty to receive it yourself. We send you a copy either way.'));
    }
    box.addEventListener('input', function () {
      updateCount();
      writeGift({ note: note.value.slice(0, MAX_NOTE), recipient: recipient ? recipient.value.trim() : '' });
    });
    host.append(box);
  }

  function render() {
    var host = document.getElementById('cart-details');
    if (!host) return;
    host.innerHTML = '';
    var cart = readCart();
    if (!cart.length) { host.hidden = true; return; }
    host.hidden = false;
    var hasDigital = false;
    cart.forEach(function (item, i) {
      if (!products[slugOf(item)]) {
        host.append(el('p', { class: 'cart-details__stale', text: (item.name || 'One item') + ' is no longer in the collection. Please remove it before checking out.' }));
        return;
      }
      var box = renderItem(item, i);
      if (box) { hasDigital = true; host.append(box); }
    });
    renderGift(host, hasDigital);
  }

  /** Problems that must be fixed before checkout, as sentences. */
  function problems() {
    var out = [];
    readCart().forEach(function (item) {
      var product = products[slugOf(item)];
      if (!product) { out.push((item.name || 'An item') + ' is no longer sold. Please remove it.'); return; }
      var kind = product.personalisation;
      if (!kind) return;
      var people = (item.details && item.details.people) || [];
      var need = KINDS[kind].people.length;
      for (var i = 0; i < need; i += 1) {
        if (!people[i] || !people[i].name || !people[i].date) {
          out.push('Please add the name and date for ' + product.title + '.');
          return;
        }
      }
      if (kind === 'pet' && !(item.details && item.details.species)) out.push('Please say what kind of animal the ' + product.title + ' is for.');
    });
    var gift = readGift();
    if (gift.recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gift.recipient)) out.push('Please check the recipient email address.');
    return out;
  }

  window.LyrionCartDetails = {
    problems: problems,
    gift: readGift,
    render: render
  };

  function start() {
    if (!window.LyrionHouse) return;
    window.LyrionHouse.load().then(function (ctx) {
      (ctx.catalogue || []).forEach(function (p) { products[p.slug] = p; });
      render();
    });
    document.addEventListener('cart:updated', function () {
      if (!document.activeElement || !document.activeElement.closest('#cart-details')) render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
