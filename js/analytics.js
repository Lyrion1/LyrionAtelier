/**
 * Lyrion Atelier - Shared Analytics
 * GA4 Measurement ID: G-L6Q3SYJ91M
 * Google Consent Mode v2 + full e-commerce event set
 * Must be loaded before gtag.js on every page.
 */
(function () {
  'use strict';

  var GA4_ID = 'G-L6Q3SYJ91M';
  var CONSENT_KEY = 'la_consent';
  var PURCHASE_FIRED_KEY = 'la_purchase_fired';

  /* -------------------------------------------------------
   * 1. Consent Mode v2 - defaults BEFORE any gtag() call
   * ----------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function getStoredConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch (e) { return null; }
  }

  function applyConsent(granted) {
    var state = granted
      ? { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', functionality_storage: 'granted', personalization_storage: 'granted', security_storage: 'granted' }
      : { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', functionality_storage: 'denied', personalization_storage: 'denied', security_storage: 'granted' };
    gtag('consent', 'update', state);
  }

  /* Default: everything denied until user chooses */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });

  /* Restore prior consent immediately if already given */
  var stored = getStoredConsent();
  if (stored !== null) {
    applyConsent(stored);
  }

  /* -------------------------------------------------------
   * 2. Load gtag.js and init GA4
   * ----------------------------------------------------- */
  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: true });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(script);

  /* -------------------------------------------------------
   * 3. Helper - build GA4 item object from cart item
   * ----------------------------------------------------- */
  function toItem(cartItem, index) {
    return {
      item_id: String(cartItem.id || cartItem.slug || ''),
      item_name: cartItem.name || '',
      item_category: cartItem.category || '',
      price: Number(cartItem.price) || 0,
      quantity: Number(cartItem.quantity) || 1,
      currency: 'GBP',
      index: index || 0
    };
  }

  function cartValue(cart) {
    return (cart || []).reduce(function (s, i) {
      return s + (Number(i.price) || 0) * (Number(i.quantity) || 1);
    }, 0);
  }

  /* -------------------------------------------------------
   * 4. E-commerce event helpers (observer pattern -
   *    attaches to cart events, never modifies cart logic)
   * ----------------------------------------------------- */

  /* view_item_list - fired when shop grid renders */
  window.la_track_view_item_list = function (items, listName) {
    if (!items || !items.length) return;
    gtag('event', 'view_item_list', {
      item_list_name: listName || 'Shop',
      items: items.map(toItem),
      currency: 'GBP'
    });
  };

  /* view_item - fired on product page load */
  window.la_track_view_item = function (item) {
    if (!item) return;
    gtag('event', 'view_item', {
      currency: 'GBP',
      value: Number(item.price) || 0,
      items: [toItem(item)]
    });
  };

  /* add_to_cart - listen to cart:updated and diff previous state */
  var _prevCart = [];
  document.addEventListener('cart:updated', function (e) {
    var newCart = (e && e.detail && e.detail.cart) || [];
    /* Detect added items */
    newCart.forEach(function (newItem, idx) {
      var oldItem = _prevCart.find(function (o) {
        return String(o.id) === String(newItem.id) && (o.size || '') === (newItem.size || '');
      });
      var oldQty = oldItem ? (Number(oldItem.quantity) || 1) : 0;
      var newQty = Number(newItem.quantity) || 1;
      if (newQty > oldQty) {
        gtag('event', 'add_to_cart', {
          currency: 'GBP',
          value: (Number(newItem.price) || 0) * (newQty - oldQty),
          items: [Object.assign({}, toItem(newItem, idx), { quantity: newQty - oldQty })]
        });
      }
    });
    /* Detect removed items */
    _prevCart.forEach(function (oldItem, idx) {
      var newItem = newCart.find(function (n) {
        return String(n.id) === String(oldItem.id) && (n.size || '') === (oldItem.size || '');
      });
      var oldQty = Number(oldItem.quantity) || 1;
      var newQty = newItem ? (Number(newItem.quantity) || 1) : 0;
      if (newQty < oldQty) {
        gtag('event', 'remove_from_cart', {
          currency: 'GBP',
          value: (Number(oldItem.price) || 0) * (oldQty - newQty),
          items: [Object.assign({}, toItem(oldItem, idx), { quantity: oldQty - newQty })]
        });
      }
    });
    _prevCart = newCart.map(function (i) { return Object.assign({}, i); });
  });

  /* view_cart - fired when cart page or drawer is opened */
  window.la_track_view_cart = function (cart) {
    if (!cart) return;
    gtag('event', 'view_cart', {
      currency: 'GBP',
      value: cartValue(cart),
      items: cart.map(toItem)
    });
  };

  /* begin_checkout */
  window.la_track_begin_checkout = function (cart) {
    if (!cart) return;
    gtag('event', 'begin_checkout', {
      currency: 'GBP',
      value: cartValue(cart),
      items: cart.map(toItem)
    });
  };

  /* add_payment_info */
  window.la_track_add_payment_info = function (cart, paymentType) {
    if (!cart) return;
    gtag('event', 'add_payment_info', {
      currency: 'GBP',
      value: cartValue(cart),
      payment_type: paymentType || 'card',
      items: cart.map(toItem)
    });
  };

  /* purchase - called once from success.html with real order data */
  window.la_track_purchase = function (transactionId, value, items) {
    var firedKey = PURCHASE_FIRED_KEY + '_' + transactionId;
    if (sessionStorage.getItem(firedKey)) return; /* no double-fire on refresh */
    sessionStorage.setItem(firedKey, '1');
    gtag('event', 'purchase', {
      transaction_id: transactionId,
      currency: 'GBP',
      value: value,
      items: (items || []).map(toItem)
    });
  };

  /* -------------------------------------------------------
   * 5. Custom events
   * ----------------------------------------------------- */
  window.la_track_reading_started = function (readingName) {
    gtag('event', 'reading_started', { reading_name: readingName || '' });
  };
  window.la_track_reading_completed = function (readingName) {
    gtag('event', 'reading_completed', { reading_name: readingName || '' });
  };
  window.la_track_certificate_requested = function (certType) {
    gtag('event', 'certificate_requested', { certificate_type: certType || '' });
  };
  window.la_track_newsletter_signup = function (location) {
    gtag('event', 'newsletter_signup', { signup_location: location || '' });
  };

  /* -------------------------------------------------------
   * 6. Initialise prev-cart from localStorage so diffs
   *    are accurate if cart was already populated
   * ----------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      var raw = localStorage.getItem('cart');
      _prevCart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(_prevCart)) _prevCart = [];
    } catch (e) { _prevCart = []; }
  });

  /* -------------------------------------------------------
   * 7. Cookie Consent Banner
   * ----------------------------------------------------- */
  function buildBanner() {
    if (document.getElementById('la-consent-banner')) return;

    var style = document.createElement('style');
    style.id = 'la-consent-style';
    style.textContent = [
      '#la-consent-banner{',
      'position:fixed;bottom:0;left:0;right:0;z-index:99999;',
      'background:#0a1628;border-top:2px solid #c9a84c;',
      'padding:16px 20px;display:flex;align-items:center;',
      'justify-content:space-between;gap:12px;flex-wrap:wrap;',
      'font-family:Georgia,serif;font-size:14px;color:#f0e6c8;',
      'box-shadow:0 -4px 24px rgba(0,0,0,.55);',
      '}',
      '#la-consent-banner p{margin:0;flex:1 1 200px;line-height:1.5;}',
      // inline-block so the 44px touch height actually applies: min-height
      // is ignored on a plain inline box, which left this link 16px tall.
      '#la-consent-banner a{color:#c9a84c;text-underline-offset:3px;',
      'display:inline-block;min-height:44px;line-height:44px;}',
      '#la-consent-banner a:hover{color:#f0e6c8;}',
      '.la-consent-btns{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}',
      '.la-consent-btns button{',
      'min-height:44px;min-width:88px;padding:10px 20px;',
      'border:none;border-radius:6px;cursor:pointer;',
      'font-family:Georgia,serif;font-size:14px;font-weight:600;',
      'letter-spacing:.5px;',
      '}',
      '#la-consent-accept{background:#c9a84c;color:#0a1628;}',
      '#la-consent-accept:hover{background:#e2b959;}',
      '#la-consent-reject{background:transparent;color:#c9a84c;border:1.5px solid #c9a84c;}',
      '#la-consent-reject:hover{background:rgba(201,168,76,.1);}',
      '@media(max-width:480px){',
      '#la-consent-banner{padding:14px 14px 20px;bottom:0;}',
      '.la-consent-btns{width:100%;justify-content:stretch;}',
      '.la-consent-btns button{flex:1;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.id = 'la-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = [
      '<p>We use cookies to understand how you use our site and to serve relevant content.',
      ' See our <a href="/privacy-policy">Privacy Policy</a> for details.</p>',
      '<div class="la-consent-btns">',
      '<button id="la-consent-reject" aria-label="Reject optional cookies">Reject</button>',
      '<button id="la-consent-accept" aria-label="Accept all cookies">Accept</button>',
      '</div>'
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('la-consent-accept').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'true');
      applyConsent(true);
      banner.remove();
      document.getElementById('la-consent-style') && document.getElementById('la-consent-style').remove();
    });
    document.getElementById('la-consent-reject').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'false');
      applyConsent(false);
      banner.remove();
      document.getElementById('la-consent-style') && document.getElementById('la-consent-style').remove();
    });
  }

  if (stored === null) {
    /* No prior decision - show banner once DOM is ready */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildBanner);
    } else {
      buildBanner();
    }
  }
})();
