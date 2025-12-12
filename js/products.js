// Lyrion Atelier - Products Data and Management

/**
 * Products Array
 * Contains all available clothing products with detailed information
 * Each product includes: id, name, price, category, zodiac, image, description, and sizes
 */
const products = [
  {
    id: 1,
    name: "Aries Fire Tee",
    price: 34.99,
    category: "tshirt",
    zodiac: "aries",
    image: null, // Placeholder - replace with actual image path
    description: "Premium cotton tee featuring the bold Aries constellation design with fiery ram symbolism. Perfect for the passionate and adventurous soul.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 2,
    name: "Zodiac Hoodie - Leo",
    price: 59.99,
    category: "hoodie",
    zodiac: "leo",
    image: null,
    description: "Cozy hoodie with Leo constellation embroidery and regal lion imagery. Designed for those who shine bright and lead with confidence.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 3,
    name: "Cosmic Crewneck - Pisces",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "pisces",
    image: null,
    description: "Soft crewneck sweatshirt with dreamy Pisces artwork featuring mystical fish symbolism. For the intuitive and compassionate spirit.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 4,
    name: "Starlight Tee - Gemini",
    price: 34.99,
    category: "tshirt",
    zodiac: "gemini",
    image: null,
    description: "Unique Gemini constellation design on premium fabric with twin symbolism. Celebrating duality, curiosity, and adaptability.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 5,
    name: "Mystic Hoodie - Scorpio",
    price: 59.99,
    category: "hoodie",
    zodiac: "scorpio",
    image: null,
    description: "Bold Scorpio design with mystical elements and powerful scorpion constellation. For the intense, passionate, and transformative soul.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 6,
    name: "Luna Sweatshirt - Cancer",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "cancer",
    image: null,
    description: "Moonlit Cancer design featuring crab symbolism and lunar phases. Perfect for the nurturing and protective heart.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 7,
    name: "Archer Tee - Sagittarius",
    price: 34.99,
    category: "tshirt",
    zodiac: "sagittarius",
    image: null,
    description: "Adventure-inspired Sagittarius constellation tee with arrow and archer motifs. For the free-spirited explorer and truth-seeker.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 8,
    name: "Galaxy Hoodie - Virgo",
    price: 59.99,
    category: "hoodie",
    zodiac: "virgo",
    image: null,
    description: "Elegant Virgo constellation with celestial accents and maiden symbolism. Celebrating precision, wisdom, and earthy grace.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 9,
    name: "Mountain Crewneck - Capricorn",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "capricorn",
    image: null,
    description: "Ambitious Capricorn design featuring mountain goat symbolism and earthly constellations. For the determined achiever.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 10,
    name: "Water Bearer Tee - Aquarius",
    price: 34.99,
    category: "tshirt",
    zodiac: "aquarius",
    image: null,
    description: "Innovative Aquarius constellation with water bearer imagery and electric blue accents. For the visionary and humanitarian spirit.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 11,
    name: "Earthen Hoodie - Taurus",
    price: 59.99,
    category: "hoodie",
    zodiac: "taurus",
    image: null,
    description: "Grounded Taurus design with earthy celestial elements and bull symbolism. Celebrating strength, stability, and sensual beauty.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 12,
    name: "Balance Sweatshirt - Libra",
    price: 44.99,
    category: "sweatshirt",
    zodiac: "libra",
    image: null,
    description: "Balanced Libra scales with harmonious constellation design and justice symbolism. For the diplomatic peacemaker.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 13,
    name: "Celestial Tee - Aries",
    price: 32.99,
    category: "tshirt",
    zodiac: "aries",
    image: null,
    description: "Alternative Aries design with minimalist constellation pattern. Lightweight and comfortable for everyday cosmic style.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 14,
    name: "Dual Flame Hoodie - Gemini",
    price: 62.99,
    category: "hoodie",
    zodiac: "gemini",
    image: null,
    description: "Premium Gemini hoodie with dual-tone design representing the twins. Features embroidered constellation on the back.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 15,
    name: "Royal Lion Sweatshirt - Leo",
    price: 47.99,
    category: "sweatshirt",
    zodiac: "leo",
    image: null,
    description: "Majestic Leo sweatshirt with gold-threaded lion mane design. Perfect for those who embrace their inner royalty.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 16,
    name: "Healing Waves Tee - Pisces",
    price: 36.99,
    category: "tshirt",
    zodiac: "pisces",
    image: null,
    description: "Flowing Pisces design with oceanic themes and iridescent fish patterns. For the dreamer and healer.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 17,
    name: "Phoenix Rising Hoodie - Scorpio",
    price: 64.99,
    category: "hoodie",
    zodiac: "scorpio",
    image: null,
    description: "Premium Scorpio hoodie featuring phoenix and scorpion dual imagery. Represents transformation and rebirth.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 18,
    name: "Moonchild Sweatshirt - Cancer",
    price: 46.99,
    category: "sweatshirt",
    zodiac: "cancer",
    image: null,
    description: "Soft Cancer sweatshirt with lunar cycle artwork and shell motifs. Celebrating emotional depth and intuition.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 19,
    name: "Wanderer Tee - Sagittarius",
    price: 35.99,
    category: "tshirt",
    zodiac: "sagittarius",
    image: null,
    description: "Travel-inspired Sagittarius tee with compass rose and constellation map. For the eternal adventurer.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: 20,
    name: "Harvest Moon Hoodie - Virgo",
    price: 61.99,
    category: "hoodie",
    zodiac: "virgo",
    image: null,
    description: "Earthy Virgo hoodie with wheat sheaf design and harvest moon imagery. Celebrating service, health, and nature.",
    sizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 101,
    name: "Past Life Reading",
    price: 65,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/past-life-reading-oracle-card.png",
    description: "Uncover echoes of your former selves and the lessons that follow you.",
    sizes: ["Standard"]
  },
  {
    id: 102,
    name: "Career Path Compass",
    price: 55,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/career-path-compass-oracle-card.png",
    description: "A roadmap for your vocation with clear next steps.",
    sizes: ["Standard"]
  },
  {
    id: 103,
    name: "Love & Relationships Spread",
    price: 52,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/love-relationships-spread-oracle-card.png",
    description: "Clarity on connections, timing, and aligned partners.",
    sizes: ["Standard"]
  },
  {
    id: 104,
    name: "Monthly Guidance Package",
    price: 60,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/monthly-guidance-package-oracle-card.png",
    description: "A month-long cadence of insights to stay on track.",
    sizes: ["Standard"]
  },
  {
    id: 105,
    name: "Natal Chart Blueprint",
    price: 70,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/natal-chart-blueprint-cover.png",
    description: "Foundational chart read with practical activations.",
    sizes: ["Standard"]
  },
  {
    id: 106,
    name: "Solar Return Reading",
    price: 58,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/solar-return-reading-cover.png",
    description: "Birthday-year forecast covering themes and opportunities.",
    sizes: ["Standard"]
  },
  {
    id: 107,
    name: "Life Path Reading",
    price: 50,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/life-path-reading-cover.png",
    description: "Identify your current chapter and its lessons.",
    sizes: ["Standard"]
  },
  {
    id: 108,
    name: "The Oracle’s Lantern",
    price: 75,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/the-oracles-lantern-cover.png",
    description: "A deep dive session for seekers ready for transformation.",
    sizes: ["Standard"]
  }
];

