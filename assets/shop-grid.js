import { isSellable } from '/lib/catalog.js';

async function loadIndex() {
  try {
    const response = await fetch('/data/index.json', { cache: 'no-store' });
    return await response.json();
  } catch {
    return [];
  }
}

async function loadProd(slug) {
  try {
    const response = await fetch(`/data/products/${slug}.json`, { cache: 'no-store' });
    return await response.json();
  } catch {
    return null;
  }
}

function money(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function card(product) {
  const anchor = document.createElement('a');
  anchor.className = 'shop-card';
  anchor.href = '/product/' + product.slug;

  const imgSrc = (product.images || [])[0] || 'https://source.unsplash.com/600x600/?stars,night';
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'shop-img';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = product.title || '';
  img.src = imgSrc;
  imgWrapper.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'shop-meta';

  const title = document.createElement('div');
  title.className = 'shop-title';
  title.textContent = product.title || '';

  const sub = document.createElement('div');
  sub.className = 'shop-sub';
  sub.textContent = (product.collection || '').replace(/-/g, ' ');

  const price = document.createElement('div');
  price.className = 'shop-price';
  const priceValue = product.variants?.[0]?.price;
  price.textContent = Number.isFinite(priceValue) ? money(priceValue) : 'Price unavailable';

  meta.appendChild(title);
  meta.appendChild(sub);
  meta.appendChild(price);

  anchor.appendChild(imgWrapper);
  anchor.appendChild(meta);
  return anchor;
}

async function init() {
  const root = document.getElementById('shop-grid');
  if (!root) return;
  const slugs = await loadIndex();
  const items = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(isSellable);
  root.classList.add('shop-grid');
  items.forEach(p => root.appendChild(card(p)));
}

document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
