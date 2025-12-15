window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

function loadProduct() {
  if (typeof products === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  const product = products.find(p => p.id === id) || products[0];
  if (!product) return;

  document.title = `${product.name} | Lyrīon Atelier`;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-description').textContent = product.description;
  document.getElementById('product-price').textContent = `$${product.price.toFixed(2)}`;
  document.getElementById('product-pill').textContent = `${product.category} • ${(product.zodiac || '').toUpperCase()}`;

  const imageWrap = document.getElementById('product-image');
  if (imageWrap) {
    imageWrap.innerHTML = product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : '<div class="placeholder">✨</div>';
  }

  const sizeSelector = document.getElementById('size-selector');
  if (sizeSelector) {
    sizeSelector.innerHTML = '';
    product.sizes.forEach(size => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'size-option';
      btn.textContent = size;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-option').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
      });
      sizeSelector.appendChild(btn);
    });
    const firstSize = sizeSelector.querySelector('.size-option');
    if (firstSize) firstSize.classList.add('active');
  }

  const addBtn = document.getElementById('add-to-cart-btn');
  const canAddToCart = typeof addToCart === 'function';
  if (!canAddToCart) {
    console.error('addToCart is not available on the product page.');
  }
  if (addBtn && canAddToCart) {
    addBtn.addEventListener('click', () => addToCart(product.id));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadProduct();
});
