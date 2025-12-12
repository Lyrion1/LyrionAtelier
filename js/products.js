// Lyrion Atelier - Products Data and Management

// Sample Products Data
const products = [
  {
    id: 1,
    name: "Celestial Tee - Aries",
    price: 34.99,
    category: "tshirt",
    zodiac: "aries",
    image: null, // Placeholder
    description: "Premium cotton tee featuring the bold Aries constellation design."
  },
  {
    id: 2,
    name: "Mystic Hoodie - Leo",
    price: 59.99,
    category: "hoodie",
    zodiac: "leo",
    image: null,
    description: "Cozy hoodie with Leo constellation embroidery and zodiac symbols."
  },
  {
    id: 3,
    name: "Cosmic Crewneck - Pisces",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "pisces",
    image: null,
    description: "Soft crewneck sweatshirt with dreamy Pisces artwork."
  },
  {
    id: 4,
    name: "Starlight Tee - Gemini",
    price: 34.99,
    category: "tshirt",
    zodiac: "gemini",
    image: null,
    description: "Unique Gemini constellation design on premium fabric."
  },
  {
    id: 5,
    name: "Zodiac Hoodie - Scorpio",
    price: 59.99,
    category: "hoodie",
    zodiac: "scorpio",
    image: null,
    description: "Bold Scorpio design with mystical elements and constellations."
  },
  {
    id: 6,
    name: "Luna Sweatshirt - Cancer",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "cancer",
    image: null,
    description: "Moonlit Cancer design perfect for the intuitive soul."
  },
  {
    id: 7,
    name: "Astral Tee - Sagittarius",
    price: 34.99,
    category: "tshirt",
    zodiac: "sagittarius",
    image: null,
    description: "Adventure-inspired Sagittarius constellation tee."
  },
  {
    id: 8,
    name: "Galaxy Hoodie - Virgo",
    price: 59.99,
    category: "hoodie",
    zodiac: "virgo",
    image: null,
    description: "Elegant Virgo constellation with celestial accents."
  },
  {
    id: 9,
    name: "Stellar Crewneck - Capricorn",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "capricorn",
    image: null,
    description: "Ambitious Capricorn design for the determined spirit."
  },
  {
    id: 10,
    name: "Cosmic Tee - Aquarius",
    price: 34.99,
    category: "tshirt",
    zodiac: "aquarius",
    image: null,
    description: "Innovative Aquarius constellation with water bearer imagery."
  },
  {
    id: 11,
    name: "Nebula Hoodie - Taurus",
    price: 59.99,
    category: "hoodie",
    zodiac: "taurus",
    image: null,
    description: "Grounded Taurus design with earthy celestial elements."
  },
  {
    id: 12,
    name: "Eclipse Sweatshirt - Libra",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "libra",
    image: null,
    description: "Balanced Libra scales with harmonious constellation design."
  }
];

// Oracle Readings Data
const oracleReadings = [
  {
    id: "past-life",
    name: "Past Life Reading",
    price: 44,
    icon: "🔮",
    description: "Discover your soul's journey through time and unlock ancient wisdom."
  },
  {
    id: "career-compass",
    name: "Career Compass",
    price: 50,
    icon: "⭐",
    description: "Navigate your professional path with celestial guidance."
  },
  {
    id: "love-forecast",
    name: "Love Forecast",
    price: 55,
    icon: "💫",
    description: "Illuminate your romantic journey and relationship potential."
  },
  {
    id: "spiritual-awakening",
    name: "Spiritual Awakening",
    price: 60,
    icon: "✨",
    description: "Deepen your connection to higher consciousness and inner truth."
  },
  {
    id: "life-purpose",
    name: "Life Purpose",
    price: 65,
    icon: "🌙",
    description: "Uncover your soul's mission and align with your destiny."
  },
  {
    id: "year-ahead",
    name: "Year Ahead Reading",
    price: 75,
    icon: "☀️",
    description: "Comprehensive annual forecast for all areas of your life."
  }
];

