console.log('Shop page script loaded');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

let currentProducts = [];
let currentProduct = null;
let selectedVariant = null;

function renderProducts() {
  const grid = document.getElementById('products-grid-local');
  if (!grid || !Array.isArray(window.products)) return;
  const category = document.getElementById('filter-category')?.value || 'all';
  const zodiac = document.getElementById('filter-zodiac')?.value || 'all';
  grid.innerHTML = '';

  window.products
    .filter(p => p.category !== 'oracle' && (category === 'all' || p.category === category) && (zodiac === 'all' || p.zodiac === zodiac))
    .forEach(product => {
      const card = document.createElement('div');
      card.className = 'card product-card';
      card.dataset.kind = 'product';

      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'card__image';
      if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = product.name;
        img.loading = 'lazy';
        imageWrapper.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = '✨';
        imageWrapper.appendChild(placeholder);
      }

      const infoWrapper = document.createElement('div');
      infoWrapper.className = 'card__body';
      const title = document.createElement('h3');
      title.className = 'card__title';
      title.textContent = product.name;
      const desc = document.createElement('p');
      desc.className = 'card__desc muted';
      desc.textContent = product.description;
      const price = document.createElement('p');
      price.className = 'card__price price';
      price.textContent = `$${product.price.toFixed(2)}`;

      const buttonRow = document.createElement('div');
      buttonRow.className = 'card__actions button-row tight';

      const viewLink = document.createElement('a');
      viewLink.className = 'btn btn-outline';
      viewLink.href = `product.html?id=${product.id}`;
      viewLink.textContent = 'View';

      const buyButton = document.createElement('button');
      buyButton.className = 'btn btn-primary product-buy-btn';
      buyButton.type = 'button';
      buyButton.setAttribute('data-name', product.name);
      buyButton.setAttribute('data-price', product.price.toFixed(2));
      buyButton.textContent = 'Buy Now';

      buttonRow.append(viewLink, buyButton);
      infoWrapper.append(title, desc, price, buttonRow);
      card.append(imageWrapper, infoWrapper);
      grid.appendChild(card);
    });
}

// Load products from Printful
async function loadPrintfulProducts() {
  const loadingEl = document.getElementById('products-loading');
  const gridEl = document.getElementById('shopGrid');
  const errorEl = document.getElementById('products-error');
  
  try {
    const response = await fetch('/.netlify/functions/printful-sync');
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      currentProducts = data.products;
      loadingEl.style.display = 'none';
      gridEl.style.display = 'grid';
      
      gridEl.innerHTML = '';
      data.products.forEach(product => {
        const safeProductId = escapeHtml(String(product.id || ''));
        const cardButton = document.createElement('button');
        cardButton.type = 'button';
        cardButton.className = 'card product-card product-card-button';
        cardButton.setAttribute('aria-label', `View options for ${escapeHtml(product.name)}`);
        cardButton.dataset.productId = safeProductId;
        cardButton.dataset.kind = 'product';
        cardButton.innerHTML = `
          <div class="card__image">
            <img src="${escapeHtml(product.thumbnail)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeHtml(product.name)}</h3>
            <p class="card__desc">${escapeHtml(product.description)}</p>
            <div class="card__price">${escapeHtml(product.priceRange)}</div>
          </div>
          <div class="card__actions">
            <span class="product-btn btn btn-primary">View Options</span>
          </div>
        `;
        cardButton.addEventListener('click', () => openProductModal(product.id));
        gridEl.appendChild(cardButton);
      });
    } else {
      throw new Error('No products found');
    }
    
  } catch (error) {
    console.error('Error loading products:', error);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
  }
}

