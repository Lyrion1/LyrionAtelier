window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderFeaturedProducts();
});

function renderFeaturedProducts() {
  if (typeof products === 'undefined') return;
  const catalog = Array.isArray(products) ? products : [];
  const curated = catalog.filter((p) => p.showOnHomepage);
  const bestsellers = catalog.filter((p) => p.isBestseller);
  const primary = curated.length ? curated : (bestsellers.length ? bestsellers : catalog);
  const featured = primary.slice(0, 4);
  if (featured.length < 4) {
    featured.push(...catalog.filter((p) => !featured.includes(p)).slice(0, 4 - featured.length));
  }
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const canAddToCart = typeof addToCart === 'function';
  if (!canAddToCart) {
    console.error('addToCart is not available; cannot bind featured product buttons.');
    return;
  }

  featured.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image">
        ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : `<div class="placeholder">✨</div>`}
      </div>
      <div>
        <h3>${product.name}</h3>
        <p class="muted">${product.description}</p>
        <p class="price">$${product.price.toFixed(2)}</p>
      </div>
      <div class="button-row tight">
        <a class="btn btn-outline" href="product.html?id=${product.id}">View</a>
        <button class="btn btn-primary add-to-cart-btn" type="button">Add to cart</button>
      </div>
    `;
    grid.appendChild(card);

    const addButton = card.querySelector('.add-to-cart-btn');
    if (addButton && canAddToCart) {
      addButton.addEventListener('click', () => addToCart(product.id));
    }
  });
}
