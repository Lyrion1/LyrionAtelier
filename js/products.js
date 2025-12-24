// Lyrīon Atelier - Products Data and Management

const PRODUCT_FALLBACK = '/assets/catalog/placeholder.webp';
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function resolveProductImage(p = {}, imageMap = {}) {
  const asString = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img.trim() || null;
    if (img && typeof img.url === 'string') return img.url;
    if (img && typeof img.src === 'string') return img.src;
    if (img && typeof img.preview_url === 'string') return img.preview_url;
    if (img && typeof img.thumbnail_url === 'string') return img.thumbnail_url;
    return null;
  };
  const isHttp = (val) => typeof val === 'string' && /^https?:\/\//i.test(val.trim());
  const direct = isHttp(p.image) ? p.image.trim() : null;
  if (direct) return direct;
  const firstRemote = Array.isArray(p.images) ? p.images.map(asString).find(isHttp) : null;
  return firstRemote || PRODUCT_FALLBACK;
}

/**
 * Products Array
 * Contains all available clothing products with detailed information
 * Each product includes: id, name, price, category, zodiac, image, description, and sizes
 */
const products = [
  {
    id: 1,
    name: "Aries Fire Tee (Youth)",
    price: 34.99,
    category: "youth",
    zodiac: "aries",
    image: "/youth-aries-fire-tee/youth-aries-fire-tee-lifestyle.jpg",
    description: "Empower young Aries with celestial fire symbolism. Premium unisex tee for fearless trailblazers.",
    sizes: ["XS", "S", "M", "L", "XL"],
    isBestseller: true,
    showOnHomepage: true
  },
  {
    id: 2,
    slug: "leo-zodiac-hoodie",
    name: "Leo Zodiac Hoodie",
    price: 59.99,
    category: "hoodie",
    zodiac: "leo",
    image: "/leo-zodiac-hoodie/leo-zodiac-hoodie-lifestyle.jpg",
    description: "The sovereign flame—cosmic lion insignia that wraps natural-born leaders in celestial armor.",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    isBestseller: true,
    showOnHomepage: true
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
    slug: "lyrion-premium-sweatshirt",
    title: "Unisex Premium Sweatshirt — Sun Crest",
    price: 59.99,
    currency: "USD",
    category: "sweatshirts",
    zodiac: "all",
    image: "lyrion-premium-sweatshirt.webp",
    sizes: ["S","M","L","XL","2XL"],
    desc: "Signature Lyrion Atelier Sun Crest premium crew with celestial detailing.",
    pf_url: "https://www.printful.com/custom-products/unisex-premium-sweatshirt",
    palette: "celestial-noir",
    collection: ["lyrionatelier", "lyrion-atelier"],
    images: ["/assets/catalog/lyrion-premium-sweatshirt.webp", "/assets/catalog/lyrion-premium-sweatshirt.png"],
    featured: true,
    variants: [
      { id: "69455454068e06", sku: "LA-SW-UNISEX-S", options: { size: "S" }, price: 5999 },
      { id: "69455454068eb6", sku: "LA-SW-UNISEX-M", options: { size: "M" }, price: 5999 },
      { id: "69455454068f36", sku: "LA-SW-UNISEX-L", options: { size: "L" }, price: 5999 },
      { id: "69455454068fb1", sku: "LA-SW-UNISEX-XL", options: { size: "XL" }, price: 5999 },
      { id: "69455454069045", sku: "LA-SW-UNISEX-2XL", options: { size: "2XL" }, price: 5999 }
    ],
    metadata: {
      brand: "Lyrion Atelier",
      source: "manual",
      collection: ["lyrionatelier", "lyrion-atelier"],
      printful: {
        externalProductId: null,
        variantIds: ["69455454068e06","69455454068eb6","69455454068f36","69455454068fb1","69455454069045"]
      }
    }
  },
  {
    slug: "unisex-tee-sun-crest",
    title: "Unisex Garment-dyed Tee — Sun Crest",
    vendor: "Printful",
    collection: ["Lyrion Atelier"],
    category: "T-shirts",
    tags: ["unisex","tee","comfort-colors","sun-crest","brand-mark"],
    palette: "Celestial Noir",
    images: ["/assets/catalog/unisex-tee-sun-crest.webp"],
    description: "Premium garment-dyed heavyweight tee (Comfort Colors 1717) with the Lyrion sun crest embroidery.",
    variants: [
      { size: "S", printfulVariantId: "6946125c2990a1", price: 33.99 },
      { size: "M", printfulVariantId: "6946125c299108", price: 33.99 },
      { size: "L", printfulVariantId: "6946125c299168", price: 33.99 },
      { size: "XL", printfulVariantId: "6946125c2991b5", price: 41.99 },
      { size: "2XL", printfulVariantId: "6946125c2991f1", price: 43.99 },
      { size: "3XL", printfulVariantId: "6946125c299248", price: 45.99 },
      { size: "4XL", printfulVariantId: "6946125c299282", price: 47.99 }
    ],
    defaultVariantIndex: 0,
    currency: "GBP",
    price: { min: 33.99, max: 47.99, currency: "GBP" },
    sizes: ["S","M","L","XL","2XL","3XL","4XL"]
  },
  {
    id: 101,
    name: "Past Life Reading",
    price: 65,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/past-life-reading-oracle-card.webp",
    description: "Uncover echoes of your former selves and the lessons that follow you.",
    sizes: ["Standard"]
  },
  {
    id: 102,
    name: "Career Path Compass",
    price: 55,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/career-path-compass-oracle-card.webp",
    description: "A roadmap for your vocation with clear next steps.",
    sizes: ["Standard"]
  },
  {
    id: 103,
    name: "Love & Relationships Spread",
    price: 52,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/love-relationships-spread-oracle-card.webp",
    description: "Clarity on connections, timing, and aligned partners.",
    sizes: ["Standard"]
  },
  {
    id: 104,
    name: "Monthly Guidance Package",
    price: 60,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/monthly-guidance-package-oracle-card.webp",
    description: "A month-long cadence of insights to stay on track.",
    sizes: ["Standard"]
  },
  {
    id: 105,
    name: "Natal Chart Blueprint",
    price: 70,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/natal-chart-blueprint-cover.webp",
    description: "Foundational chart read with practical activations.",
    sizes: ["Standard"]
  },
  {
    id: 106,
    name: "Solar Return Reading",
    price: 58,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/solar-return-reading-cover.webp",
    description: "Birthday-year forecast covering themes and opportunities.",
    sizes: ["Standard"]
  },
  {
    id: 107,
    name: "Life Path Reading",
    price: 50,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/life-path-reading-cover.webp",
    description: "Identify your current chapter and its lessons.",
    sizes: ["Standard"]
  },
  {
    id: 108,
    name: "The Oracle’s Lantern",
    price: 75,
    category: "oracle",
    zodiac: "oracle",
    image: "images/oracle/the-oracles-lantern-cover.webp",
    description: "A deep dive session for seekers ready for transformation.",
    sizes: ["Standard"]
  }
];