/**
 * Oracle Readings Data
 * Digital oracle readings offered as services/products
 * Each reading includes: id, name, price, icon, description, and category
 */
const oracleReadings = [
  {
    id: "oracle-1",
    name: "Past Life Reading",
    price: 44,
    icon: "🔮",
    category: "oracle",
    description: "Discover your soul's journey through time and unlock ancient wisdom. Includes detailed 15-page report.",
    duration: "60 minutes",
    delivery: "Digital report within 3-5 business days"
  },
  {
    id: "oracle-2",
    name: "Career Compass Reading",
    price: 50,
    icon: "⭐",
    category: "oracle",
    description: "Navigate your professional path with celestial guidance. Uncover your career strengths and opportunities.",
    duration: "45 minutes",
    delivery: "Digital report within 3-5 business days"
  },
  {
    id: "oracle-3",
    name: "Love Forecast Reading",
    price: 55,
    icon: "💫",
    category: "oracle",
    description: "Illuminate your romantic journey and relationship potential. Includes compatibility analysis.",
    duration: "60 minutes",
    delivery: "Digital report within 3-5 business days"
  },
  {
    id: "oracle-4",
    name: "Spiritual Awakening Reading",
    price: 60,
    icon: "✨",
    category: "oracle",
    description: "Deepen your connection to higher consciousness and inner truth. Explore your spiritual gifts.",
    duration: "75 minutes",
    delivery: "Digital report within 5-7 business days"
  },
  {
    id: "oracle-5",
    name: "Life Purpose Reading",
    price: 65,
    icon: "🌙",
    category: "oracle",
    description: "Uncover your soul's mission and align with your destiny. Comprehensive life path analysis.",
    duration: "90 minutes",
    delivery: "Digital report within 5-7 business days"
  },
  {
    id: "oracle-6",
    name: "Year Ahead Reading",
    price: 75,
    icon: "☀️",
    category: "oracle",
    description: "Comprehensive annual forecast for all areas of your life. Month-by-month guidance and predictions.",
    duration: "120 minutes",
    delivery: "Digital report within 7-10 business days"
  },
  {
    id: "oracle-7",
    name: "Soul Mate Connection",
    price: 58,
    icon: "💕",
    category: "oracle",
    description: "Deep dive into your soul mate energy and timing. Discover when and how you'll meet your divine partner.",
    duration: "60 minutes",
    delivery: "Digital report within 3-5 business days"
  },
  {
    id: "oracle-8",
    name: "Ancestral Wisdom Reading",
    price: 52,
    icon: "🌟",
    category: "oracle",
    description: "Connect with ancestral guidance and inherited gifts. Heal generational patterns and embrace legacy.",
    duration: "60 minutes",
    delivery: "Digital report within 3-5 business days"
  }
];