// Open product detail modal
function openProductModal(productId) {
  currentProduct = currentProducts.find(p => String(p.id) === String(productId));
  if (!currentProduct) return;
  
  document.getElementById('modal-product-name').textContent = currentProduct.name;
  document.getElementById('modal-product-description').textContent = currentProduct.description;
  document.getElementById('modal-product-price').textContent = currentProduct.priceRange;
  document.getElementById('modal-product-image').src = currentProduct.thumbnail;
  
  // Populate size selector
  const sizeSelector = document.getElementById('size-selector');
  sizeSelector.innerHTML = '<option value="">Select size</option>' + 
    currentProduct.sizes.map(size => {
      const safeSize = escapeHtml(size);
      return `<option value="${safeSize}">${safeSize}</option>`;
    }).join('');
  
  // Populate color selector
  const colorSelector = document.getElementById('color-selector');
  colorSelector.innerHTML = '<option value="">Select color</option>' + 
    currentProduct.colors.map(color => {
      const safeColor = escapeHtml(color);
      return `<option value="${safeColor}">${safeColor}</option>`;
    }).join('');
  
  // Reset selections
  selectedVariant = null;
  const addBtn = document.getElementById('add-to-cart-btn');
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = 'Add to Cart - $0.00';
    addBtn.removeAttribute('data-name');
    addBtn.removeAttribute('data-price');
    addBtn.removeAttribute('data-variant-id');
  }
  document.getElementById('variant-status').textContent = '';
  
  // Show modal
  document.getElementById('product-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  document.body.style.overflow = 'auto';
  selectedVariant = null;
}

function setVariantStatus(message, statusClass) {
  const statusEl = document.getElementById('variant-status');
  statusEl.textContent = message;
  statusEl.className = `variant-status ${statusClass}`;
}

function formatPrice(price) {
  if (!Number.isFinite(price)) return null;
  return `$${price.toFixed(2)}`;
}

// Update variant when size/color changes
function updateVariant() {
  const selectedSize = document.getElementById('size-selector').value;
  const selectedColor = document.getElementById('color-selector').value;
  const addBtn = document.getElementById('add-to-cart-btn');
  
  if (!selectedSize || !selectedColor) {
    selectedVariant = null;
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = 'Select options';
      addBtn.removeAttribute('data-name');
      addBtn.removeAttribute('data-price');
      addBtn.removeAttribute('data-variant-id');
    }
    setVariantStatus('', '');
    return;
  }
  
  // Find matching variant
  selectedVariant = currentProduct?.variants.find(v => 
    v.size === selectedSize && v.color === selectedColor
  );
  
  if (selectedVariant) {
    document.getElementById('modal-product-image').src = selectedVariant.image;
    const priceValue = parseFloat(selectedVariant.price);
    const formattedPrice = formatPrice(priceValue);
    if (!formattedPrice) {
      setVariantStatus('Pricing unavailable for this option', 'status-unavailable');
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = 'Unavailable';
      }
      return;
    }
    const variantId = selectedVariant.id || selectedVariant.variant_id;
    const productName = `${currentProduct.name} - ${selectedVariant.size}${selectedVariant.color ? ` / ${selectedVariant.color}` : ''}`;
    if (addBtn) {
      addBtn.textContent = `Buy Now - ${formattedPrice}`;
      addBtn.disabled = !selectedVariant.inStock;
      addBtn.setAttribute('data-name', productName);
      addBtn.setAttribute('data-price', priceValue.toFixed(2));
      if (variantId) {
        addBtn.setAttribute('data-variant-id', variantId);
      } else {
        addBtn.removeAttribute('data-variant-id');
      }
    }
    
    if (selectedVariant.inStock) {
      setVariantStatus('✓ In Stock', 'status-available');
    } else {
      setVariantStatus('Out of Stock', 'status-unavailable');
    }
  } else {
    setVariantStatus('Combination not available', 'status-unavailable');
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = 'Unavailable';
      addBtn.removeAttribute('data-name');
      addBtn.removeAttribute('data-price');
      addBtn.removeAttribute('data-variant-id');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  document.getElementById('filter-category')?.addEventListener('change', renderProducts);
  document.getElementById('filter-zodiac')?.addEventListener('change', renderProducts);
  renderProducts();

  loadPrintfulProducts();

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', closeProductModal);
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeProductModal);

  document.getElementById('size-selector')?.addEventListener('change', updateVariant);
  document.getElementById('color-selector')?.addEventListener('change', updateVariant);
});
