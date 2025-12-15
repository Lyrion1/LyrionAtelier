window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderFeaturedProducts();
  setupOracleWidget();
});

function renderFeaturedProducts() {
  if (typeof products === 'undefined') return;
  const featured = products.slice(0, 4);
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

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
    if (addButton && typeof addToCart === 'function') {
      addButton.addEventListener('click', () => addToCart(product.id));
    }
  });
}

let currentReading = null;

function setupOracleWidget() {
  const widgetTrigger = document.querySelector('.oracle-widget-trigger');
  const closeButton = document.querySelector('.oracle-close');
  const revealButton = document.querySelector('.oracle-submit');
  const bookButton = document.querySelector('.oracle-cta');
  const shareButton = document.querySelector('.oracle-share');
  const resetButton = document.querySelector('.oracle-reset');

  widgetTrigger?.addEventListener('click', toggleOracleWidget);
  closeButton?.addEventListener('click', toggleOracleWidget);
  revealButton?.addEventListener('click', getReading);
  bookButton?.addEventListener('click', bookReading);
  shareButton?.addEventListener('click', shareReading);
  resetButton?.addEventListener('click', resetWidget);
}

function toggleOracleWidget() {
  const panel = document.getElementById('oracle-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function getReading() {
  const birthDateInput = document.getElementById('birth-date');
  const birthDate = birthDateInput?.value;
  if (!birthDate) { alert('Please enter your birth date'); return; }
  const intro = document.getElementById('oracle-intro');
  const loading = document.getElementById('oracle-loading');
  const result = document.getElementById('oracle-result');

  if (intro) intro.style.display = 'none';
  if (loading) loading.style.display = 'block';

  try {
    const response = await fetch('/.netlify/functions/oracle-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate })
    });
    const data = await response.json();
    currentReading = data;

    if (loading) loading.style.display = 'none';
    if (result) result.style.display = 'block';
    const readingText = document.getElementById('reading-text');
    const urgencyMessage = document.getElementById('urgency-message');
    if (readingText) readingText.innerHTML = `<div class="oracle-sign">${data.zodiacSign}</div><p>${data.reading}</p>`;
    if (urgencyMessage) urgencyMessage.innerHTML = data.urgencyMessage;
  } catch (error) {
    console.error('Error:', error);
    if (loading) loading.style.display = 'none';
    if (intro) intro.style.display = 'block';
    alert('Please try again.');
  }
}

function bookReading() {
  window.location.href = currentReading ? `oracle.html#${currentReading.recommendedReading}` : 'oracle.html';
}

function shareReading() {
  if (currentReading?.shareText) {
    if (navigator.share) {
      navigator.share({ title: 'Lyrion Atelier', text: currentReading.shareText, url: window.location.href });
    } else {
      navigator.clipboard.writeText(currentReading.shareText);
      alert('Copied! Share on social media.');
    }
  }
}

function resetWidget() {
  const result = document.getElementById('oracle-result');
  const intro = document.getElementById('oracle-intro');
  const birthDateInput = document.getElementById('birth-date');
  if (result) result.style.display = 'none';
  if (intro) intro.style.display = 'block';
  if (birthDateInput) birthDateInput.value = '';
  currentReading = null;
}