/**
 * Display Products on Shop Page
 * Renders product cards with smooth animations
 * @param {Array} productsToShow - Array of products to display
 */
function displayProducts(productsToShow = products) {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;
  
  // Add fade-out animation before updating
  productGrid.style.opacity = '0';
  
  setTimeout(() => {
    productGrid.innerHTML = '';
    
    productsToShow.forEach((product, index) => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.style.animationDelay = `${index * 0.05}s`;
      productCard.innerHTML = `
        <div class="product-image">
          ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : `<div class="placeholder-image">📦</div>`}
          ${!product.image ? `<span class="placeholder-text">Product Image</span>` : ''}
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-price">$${product.price.toFixed(2)}</p>
          <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${product.id})" aria-label="Add ${product.name} to cart">Add to Cart</button>
        </div>
      `;
      
      // Navigate to product page on card click (except button)
      productCard.addEventListener('click', function(e) {
        if (!e.target.classList.contains('btn')) {
          window.location.href = `product.html?id=${product.id}`;
        }
      });
      
      productGrid.appendChild(productCard);
    });
    
    // Fade in with animation
    productGrid.style.opacity = '1';
    updateResultsCount(productsToShow.length);
  }, 200);
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

/**
 * Filter Products Based on User Selection
 * Applies filters for category, zodiac, and price range
 * Updates URL parameters to maintain state
 */
function filterProducts() {
  const categoryFilters = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
  const zodiacFilters = Array.from(document.querySelectorAll('input[name="zodiac"]:checked')).map(cb => cb.value);
  const minPrice = parseFloat(document.getElementById('min-price')?.value) || 0;
  const maxPrice = parseFloat(document.getElementById('max-price')?.value) || Infinity;
  
  // Filter products
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
  
  // Update URL parameters
  updateURLParameters(categoryFilters, zodiacFilters, minPrice, maxPrice, sortBy);
  
  // Display filtered products with animation
  displayProducts(filteredProducts);
}

/**
 * Update URL Parameters
 * Updates browser URL with current filter state without reloading page
 */
