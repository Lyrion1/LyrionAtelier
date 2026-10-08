/*
 * Lyrīon house rules: how data/house.json (written by the house engine) and
 * data/catalogue.json (the product list) combine into what the site shows.
 *
 * This file is the single implementation of those rules. The browser loads it
 * as a plain script (window.LyrionHouseCore); the CI checks and the build
 * scripts load it with require(). Keep it free of DOM and network code.
 */
(function (root) {
  'use strict';

  var SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  var ELEMENT_OF = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water'
  };
  var CAMPAIGN_KEYS = ['retrograde-edit', 'spring-equinox', 'summer-solstice', 'autumn-equinox', 'winter-solstice'];
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  // Display order of a product's house state. Lower comes first.
  var STATE_RANK = { lead: 0, on_show: 1, last_chance: 2, core: 3, open: 3, retired: 4 };

  function isSign(value) {
    return typeof value === 'string' && SIGNS.indexOf(value) !== -1;
  }

  function signList(value) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) return null;
    for (var i = 0; i < value.length; i += 1) {
      if (!isSign(value[i])) return null;
    }
    return value.slice();
  }

  function validDate(value) {
    if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
    var d = new Date(value + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }

  /**
   * Read the engine's house.json. Anything that is not a usable house comes
   * back as { valid: false }, which every caller treats as "show everything
   * exactly as before the house existed". A single bad campaign entry is
   * dropped on its own; it never invalidates the seasonal state.
   */
  function normaliseHouse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { valid: false, reason: 'not an object' };
    if (!isSign(raw.lead_sign)) return { valid: false, reason: 'lead_sign is not one of the twelve signs' };
    var onShow = signList(raw.on_show);
    var lastChance = signList(raw.last_chance);
    var retired = signList(raw.retired_until_next_season);
    if (!onShow) return { valid: false, reason: 'on_show must be a list of sign names' };
    if (!lastChance) return { valid: false, reason: 'last_chance must be a list of sign names' };
    if (!retired) return { valid: false, reason: 'retired_until_next_season must be a list of sign names' };
    if (onShow.indexOf(raw.lead_sign) === -1) onShow.unshift(raw.lead_sign);

    var campaigns = [];
    (Array.isArray(raw.campaigns) ? raw.campaigns : []).forEach(function (c) {
      if (!c || typeof c !== 'object') return;
      if (CAMPAIGN_KEYS.indexOf(c.key) === -1) return;
      if (!validDate(c.start) || !validDate(c.end) || c.end < c.start) return;
      campaigns.push({
        key: c.key,
        title: typeof c.title === 'string' && c.title.trim() ? c.title.trim() : '',
        start: c.start,
        end: c.end
      });
    });

    return {
      valid: true,
      updated: typeof raw.updated === 'string' ? raw.updated : null,
      lead_sign: raw.lead_sign,
      on_show: onShow,
      last_chance: lastChance,
      retired: retired,
      campaigns: campaigns
    };
  }

  /**
   * The house state of one product.
   *   open        no valid house: behave exactly as before the house existed
   *   core        never seasonal: core pieces, readings, certificates
   *   lead        the lead sign's own pieces
   *   on_show     a sign the engine has put on show
   *   last_chance a sign in its final week
   *   retired     any other sign. The engine lists only the signs it has just
   *               retired, so a sign it does not mention is out of season too.
   */
  function productState(product, house) {
    if (!house || !house.valid) return 'open';
    if (!product || product.seasonal !== true || !isSign(product.sign)) return 'core';
    if (product.sign === house.lead_sign) return 'lead';
    if (house.on_show.indexOf(product.sign) !== -1) return 'on_show';
    if (house.last_chance.indexOf(product.sign) !== -1) return 'last_chance';
    return 'retired';
  }

  /** Whether the product can be added to a basket right now. */
  function isPurchasable(product, house) {
    if (!product || product.listed !== true) return false;
    if (product.fulfilment === 'enquiry') return false;
    return productState(product, house) !== 'retired';
  }

  /**
   * Order a list for display. With a valid house: the lead sign first, then
   * the other signs on show, last chance, the core collection, and the
   * retired signs at the end. Without one the incoming order is kept.
   * The sort is stable, so the catalogue's own order decides ties.
   */
  function rank(products, house) {
    var list = Array.isArray(products) ? products.slice() : [];
    if (!house || !house.valid) return list;
    return list
      .map(function (p, i) { return { p: p, i: i, r: STATE_RANK[productState(p, house)] }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (x) { return x.p; });
  }

  /** Today's date in London, where the business is run, as YYYY-MM-DD. */
  function todayISO(now) {
    var date = now instanceof Date ? now : new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(date);
    } catch (e) {
      return date.toISOString().slice(0, 10);
    }
  }

  /** Campaigns running today (start and end days included). */
  function activeCampaigns(house, today) {
    if (!house || !house.valid) return [];
    var day = today || todayISO();
    return house.campaigns.filter(function (c) { return c.start <= day && day <= c.end; });
  }

  function signFromBirthDate(month, day) {
    var m = Number(month);
    var d = Number(day);
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    // Tropical zodiac boundaries, the convention the rest of the site uses.
    var edges = [
      [1, 20, 'Capricorn', 'Aquarius'], [2, 19, 'Aquarius', 'Pisces'], [3, 21, 'Pisces', 'Aries'],
      [4, 20, 'Aries', 'Taurus'], [5, 21, 'Taurus', 'Gemini'], [6, 21, 'Gemini', 'Cancer'],
      [7, 23, 'Cancer', 'Leo'], [8, 23, 'Leo', 'Virgo'], [9, 23, 'Virgo', 'Libra'],
      [10, 23, 'Libra', 'Scorpio'], [11, 22, 'Scorpio', 'Sagittarius'], [12, 22, 'Sagittarius', 'Capricorn']
    ];
    var row = edges[m - 1];
    return d < row[1] ? row[2] : row[3];
  }

  var api = {
    SIGNS: SIGNS,
    ELEMENT_OF: ELEMENT_OF,
    CAMPAIGN_KEYS: CAMPAIGN_KEYS,
    isSign: isSign,
    validDate: validDate,
    normaliseHouse: normaliseHouse,
    productState: productState,
    isPurchasable: isPurchasable,
    rank: rank,
    todayISO: todayISO,
    activeCampaigns: activeCampaigns,
    signFromBirthDate: signFromBirthDate
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LyrionHouseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
