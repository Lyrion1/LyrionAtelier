/*
 * Lyrīon house runtime for the browser.
 *
 * Loads data/catalogue.json (every product) and data/house.json (what the
 * house engine has decided), and gives the page scripts one shared answer to
 * "what is on show, what is leaving, what can be bought". The rules live in
 * js/house-core.js, which this file includes so a page only needs one tag:
 *
 *   <script src="/js/house.js"></script>
 *
 * house.json and the other engine files may be absent or malformed at any
 * time. When they are, LyrionHouse reports house.valid === false and every
 * caller renders the site exactly as it was before the house existed.
 */
(function () {
  'use strict';

  var CATALOGUE_URL = '/data/catalogue.json';
  var HOUSE_URL = '/data/house.json';
  var CAMPAIGNS_URL = '/data/campaigns.json';

  function loadCore() {
    if (window.LyrionHouseCore) return Promise.resolve(window.LyrionHouseCore);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/js/house-core.js';
      s.onload = function () { resolve(window.LyrionHouseCore); };
      s.onerror = function () { reject(new Error('house-core failed to load')); };
      document.head.appendChild(s);
    });
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /**
   * The shape the existing renderers (shop grid, product page, gift page,
   * cart) were written against. Derived here from the catalogue so the
   * catalogue stays the only place a price or a variant id is written.
   */
  function toLegacy(p, core, house) {
    var variants = (p.variants || []).map(function (v) {
      var options = { size: v.size };
      if (v.color) options.color = v.color;
      return {
        size: v.size,
        color: v.color || null,
        options: options,
        price: v.price_gbp,
        currency: 'GBP',
        printfulVariantId: v.printful_variant_id || null,
        sku: v.sku || null,
        inStock: true
      };
    });
    var sizes = [];
    variants.forEach(function (v) { if (v.size && sizes.indexOf(v.size) === -1) sizes.push(v.size); });
    var min = p.price_gbp ? p.price_gbp.min : null;
    var max = p.price_gbp ? p.price_gbp.max : null;
    var state = core.productState(p, house);
    var out = {};
    Object.keys(p).forEach(function (k) { out[k] = p[k]; });
    out.id = p.slug;
    out.name = p.title;
    out.zodiac = p.sign ? p.sign.toLowerCase() : null;
    out.zodiacSign = out.zodiac;
    out.element = p.element ? p.element.toLowerCase() : null;
    out.meta = { category: p.category || '', collection: p.collection || '', zodiac: p.sign || 'None' };
    out.state = { published: p.listed === true, ready: p.listed === true };
    out.price = min;
    out.price_range = { min: min, max: max, currency: 'GBP' };
    out.currency = 'GBP';
    out.mainImage = (p.images || [])[0] || null;
    out.image = out.mainImage;
    out.variants = variants;
    out.options = { size: sizes };
    out.printfulProduct = p.printful ? p.printful.product : null;
    out.houseState = state;
    out.purchasable = core.isPurchasable(p, house);
    return out;
  }

  var loading = null;

  /**
   * Resolve once with { core, house, catalogue, products, campaigns, today }.
   * products is the catalogue in legacy shape, ranked for the house.
   */
  function load() {
    if (loading) return loading;
    loading = loadCore().then(function (core) {
      return Promise.all([getJSON(CATALOGUE_URL), getJSON(HOUSE_URL), getJSON(CAMPAIGNS_URL)]).then(function (res) {
        var catalogue = res[0] && Array.isArray(res[0].products) ? res[0].products : [];
        var house = core.normaliseHouse(res[1]);
        if (!house.valid && res[1] !== null) {
          console.warn('[house] data/house.json ignored:', house.reason);
        }
        var products = core.rank(catalogue, house).map(function (p) { return toLegacy(p, core, house); });
        var ctx = {
          core: core,
          house: house,
          catalogue: catalogue,
          products: products,
          campaigns: res[2] && typeof res[2] === 'object' ? res[2] : {},
          today: core.todayISO()
        };
        window.LyrionAtelier = window.LyrionAtelier || {};
        window.LyrionAtelier.house = ctx;
        return ctx;
      });
    }).catch(function (err) {
      console.warn('[house] could not load', err);
      return { core: null, house: { valid: false }, catalogue: [], products: [], campaigns: {}, today: null };
    });
    return loading;
  }

  var LABELS = {
    lead: 'On show',
    on_show: 'On show',
    last_chance: 'Last chance',
    retired: 'Returns with the season'
  };

  /** Put the house label on a product card and, if retired, take away buying. */
  function decorateCard(card, product) {
    if (!card || !product) return card;
    var state = product.houseState;
    card.dataset.houseState = state || 'open';
    var label = LABELS[state];
    if (!label) return card;
    var tag = document.createElement('p');
    tag.className = 'house-label house-label--' + state.replace('_', '-');
    tag.textContent = label;
    var body = card.querySelector('.product-card__body, .product-card-content');
    if (body) body.insertBefore(tag, body.firstChild);
    else card.insertBefore(tag, card.querySelector('h3') || null);
    if (state === 'retired') {
      card.querySelectorAll('.add-to-cart-btn, [data-add-to-cart]').forEach(function (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      });
    }
    return card;
  }

  function seasonHeading(house) {
    return house.lead_sign + ' season';
  }

  /**
   * Render products into labelled rows inside the grid `container`:
   *   On show (lead sign first), Last chance, The core collection,
   *   Returns with the season.
   * The rows are flat: each row's heading spans the full width of the
   * existing grid and its cards follow it, so the shop's own grid and card
   * styles apply unchanged. `createCard(product)` must return a card
   * element. Rows with nothing in them are left out. Returns the number of
   * products rendered.
   */
  function renderRows(container, products, ctx, createCard, options) {
    var opts = options || {};
    var house = ctx.house;
    var groups = { show: [], last: [], core: [], retired: [] };
    products.forEach(function (p) {
      if (p.houseState === 'lead' || p.houseState === 'on_show') groups.show.push(p);
      else if (p.houseState === 'last_chance') groups.last.push(p);
      else if (p.houseState === 'retired') groups.retired.push(p);
      else groups.core.push(p);
    });
    var others = house.on_show.filter(function (s) { return s !== house.lead_sign; });
    var rows = [
      {
        key: 'show',
        eyebrow: 'On show',
        title: seasonHeading(house),
        note: others.length ? 'With ' + others.join(' and ') + ', arriving for the season ahead.' : ''
      },
      { key: 'last', eyebrow: 'Last chance', title: 'Leaving with the season', note: house.last_chance.join(' and ') + ' pieces, in their final days before they retire until next year.' },
      { key: 'core', eyebrow: 'Always here', title: 'The core collection', note: '' },
      { key: 'retired', eyebrow: 'Returns with the season', title: 'Resting until next season', note: 'These signs return when their season comes round again. They cannot be ordered until then.' }
    ];
    container.innerHTML = '';
    var count = 0;
    rows.forEach(function (row) {
      var items = groups[row.key];
      if (!items.length) return;
      if (opts.skipRetired && row.key === 'retired') return;
      var head = document.createElement('div');
      head.className = 'house-row__head house-row__head--' + row.key;
      var eyebrow = document.createElement('p');
      eyebrow.className = 'house-row__eyebrow';
      eyebrow.textContent = row.eyebrow;
      var h = document.createElement('h2');
      h.className = 'house-row__title';
      h.id = 'house-row-' + row.key;
      h.textContent = row.title;
      head.append(eyebrow, h);
      if (row.note) {
        var note = document.createElement('p');
        note.className = 'house-row__note';
        note.textContent = row.note;
        head.append(note);
      }
      container.append(head);
      items.forEach(function (p) {
        var card = decorateCard(createCard(p), p);
        card.dataset.houseRow = row.key;
        container.append(card);
        count += 1;
      });
    });
    return count;
  }

  /** Campaigns running today, joined with the site's own copy for each key. */
  function liveCampaigns(ctx) {
    if (!ctx.core) return [];
    return ctx.core.activeCampaigns(ctx.house, ctx.today).map(function (c) {
      var copy = ctx.campaigns[c.key] || {};
      return {
        key: c.key,
        title: c.title || copy.title || '',
        start: c.start,
        end: c.end,
        eyebrow: copy.eyebrow || '',
        body: copy.body || '',
        cta: copy.cta || 'Shop the edit',
        href: '/shop?campaign=' + encodeURIComponent(c.key),
        image: copy.image || '',
        image_alt: copy.image_alt || '',
        products: Array.isArray(copy.products) ? copy.products : [],
        sign: copy.sign || null
      };
    });
  }

  /** Whether a product belongs to a campaign's edit. */
  function inCampaign(product, campaign) {
    if (!campaign) return true;
    if (campaign.products.indexOf(product.slug) !== -1) return true;
    return !!campaign.sign && product.sign === campaign.sign;
  }

  /**
   * Product page guard. For a resting (retired) piece the buy buttons are
   * switched off and say so; a last-chance piece gets a short notice. The
   * buttons are re-checked on every click as well, because some product
   * pages rewrite their button text when the size changes.
   */
  function guardProductPage(product, opts) {
    var o = opts || {};
    var buttons = (o.buttons || []).filter(Boolean);
    var anchor = o.anchor || (buttons[0] && buttons[0].parentElement);
    if (!product) return;
    var state = product.houseState;
    var blocked = !product.purchasable;
    var reason = state === 'retired'
      ? { title: 'Returns with the season', text: 'The ' + product.sign + ' collection is resting until its season comes round again, so it cannot be ordered just now.' }
      : (product.fulfilment === 'enquiry'
        ? { title: 'By enquiry', text: 'This piece is made to order on request. Write to us through the contact page and we will reply with timings.' }
        : null);
    if (state === 'last_chance') {
      reason = { title: 'Last chance', text: 'The ' + product.sign + ' season has closed. This piece retires until next year when the week is out.' };
    }
    if (reason && anchor && !document.querySelector('.house-pdp-note')) {
      var note = document.createElement('p');
      note.className = 'house-pdp-note house-pdp-note--' + String(state || 'enquiry').replace('_', '-');
      var strong = document.createElement('strong');
      strong.textContent = reason.title;
      note.append(strong, document.createTextNode(reason.text));
      anchor.parentElement.insertBefore(note, anchor);
    }
    if (!blocked) return;
    var label = reason ? reason.title : 'Unavailable';
    var lock = function (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('data-house-retired', '');
      btn.textContent = label;
    };
    buttons.forEach(function (btn) {
      lock(btn);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        lock(btn);
      }, true);
      new MutationObserver(function () {
        if (btn.textContent !== label || !btn.disabled) lock(btn);
      }).observe(btn, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    });
  }

  /** Find a product in the loaded catalogue by its one slug. */
  function find(ctx, slug) {
    return (ctx.products || []).find(function (p) { return p.slug === slug; }) || null;
  }

  window.LyrionHouse = {
    // Supabase Edge Functions behind checkout, deliveries, the Birthday Book and enquiries.
    FUNCTIONS: 'https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1',
    load: load,
    find: find,
    guardProductPage: guardProductPage,
    toLegacy: toLegacy,
    decorateCard: decorateCard,
    renderRows: renderRows,
    liveCampaigns: liveCampaigns,
    inCampaign: inCampaign,
    LABELS: LABELS
  };
})();