function updateURLParameters(categories, zodiacs, minPrice, maxPrice, sortBy) {
  const params = new URLSearchParams();
  
  if (categories.length > 0) {
    params.set('category', categories.join(','));
  }
  if (zodiacs.length > 0) {
    params.set('zodiac', zodiacs.join(','));
  }
  if (minPrice > 0) {
    params.set('min', minPrice);
  }
  if (maxPrice < Infinity) {
    params.set('max', maxPrice);
  }
  if (sortBy && sortBy !== 'featured') {
    params.set('sort', sortBy);
  }
  
  // Update URL without reloading page
  const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}

/**
 * Load Filters from URL Parameters
 * Restores filter state from URL on page load
 */
function loadFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  
  // Whitelist of valid categories and zodiac signs for security
  const validCategories = ['tshirt', 'hoodie', 'sweatshirt'];
  const validZodiacs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 
                        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  
  // Load category filters
  const categoryParam = params.get('category');
  if (categoryParam) {
    const categories = categoryParam.split(',').filter(cat => validCategories.includes(cat));
    categories.forEach(category => {
      const checkbox = document.querySelector(`input[name="category"][value="${CSS.escape(category)}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  // Load zodiac filters
  const zodiacParam = params.get('zodiac');
  if (zodiacParam) {
    const zodiacs = zodiacParam.split(',').filter(zod => validZodiacs.includes(zod));
    zodiacs.forEach(zodiac => {
      const checkbox = document.querySelector(`input[name="zodiac"][value="${CSS.escape(zodiac)}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  // Load price filters with sanitization
  const minPrice = params.get('min');
  const maxPrice = params.get('max');
  if (minPrice && !isNaN(parseFloat(minPrice))) {
    const minInput = document.getElementById('min-price');
    if (minInput) minInput.value = parseFloat(minPrice);
  }
  if (maxPrice && !isNaN(parseFloat(maxPrice))) {
    const maxInput = document.getElementById('max-price');
    if (maxInput) maxInput.value = parseFloat(maxPrice);
  }
  
  // Load sort option
  const sortBy = params.get('sort');
  const validSorts = ['featured', 'price-low', 'price-high', 'name'];
  if (sortBy && validSorts.includes(sortBy)) {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = sortBy;
  }
  
  // Apply filters if any were loaded
  const hasFilters = categoryParam || zodiacParam || minPrice || maxPrice;
  if (hasFilters) {
    filterProducts();
  }
}

/**
 * Update Results Count Display
 * Shows the number of products matching current filters
 * @param {number} count - Number of products to display
 */
function updateResultsCount(count) {
  const resultsCount = document.querySelector('.results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${count} ${count === 1 ? 'product' : 'products'}`;
    resultsCount.style.opacity = '0';
    setTimeout(() => resultsCount.style.opacity = '1', 100);
  }
}

/**
 * Get Product by ID
 * Retrieves a single product object by its ID
 * @param {number} id - Product ID
 * @returns {Object|undefined} Product object or undefined
 */
function getProductById(id) {
  return products.find(product => product.id === parseInt(id));
}

/**
 * Display Product Details on Product Page
 * Populates product page with specific product information
 */
function displayProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  if (!productId) {
    if (typeof showToast === 'function') {
      showToast('No product specified', 'error');
    }
    return;
  }
  
  const product = getProductById(productId);
  if (!product) {
    if (typeof showToast === 'function') {
      showToast('Product not found', 'error');
    }
    return;
  }
  
  // Update page title and meta description
  document.title = `${product.name} - Lyrion Atelier`;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', product.description);
  }
  
  // Update product details
  const productName = document.getElementById('product-name');
  const productPrice = document.getElementById('product-price');
  const productDescription = document.getElementById('product-description');
  
  if (productName) productName.textContent = product.name;
  if (productPrice) productPrice.textContent = `$${product.price.toFixed(2)}`;
  if (productDescription) productDescription.textContent = product.description;
  
  // Display available sizes if element exists
  const sizesContainer = document.querySelector('.size-selector');
  if (sizesContainer && product.sizes) {
    let sizeOptionsDiv = sizesContainer.querySelector('.size-options');
    if (!sizeOptionsDiv) {
      sizeOptionsDiv = document.createElement('div');
      sizeOptionsDiv.className = 'size-options';
      sizesContainer.appendChild(sizeOptionsDiv);
    }
    sizeOptionsDiv.innerHTML = '';
    
    product.sizes.forEach((size, index) => {
      const sizeBtn = document.createElement('button');
      sizeBtn.className = 'size-option' + (index === 2 ? ' active' : ''); // Default to M (index 2)
      sizeBtn.textContent = size;
      sizeBtn.setAttribute('aria-label', `Size ${size}`);
      sizeBtn.setAttribute('aria-selected', index === 2 ? 'true' : 'false');
      sizeOptionsDiv.appendChild(sizeBtn);
    });
    
    // Reinitialize size selector if function exists
    if (typeof initSizeSelector === 'function') {
      initSizeSelector();
    }
  }
  
  // Store product ID for add to cart
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.setAttribute('data-product-id', productId);
  }
}

/**
 * Purchase Oracle Reading
 * Handles booking of oracle reading services
 * @param {string} readingId - ID of the oracle reading
 */
function purchaseReading(readingId) {
  const reading = oracleReadings.find(r => r.id === readingId);
  if (reading) {
    if (typeof showToast === 'function') {
      showToast(`Booking ${reading.name} for $${reading.price}. You will be contacted shortly to schedule your reading.`, 'success');
    } else {
      alert(`Booking ${reading.name} for $${reading.price}. You will be contacted shortly to schedule your reading.`);
    }
    // In a real application, this would add to cart or redirect to booking form
  }
}

/**
 * Display Featured Products on Homepage
 * Shows a selection of featured products
 */
function displayFeaturedProducts() {
  const featuredProducts = products.slice(0, 8);
  displayProducts(featuredProducts);
}

/**
 * Display Oracle Readings on Oracle Page
 * Renders oracle reading cards
 */
function displayOracleReadings() {
  const oracleGrid = document.getElementById('oracle-grid');
  if (!oracleGrid) return;

  oracleGrid.innerHTML = '';
  const oracleProducts = Array.isArray(products) ? products.filter(p => p.category === 'oracle') : [];

  oracleProducts.forEach((reading, index) => {
    const oracleCard = document.createElement('div');
    oracleCard.className = 'oracle-card fade-in-on-scroll';
    oracleCard.style.animationDelay = `${index * 0.05}s`;
    oracleCard.innerHTML = `
      <div class="oracle-image">
        ${reading.image ? `<img src="${reading.image}" alt="${reading.name}" loading="lazy">` : '<div class="placeholder">⭐</div>'}
      </div>
      <div>
        <p class="pill">Oracle reading</p>
        <h3 class="oracle-title">${reading.name}</h3>
        <p class="oracle-description">${reading.description}</p>
      </div>
      <div class="oracle-price">$${reading.price.toFixed(2)}</div>
      <div class="button-row tight">
        <a class="btn btn-outline" href="contact.html">Ask the oracle</a>
        <button class="btn btn-primary" onclick="addToCart(${reading.id})" aria-label="Add ${reading.name} to cart">Book</button>
      </div>
    `;
    oracleGrid.appendChild(oracleCard);
  });
}

/**
 * Initialize Products Page Functionality
 * Sets up event listeners and loads initial data
 */
document.addEventListener('DOMContentLoaded', function() {
  // Load filters from URL if on shop page
  if (window.location.pathname.includes('shop.html')) {
    loadFiltersFromURL();
  }
  
  // Check which page we're on and initialize accordingly
  if (document.getElementById('product-grid')) {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
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
  
  // Add event listeners for price inputs with debouncing
  const priceInputs = document.querySelectorAll('#min-price, #max-price');
  let priceTimeout;
  priceInputs.forEach(input => {
    input.addEventListener('input', function() {
      clearTimeout(priceTimeout);
      priceTimeout = setTimeout(filterProducts, 500); // Debounce 500ms
    });
  });
});
