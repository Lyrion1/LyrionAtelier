// Lyrīon Atelier — homepage product grid and campaign feature.
// Renders into #featured-grid using the same .product-card markup as
// js/shop-page.js's createCard(), so it inherits the shop grid's CSS and JS
// contracts. With a live house it shows the lead sign's pieces first, then the
// other signs on show and the last-chance pieces, each labelled. Without one
// it shows the first published pieces, as it always has.
const GRID_SELECTOR = '[data-featured-grid]';
const FEATURED_COUNT = 8;
const SHOP_TYPES = ['apparel', 'accessory', 'home', 'mystery-box'];

function resolveImage(product) {
  return product.mainImage || (Array.isArray(product.images) ? product.images[0] : null) || '/assets/catalog/placeholder.webp';
}

function priceLabel(product) {
  const min = Number(product.price_range?.min ?? product.price);
  if (!Number.isFinite(min) || min <= 0) return '';
  // "$" plus the base (GBP) amount is the site's price token: js/main.js
  // rewrites it into the shopper's own currency, as on every other page.
  return `From $${min.toFixed(2)}`;
}

function createCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.id = product.slug;
  card.dataset.slug = product.slug;

  const img = document.createElement('img');
  img.className = 'product-card-image';
  img.src = resolveImage(product);
  img.alt = product.title || 'Lyrīon Atelier product';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 1200;
  img.height = 1500;

  const body = document.createElement('div');
  body.className = 'product-card-content product-card__body';

  const heading = document.createElement('h3');
  heading.className = 'product-card-title product-card__title';
  heading.textContent = product.title || 'Product';

  const priceEl = document.createElement('p');
  priceEl.className = 'product-card-price product-card__price price';
  priceEl.textContent = priceLabel(product);

  const actions = document.createElement('div');
  actions.className = 'product-card-buttons product-card__actions';
  const viewLink = document.createElement('a');
  viewLink.className = 'view-product-btn view-product-button product-buy-btn';
  viewLink.textContent = 'View Product';
  viewLink.href = product.link || `/product?slug=${encodeURIComponent(product.slug)}`;
  actions.append(viewLink);

  body.append(heading, priceEl, actions);
  card.append(img, body);
  return card;
}

function renderCampaigns(ctx) {
  const host = document.querySelector('[data-campaign-feature]');
  if (!host) return;
  const live = window.LyrionHouse.liveCampaigns(ctx);
  if (!live.length) {
    host.hidden = true;
    return;
  }
  const campaign = live[0];
  const lead = ctx.products.find((p) => SHOP_TYPES.includes(p.type) && window.LyrionHouse.inCampaign(p, campaign));
  const image = campaign.image || (lead ? resolveImage(lead) : '');
  host.querySelector('[data-campaign-eyebrow]').textContent = campaign.eyebrow;
  host.querySelector('[data-campaign-title]').textContent = campaign.title;
  host.querySelector('[data-campaign-body]').textContent = campaign.body;
  const cta = host.querySelector('[data-campaign-cta]');
  cta.textContent = campaign.cta;
  cta.href = campaign.href;
  const img = host.querySelector('[data-campaign-image]');
  if (image) {
    img.src = image;
    img.alt = campaign.image_alt || (lead ? lead.title : campaign.title);
  } else {
    img.closest('.soho-video')?.remove();
  }
  host.dataset.campaign = campaign.key;
  host.hidden = false;
}

function renderHeading(ctx) {
  const eyebrow = document.querySelector('[data-featured-eyebrow]');
  const title = document.querySelector('[data-featured-title]');
  const note = document.querySelector('[data-featured-note]');
  if (!ctx.house.valid) return;
  if (eyebrow) eyebrow.textContent = 'On show';
  if (title) title.textContent = `${ctx.house.lead_sign} season`;
  if (note) {
    const others = ctx.house.on_show.filter((s) => s !== ctx.house.lead_sign);
    note.textContent = others.length
      ? `${ctx.house.lead_sign} leads, with ${others.join(' and ')} arriving for the season ahead.`
      : `The ${ctx.house.lead_sign} collection leads the house this season.`;
  }
}

// The lead sign's element leads the "Shop by element" grid too.
function orderElements(ctx) {
  const host = document.querySelector('[data-element-grid]');
  if (!host || !ctx.house.valid || !ctx.core) return;
  const element = ctx.core.ELEMENT_OF[ctx.house.lead_sign];
  const first = host.querySelector(`[data-element="${element}"]`);
  if (first) host.prepend(first);
}

async function loadFeaturedProducts() {
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid || !window.LyrionHouse) return;
  try {
    const ctx = await window.LyrionHouse.load();
    renderCampaigns(ctx);
    renderHeading(ctx);
    orderElements(ctx);
    const shopItems = ctx.products.filter((p) => SHOP_TYPES.includes(p.type) && p.state.published);
    const featured = ctx.house.valid
      ? shopItems.filter((p) => ['lead', 'on_show', 'last_chance'].includes(p.houseState)).slice(0, FEATURED_COUNT)
      : shopItems.slice(0, FEATURED_COUNT);
    // A house with nothing yet made for its signs still shows the core pieces.
    const list = featured.length ? featured : shopItems.filter((p) => p.houseState === 'core').slice(0, FEATURED_COUNT);
    if (!list.length) return;
    grid.innerHTML = '';
    list.forEach((product) => grid.append(window.LyrionHouse.decorateCard(createCard(product), product)));
  } catch {
    // Leave the grid empty — the "View All" link above it still works.
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFeaturedProducts);
} else {
  loadFeaturedProducts();
}