// Display products on shop page
function displayProducts(productsToShow = products) {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;
  
  productGrid.innerHTML = '';
  
  productsToShow.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <div class="product-image">
        ${product.image ? `<img src="${product.image}" alt="${product.name}">` : `<!-- Placeholder: ${product.name} Image -->`}
        <span>${product.image ? '' : 'Product Image'}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-price">$${product.price.toFixed(2)}</p>
        <button class="btn btn-primary" onclick="addToCart(${product.id})">Add to Cart</button>
      </div>
    `;
    
    productCard.addEventListener('click', function(e) {
      if (!e.target.classList.contains('btn')) {
        window.location.href = `product.html?id=${product.id}`;
      }
    });
    
    productGrid.appendChild(productCard);
  });
  
  updateResultsCount(productsToShow.length);
}

// Display featured products on homepage
function displayFeaturedProducts() {
  const featuredProducts = products.slice(0, 8);
  displayProducts(featuredProducts);
}

// Display oracle readings
function displayOracleReadings() {
  const oracleGrid = document.getElementById('oracle-grid');
  if (!oracleGrid) return;
  
  oracleReadings.forEach(reading => {
    const oracleCard = document.createElement('div');
    oracleCard.className = 'oracle-card';
    oracleCard.innerHTML = `
      <div class="oracle-icon">${reading.icon}</div>
      <h3 class="oracle-title">${reading.name}</h3>
      <p class="oracle-description">${reading.description}</p>
      <div class="oracle-price">$${reading.price}</div>
      <button class="btn btn-secondary" onclick="purchaseReading('${reading.id}')">Book Reading</button>
    `;
    oracleGrid.appendChild(oracleCard);
  });
}

// Filter products
function filterProducts() {
  const categoryFilters = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
  const zodiacFilters = Array.from(document.querySelectorAll('input[name="zodiac"]:checked')).map(cb => cb.value);
  const minPrice = parseFloat(document.getElementById('min-price')?.value) || 0;
  const maxPrice = parseFloat(document.getElementById('max-price')?.value) || Infinity;
  
  let filteredProducts = products.filter(product => {
    const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(product.category);
    const zodiacMatch = zodiacFilters.length === 0 || zodiacFilters.includes(product.zodiac);
    const priceMatch = product.price >= minPrice && product.price <= maxPrice;
    
    return categoryMatch && zodiacMatch && priceMatch;
  });
  
  // Apply sorting
  const sortBy = document.getElementById('sort-select')?.value;
  if (sortBy === 'price-low') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  displayProducts(filteredProducts);
}

// Update results count
function updateResultsCount(count) {
  const resultsCount = document.querySelector('.results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${count} ${count === 1 ? 'product' : 'products'}`;
  }
}

// Get product by ID
function getProductById(id) {
  return products.find(product => product.id === parseInt(id));
}

// Display product details
function displayProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  if (!productId) return;
  
  const product = getProductById(productId);
  if (!product) return;
  
  // Update page title
  document.title = `${product.name} - Lyrion Atelier`;
  
  // Update product details
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = `$${product.price.toFixed(2)}`;
  document.getElementById('product-description').textContent = product.description;
  
  // Store product ID for add to cart
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.setAttribute('data-product-id', productId);
  }
}

// Purchase oracle reading
function purchaseReading(readingId) {
  const reading = oracleReadings.find(r => r.id === readingId);
  if (reading) {
    alert(`Booking ${reading.name} for $${reading.price}. You will be contacted shortly to schedule your reading.`);
  }
}

// Initialize products on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check which page we're on and initialize accordingly
  if (document.getElementById('product-grid')) {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      displayFeaturedProducts();
    } else {
      displayProducts();
    }
  }
  
  if (document.getElementById('oracle-grid')) {
    displayOracleReadings();
  }
  
  if (document.getElementById('product-name')) {
    displayProductDetails();
  }
  
  // Add event listeners for filters
  const filterCheckboxes = document.querySelectorAll('.filter-checkbox input');
  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', filterProducts);
  });
  
  // Add event listener for sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', filterProducts);
  }
  
  // Add event listeners for price inputs
  const priceInputs = document.querySelectorAll('#min-price, #max-price');
  priceInputs.forEach(input => {
    input.addEventListener('change', filterProducts);
  });
});