// Expose products for shop page, but normalize first so the UI never sees missing fields
if (typeof window !== 'undefined') {
  window.LyrionAtelier = window.LyrionAtelier || {};
  if (!Array.isArray(window.LyrionAtelier.products)) {
    window.LyrionAtelier.products = [];
    try {
      window.dispatchEvent(new CustomEvent('catalog:requested'));
    } catch (_) {}
  }

  // Helper: pick the best image URL from various Printful shapes (sync, mockups, files, etc.)
  const bestImage = (p = {}) => {
    const isHttp = (val) => typeof val === 'string' && /^https?:\/\//i.test(val.trim());
    const thumb = isHttp(p.thumbnail_url) ? p.thumbnail_url.trim() : null;
    if (thumb) return thumb;
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const variantPreview = variants
      .map((v) => {
        const files = Array.isArray(v?.files) ? v.files : [];
        const preferred = files.find(
          (fi) => fi && ['preview', 'default'].includes(String(fi?.type || '').toLowerCase()) && isHttp(fi?.preview_url)
        );
        if (preferred) return preferred.preview_url;
        const firstPreview = files.find((fi) => isHttp(fi?.preview_url));
        return firstPreview?.preview_url || null;
      })
      .find(Boolean);
    if (variantPreview) return variantPreview;
    const anyPreview = variants
      .map((v) => (isHttp(v?.files?.[0]?.preview_url) ? v.files[0].preview_url : null))
      .find(Boolean);
    return anyPreview || '';
  };

  // Normalize every product to always have { id, sku, title, price, image, slug, tags, category, zodiac }
  const normalized = (Array.isArray(products) ? products : []).map((p) => {
    const title =
      p.title || p.name || p.product_name || p.variant_name || p.variant?.name || '—';
    // prefer retail/shop price we showed earlier; otherwise first variant price
    const price =
      p.price || p.retail_price || p.retail || p.amount || p.variants?.[0]?.price || p.variants?.[0]?.retail_price || null;
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const defaultVariantId = p.defaultVariant?.id || variants[0]?.id || null;
    const image = bestImage(p) || resolveProductImage(p);
    const images = image ? [image] : [];
    const slug =
      p.slug ||
      (title && String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''));
    return {
      id: p.id || p.sync_product_id || p.external_id || slug,
      sku: p.sku || p.external_sku || variants?.[0]?.sku || null,
      title,
      price,
      image,
      images,
      slug,
      variants,
      defaultVariantId,
      // pass through other fields for filters
      zodiac: p.zodiac || p.attributes?.zodiac || p.tags?.find(t => /^zodiac:/i.test(t))?.split(':')[1] || 'all',
      category: p.category || p.product_type || 'Apparel',
      tags: p.tags || [],
      raw: p
    };
  });

  if (!window.LyrionAtelier.products || normalized.length > (window.LyrionAtelier.products?.length || 0)) {
    window.LyrionAtelier.products = normalized;
  }
  // legacy shim for any old code still reading window.products
  window.products = window.LyrionAtelier.products;
  console.log('[shop] products available:', window.LyrionAtelier.products.length);
  window.resolveProductImage = resolveProductImage;
}

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
          <button class="btn btn-primary add-to-cart" type="button" aria-label="Add ${product.name} to cart">Add to Cart</button>
        </div>
      `;
      const addButton = productCard.querySelector('.add-to-cart');
      if (addButton) {
        addButton.addEventListener('click', (event) => {
          event.stopPropagation();
          addToCart(product.id);
        });
      }
      
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
  document.title = `${product.name} - Lyrīon Atelier`;
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

const oracleBookingMap = {
  'natal-chart': 105,
  'solar-return': 106,
  'life-path': 107,
  'relationship': 103,
  'career': 102,
  'cosmic-blueprint': 108,
  'past-life': 101,
  'career-path': 102,
  'love-relationships': 103,
  'monthly-guidance': 104,
};

function purchaseReading(readingId) {
  addOracleReadingToCart(readingId);
}

function addOracleReadingToCart(readingKey) {
  const resolvedKey = String(readingKey || '').toLowerCase();
  const mappedId = oracleBookingMap[resolvedKey];
  const fallbackId = Number.isFinite(Number(readingKey)) ? Number(readingKey) : null;
  const targetId = mappedId || fallbackId;
  const product = products.find(p => String(p.id) === String(targetId));
  if (!product) {
    if (typeof showToast === 'function') {
      showToast('This reading is unavailable right now.', 'error');
    }
    return;
  }
  addToCart(product.id, 1, 'Standard', product);
  window.location.href = 'checkout.html';
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

  const oracleProducts = [
    {
      key: 'natal-chart',
      name: 'Natal Chart Blueprint - Oracle Reading',
      price: 70.00,
      description: 'Foundational chart read with practical activations',
      image: 'images/oracle/natal-chart-blueprint-cover.webp'
    },
    {
      key: 'solar-return',
      name: 'Solar Return Reading - Oracle Reading',
      price: 58.00,
      description: 'Birthday-year forecast covering themes and opportunities',
      image: 'images/oracle/solar-return-reading-cover.webp'
    },
    {
      key: 'life-path',
      name: 'Life Path Reading - Oracle Reading',
      price: 50.00,
      description: 'Identify your current chapter and its lessons',
      image: 'images/oracle/life-path-reading-cover.webp'
    },
    {
      key: 'relationship',
      name: 'Relationship Synastry - Oracle Reading',
      price: 88.00,
      description: 'Compatibility and dynamics between two charts',
      image: 'images/oracle/love-relationships-spread-oracle-card.webp'
    },
    {
      key: 'career',
      name: 'Career & Purpose Reading - Oracle Reading',
      price: 75.00,
      description: 'Vocational guidance and life purpose insights',
      image: 'images/oracle/career-path-compass-oracle-card.webp'
    },
    {
      key: 'cosmic-blueprint',
      name: 'Full Cosmic Blueprint - Oracle Reading',
      price: 155.00,
      description: 'Comprehensive analysis combining all aspects',
      image: 'images/oracle/the-oracles-lantern-cover.webp'
    }
  ];

  oracleGrid.innerHTML = '';

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
        <button class="btn btn-primary book-reading-btn" data-product="${reading.key}" aria-label="Book ${reading.name}">Book</button>
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

  const oracleBookButtons = document.querySelectorAll('.book-reading-btn');
  oracleBookButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const productKey = btn.getAttribute('data-product') || btn.dataset.product || btn.id;
      addOracleReadingToCart(productKey);
    });
  });
});
