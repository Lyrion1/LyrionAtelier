/**
 * One price rule for the whole site.
 *
 * Catalogue amounts are GBP. The browser may show another currency, and
 * create-checkout charges that same currency, but neither side invents a
 * price: both start from catalogue pence, multiply by the rate in
 * data/fx-rates.json, and round the same way.
 *
 * Rounding: GBP is unchanged. Japanese yen rounds to a whole yen. Every
 * other currency rounds to the nearest whole unit, then subtracts 0.01,
 * so a tag ends in .99 (63.50 becomes 63.99, 66.027 becomes 65.99).
 * The checkout function (supabase/functions/_shared/money.ts) is the same
 * rule. It ignores any amount the browser sends.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LyrionMoney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var BASE = 'GBP';
  var ZERO_DECIMAL = { JPY: true };
  var FALLBACK_RATES = {
    GBP: 1,
    USD: 1.27,
    EUR: 1.17,
    CAD: 1.74,
    AUD: 1.94,
    NZD: 2.12,
    JPY: 198,
    CHF: 1.12
  };
  var SHIPPING_FREE_GBP_PENCE = 5000;
  var SHIPPING_COST_GBP_PENCE = 599;
  var rates = Object.assign({}, FALLBACK_RATES);
  var currency = BASE;
  var language = 'en';

  function normaliseCurrency(code) {
    var upper = String(code || BASE).toUpperCase();
    return Object.prototype.hasOwnProperty.call(FALLBACK_RATES, upper) ? upper : BASE;
  }

  function setRates(next) {
    if (!next || typeof next !== 'object') return;
    Object.keys(FALLBACK_RATES).forEach(function (code) {
      if (code === BASE) {
        rates[code] = 1;
        return;
      }
      var n = Number(next[code]);
      if (Number.isFinite(n) && n > 0) rates[code] = n;
    });
  }

  function setLocale(next) {
    if (!next) return;
    if (next.currency) currency = normaliseCurrency(next.currency);
    if (next.language) language = String(next.language || 'en').split(/[-_]/)[0] || 'en';
  }

  function retailMajor(gbpPence, rate) {
    var nearest = Math.round((gbpPence * rate) / 100);
    return Math.max(0.99, nearest - 0.01);
  }

  /**
   * @param {number} gbpPence catalogue pence
   * @param {string} [code]
   * @returns {{ currency: string, major: number, minor: number }}
   */
  function presentmentPence(gbpPence, code) {
    var pence = Math.round(Number(gbpPence));
    var cur = normaliseCurrency(code || currency);
    if (!Number.isFinite(pence) || pence <= 0) {
      return { currency: cur, major: 0, minor: 0 };
    }
    if (cur === BASE) return { currency: cur, major: pence / 100, minor: pence };
    var rate = Number(rates[cur]);
    if (!Number.isFinite(rate) || rate <= 0) rate = 1;
    if (ZERO_DECIMAL[cur]) {
      var yen = Math.round((pence / 100) * rate);
      return { currency: cur, major: yen, minor: yen };
    }
    var major = retailMajor(pence, rate);
    return { currency: cur, major: major, minor: Math.round(major * 100) };
  }

  function penceFromMajor(gbpMajor) {
    var n = Number(gbpMajor);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }

  function formatMajor(major, code, lang) {
    var cur = normaliseCurrency(code || currency);
    var locale = cur === 'GBP' ? 'en-GB' : (lang || language || 'en');
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: cur,
        minimumFractionDigits: ZERO_DECIMAL[cur] ? 0 : 2,
        maximumFractionDigits: ZERO_DECIMAL[cur] ? 0 : 2
      }).format(major);
    } catch (err) {
      return cur + ' ' + Number(major).toFixed(ZERO_DECIMAL[cur] ? 0 : 2);
    }
  }

  function format(gbpMajor, code, lang) {
    var presented = presentmentPence(penceFromMajor(gbpMajor), code);
    return formatMajor(presented.major, presented.currency, lang);
  }

  function formatMinor(minor, code, lang) {
    var cur = normaliseCurrency(code || currency);
    var amount = Math.round(Number(minor) || 0);
    var major = ZERO_DECIMAL[cur] ? amount : amount / 100;
    return formatMajor(major, cur, lang);
  }

  function formatPence(gbpPence, code, lang) {
    var presented = presentmentPence(gbpPence, code);
    return formatMajor(presented.major, presented.currency, lang);
  }

  /**
   * Posted lines are { gbpMajor, qty }. Digital lines are omitted by the caller.
   * Free delivery when the sum of presented line amounts reaches the presented
   * equivalent of £50. That is the figure the banner shows.
   */
  function quoteShipping(lines, code) {
    var cur = normaliseCurrency(code || currency);
    var minor = 0;
    (lines || []).forEach(function (line) {
      var qty = Math.round(Number(line && line.qty) || 0);
      if (qty < 1) return;
      minor += presentmentPence(penceFromMajor(line.gbpMajor), cur).minor * qty;
    });
    var threshold = presentmentPence(SHIPPING_FREE_GBP_PENCE, cur);
    var cost = presentmentPence(SHIPPING_COST_GBP_PENCE, cur);
    if (minor <= 0) return { currency: cur, minor: 0, major: 0, free: true, empty: true, threshold: threshold };
    if (minor >= threshold.minor) return { currency: cur, minor: 0, major: 0, free: true, empty: false, threshold: threshold };
    return { currency: cur, minor: cost.minor, major: cost.major, free: false, empty: false, threshold: threshold };
  }

  function fill(root) {
    var scope = root && root.querySelectorAll ? root : (typeof document !== 'undefined' ? document : null);
    if (!scope) return;
    scope.querySelectorAll('[data-gbp]').forEach(function (el) {
      var amount = Number(el.getAttribute('data-gbp'));
      if (!Number.isFinite(amount)) return;
      var text = format(amount);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      if (el.tagName === 'OPTION') {
        var size = el.getAttribute('data-size') || '';
        var next = size ? (size + ' — ' + text) : (prefix + text + suffix);
        if (el.textContent !== next) el.textContent = next;
        return;
      }
      var combined = prefix + text + suffix;
      if (el.textContent !== combined) el.textContent = combined;
    });
  }

  function loadRates() {
    if (typeof fetch !== 'function') return Promise.resolve(rates);
    return fetch('/data/fx-rates.json', { cache: 'no-cache' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.rates) setRates(data.rates);
        return rates;
      })
      .catch(function () { return rates; });
  }

  return {
    BASE: BASE,
    FALLBACK_RATES: FALLBACK_RATES,
    SHIPPING_FREE_GBP_PENCE: SHIPPING_FREE_GBP_PENCE,
    SHIPPING_COST_GBP_PENCE: SHIPPING_COST_GBP_PENCE,
    normaliseCurrency: normaliseCurrency,
    setRates: setRates,
    setLocale: setLocale,
    getCurrency: function () { return currency; },
    getLanguage: function () { return language; },
    rates: function () { return Object.assign({}, rates); },
    presentmentPence: presentmentPence,
    format: format,
    formatPence: formatPence,
    formatMinor: formatMinor,
    formatPresentment: function (presented, lang) {
      return formatMajor(presented.major, presented.currency, lang);
    },
    quoteShipping: quoteShipping,
    fill: fill,
    loadRates: loadRates
  };
});
