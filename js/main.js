// Lyrīon Atelier - Main JavaScript

// Inject the shop auto-loader once globally (idempotent)
(function injectShopAutoLoader() {
  const src = '/assets/auto-mount-shop-grid.js';
  const scripts = Array.from(document.getElementsByTagName('script'));
  if (scripts.some(tag => tag.getAttribute('src') === src)) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = src;
  document.head.appendChild(script);
})();

// Ensure mobile performance head tags exist
(function ensureMobilePerformanceHead() {
  const head = document.head;
  if (!head) return;

  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    head.prepend(meta);
  } else if (!/width=device-width/.test(viewport.getAttribute('content') || '')) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
  }

  ['https://fonts.googleapis.com', 'https://api.stripe.com'].forEach(href => {
    if (!head.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      head.appendChild(link);
    }
  });
})();

/**
 * Main initialization on DOM content loaded
 * Sets up all interactive features and event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('loaded');
  applySharedLayout();
  
  // Initialize mobile menu
  initMobileMenu();
  
  // Initialize sticky header with shadow on scroll
  initStickyHeader();
  
  // Update cart count badge
  updateCartCount();
  
  // Initialize tab functionality for product pages
  initTabs();
  
  // Initialize size selector for product pages
  initSizeSelector();
  
  // Initialize thumbnail gallery for product pages
  initThumbnailGallery();
  
  // Initialize lightbox modal for product images
  initLightbox();
  
  // Initialize smooth scrolling for anchor links
  initSmoothScroll();
  
  // Load sample events on Codex page
  loadEvents();
  hydrateCodexCards();
  
  // Initialize scroll-triggered fade-in animations
  initScrollAnimations();
  
  // Initialize form validation
  initFormValidation();
  
  // Initialize "Skip to Content" link
  initSkipToContent();

  // Initialize navigation loading overlay
  initNavigationLoading();
});

function applySharedLayout() {
  const body = document.body;
  if (!body || body.dataset.layoutApplied === 'true') return;

  const skipLink = ensureSkipToContent();
  const existingHeader = document.querySelector('header.site-header');
  const existingFooter = document.querySelector('footer.footer');
  const existingMain = document.querySelector('main');

  const header = buildSiteHeader();
  if (existingHeader) {
    existingHeader.replaceWith(header);
  } else if (skipLink && skipLink.parentElement === body) {
    skipLink.insertAdjacentElement('afterend', header);
  } else {
    body.insertBefore(header, body.firstChild);
  }
  setActiveNavLink(header);

  let main = existingMain;
  if (!main) {
    main = document.createElement('main');
    main.id = 'main-content';
    const movableNodes = Array.from(body.children).filter(node => {
      if (!(node instanceof HTMLElement)) return false;
      if (node === header || node === existingHeader || node === skipLink || node.tagName === 'SCRIPT' || node.matches('footer.footer')) return false;
      return true;
    });
    movableNodes.forEach(node => main.appendChild(node));
  } else if (!main.id) {
    main.id = 'main-content';
  }

  if (!main.parentElement) {
    body.appendChild(main);
  }

  const footer = buildSiteFooter();
  if (existingFooter) {
    existingFooter.replaceWith(footer);
  } else {
    const firstScript = body.querySelector('script');
    if (firstScript) {
      body.insertBefore(footer, firstScript);
    } else {
      body.appendChild(footer);
    }
  }

  if (footer.parentElement && footer.previousElementSibling !== main) {
    footer.parentElement.insertBefore(main, footer);
  }

  body.dataset.layoutApplied = 'true';
}

function ensureSkipToContent() {
  initSkipToContent();
  return document.querySelector('.skip-to-content');
}

function buildSiteHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <nav class="main-nav" aria-label="Main navigation">
      <a href="/" class="logo-link">
        <img src="/images/lyrion-logo.png" alt="Lyrīon Atelier" class="logo-img">
        <span class="brand-name">LYRĪON ATELIER</span>
      </a>
      <ul class="nav-links" role="menubar">
        <li><a href="/" role="menuitem">Home</a></li>
        <li><a href="/shop" role="menuitem">Shop</a></li>
        <li><a href="/oracle" role="menuitem">Oracle</a></li>
        <li><a href="/compatibility" role="menuitem">Compatibility</a></li>
        <li><a href="/codex" role="menuitem">Codex</a></li>
        <li><a href="/contact" role="menuitem">Contact</a></li>
        <li><a href="/cart" role="menuitem">Cart</a></li>
      </ul>
    </nav>`;
  return header;
}

function setActiveNavLink(header) {
  const nav = header?.querySelector('.nav-links');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a'));
  if (!links.length) return;

  const normalizePath = (path) => {
    if (!path) return '/';
    const cleaned = path.split('#')[0].split('?')[0];
    const safePath = cleaned || '/';
    if (safePath === '/') return '/';
    return safePath.replace(/\/+$/, '').toLowerCase() || '/';
  };

  const currentPath = normalizePath(window.location.pathname);
  let bestMatch = { length: -1, link: null };

  links.forEach(link => {
    const linkPath = normalizePath(link.getAttribute('href'));
    const matchesExact = currentPath === linkPath;
    const matchesPrefix = linkPath !== '/' && currentPath.startsWith(linkPath + '/');
    if (matchesExact || matchesPrefix) {
      if (linkPath.length > bestMatch.length) {
        bestMatch = { length: linkPath.length, link };
      }
    }
  });

  links.forEach(link => link.removeAttribute('aria-current'));
  if (bestMatch.link) {
    bestMatch.link.setAttribute('aria-current', 'page');
  }
}

const FOOTER_TIKTOK_ICON = `
  <svg class="footer-social__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.5 5.5c.7 1 1.7 1.8 2.9 2v2.3c-1.1-.05-2.1-.37-2.9-.89v5.06c0 2.97-2.41 5.37-5.39 5.37A4.6 4.6 0 0 1 7 14.7c0-2.55 2.04-4.63 4.59-4.63.33 0 .65.04.96.1v2.46c-.31-.12-.65-.18-1-.18-1.12 0-2.03.93-2.03 2.15s.9 2.15 2.03 2.15c1.12 0 2.03-.93 2.03-2.15V4.5h2.62z" />
  </svg>`;

const FOOTER_YOUTUBE_ICON = `
  <svg class="footer-social__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.8 8.2s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.9-.9C16.3 5 12 5 12 5s-4.3 0-7.1.3c-.4.1-1.2.1-1.9.9-.6.6-.8 2-.8 2S2 9.8 2 11.4v1.2c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.8 1.5.8 1.9.9 2.8.3 7.1.3 7.1.3s4.3 0 7.1-.3c.4-.1 1.2-.1 1.9-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.2c0-1.6-.2-3.2-.2-3.2zM9.75 14.5v-4l3.75 2-3.75 2z" />
  </svg>`;

function buildSiteFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  const socialLinks = `
    <div class="footer-social" aria-label="Lyrion Atelier social links">
      <a class="footer-social__link" href="https://www.tiktok.com/@lyrionatelier" target="_blank" rel="noopener noreferrer" aria-label="Lyrion Atelier on TikTok">
        ${FOOTER_TIKTOK_ICON}
      </a>
      <a class="footer-social__link" href="https://www.youtube.com/@LyrionAtelier" target="_blank" rel="noopener noreferrer" aria-label="Lyrion Atelier on YouTube">
        ${FOOTER_YOUTUBE_ICON}
      </a>
    </div>`;
  footer.innerHTML = `
    <div class="footer-content">
      ${socialLinks}
      <div class="footer-links">
        <a href="/shop">Shop</a>
        <a href="/oracle">Oracle Readings</a>
        <a href="/compatibility">Compatibility Certificates</a>
        <a href="/codex">Codex</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms-of-service">Terms of Service</a>
        <a href="/refund-policy">Refund Policy</a>
      </div>
      <p>&copy; 2024 Lyrion Atelier. All rights reserved.</p>
    </div>`;
  return footer;
}

/**
 * Mobile Menu Toggle with Enhancements
 * - Slide-in animation
 * - Click outside to close
 * - Body scroll lock when open
 */
function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.nav');
  const body = document.body;
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuToggle && nav) {
    // Toggle menu on button click
    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const isActive = nav.classList.toggle('active');
      
      // Toggle body scroll lock
      if (isActive) {
        body.style.overflow = 'hidden';
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
      } else {
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (nav.classList.contains('active') && 
          !nav.contains(e.target) && 
          !mobileMenuToggle.contains(e.target)) {
        nav.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        nav.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.focus();
      }
    });
  }

  if (navToggle && navLinks) {
    const toggleNav = () => {
      const isActive = navLinks.classList.toggle('active');
      navToggle.classList.toggle('active', isActive);
      navToggle.setAttribute('aria-expanded', String(isActive));
    };

    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNav();
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Sticky Header with Shadow Effect
 * Adds visual feedback when user scrolls down the page
 */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

/**
 * Update Cart Count Badge
 * Shows the total number of items in the shopping cart
 */
function updateCartCount() {
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Show/hide badge based on cart contents
    if (totalItems === 0) {
      cartCount.style.display = 'none';
    } else {
      cartCount.style.display = 'flex';
      // Add animation when count updates
      cartCount.classList.add('cart-count-pulse');
      setTimeout(() => cartCount.classList.remove('cart-count-pulse'), 300);
    }
  }
}

/**
 * Tab Functionality
 * For product detail pages with multiple content sections
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
    
    // Add keyboard navigation for tabs
    button.addEventListener('keydown', function(e) {
      const buttons = Array.from(tabButtons);
      const currentIndex = buttons.indexOf(this);
      
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex].click();
        buttons[nextIndex].focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        buttons[prevIndex].click();
        buttons[prevIndex].focus();
      }
    });
  });
}

/**
 * Size Selector for Product Pages
 * Allows users to select clothing sizes
 */
function initSizeSelector() {
  const sizeOptions = document.querySelectorAll('.size-option');
  
  sizeOptions.forEach(option => {
    option.addEventListener('click', function() {
      sizeOptions.forEach(opt => {
        opt.classList.remove('active');
        opt.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
    });
  });
}

/**
 * Thumbnail Gallery for Product Images
 * Allows clicking thumbnails to update main product image
 */
function initThumbnailGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.querySelector('.main-image');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      // Remove active class from all thumbnails
      thumbnails.forEach(thumb => thumb.classList.remove('active'));
      
      // Add active class to clicked thumbnail
      this.classList.add('active');
      
      // Update main image with smooth transition
      const thumbnailImg = this.querySelector('img');
      const mainImg = mainImage ? mainImage.querySelector('img') : null;
      if (thumbnailImg && mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
          mainImg.src = thumbnailImg.src;
          mainImg.alt = thumbnailImg.alt;
          mainImg.style.opacity = '1';
        }, 200);
      }
    });
  });
}

/**
 * Lightbox Modal for Product Images
 * Opens image in modal with keyboard navigation
 */
function initLightbox() {
  const mainImage = document.querySelector('.main-image');
  
  if (mainImage) {
    // Create lightbox modal if it doesn't exist
    let lightbox = document.getElementById('lightbox-modal');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'lightbox-modal';
      lightbox.className = 'lightbox-modal';
      lightbox.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
          <img src="" alt="" class="lightbox-image">
        </div>
      `;
      document.body.appendChild(lightbox);
    }
    
    const lightboxImg = lightbox.querySelector('.lightbox-image');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    
    // Open lightbox when clicking main image
    mainImage.addEventListener('click', function() {
      const img = this.querySelector('img');
      if (img && img.src) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      }
    });
    
    // Close lightbox
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
    
    // Close lightbox with escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.style.display === 'flex') {
        closeLightbox();
      }
    });
    
    function closeLightbox() {
      lightbox.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
}

/**
 * Smooth Scrolling for Anchor Links
 * Provides smooth scroll behavior for internal page links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId !== '#' && targetId !== '#!') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
}

/**
 * Navigation Loading Overlay
 * Shows a loading spinner when navigating between pages
 */
function initNavigationLoading() {
  const links = document.querySelectorAll('a');
  const overlay = createLoadingOverlay();

  function shouldShowOverlay(link, event) {
    const href = link.getAttribute('href');
    const target = link.getAttribute('target');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (target === '_blank') return false;
    if (event && (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return false;
    return true;
  }

  links.forEach(link => {
    link.addEventListener('click', function(e) {
      if (shouldShowOverlay(link, e)) {
        overlay.classList.add('active');
      }
    });
  });

  window.addEventListener('beforeunload', function() {
    overlay.classList.add('active');
  });
}

function createLoadingOverlay() {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div>';
    document.body.appendChild(overlay);
  }
  return overlay;
}

const RITUAL_KEYWORDS = ['ritual', 'ceremony', 'manifestation', 'meditation', 'circle', 'healing'];

function formatListingFeeValue(value) {
  if (value === undefined || value === null) return 'Free';
  const normalized = value.toString().trim().replace(/^[^$\d]*:\s*/i, '');
  if (!normalized) return 'Free';
  const numericValue = Number(normalized.replace(/[^0-9.]/g, ''));
  if (/^free$/i.test(normalized) || numericValue === 0) return 'Free';
  return normalized.startsWith('$') ? normalized : `$${normalized}`;
}

function getPriceLabel(event) {
  const priceSource = event?.listingFee ?? event?.price;
  const raw = (priceSource ?? '').toString().trim();
  const numericValue = Number(raw.replace(/[^0-9.]/g, ''));
  if (!raw || /^free$/i.test(raw) || numericValue === 0) return 'Free';

  const locationText = (event?.location || '').toLowerCase();
  const combinedText = `${event?.title || ''} ${event?.description || ''}`.toLowerCase();
  const isOnline = locationText.includes('online') || locationText.includes('zoom');
  const hasKeyword = RITUAL_KEYWORDS.some(keyword => combinedText.includes(keyword));
  if (isOnline || hasKeyword) return 'Participation';

  return 'Ticket';
}

function getPriceDisplay(event) {
  const label = getPriceLabel(event);
  if (label === 'Free') return 'Free';
  const amount = formatListingFeeValue(event?.listingFee || event?.price);
  return `${label}: ${amount}`;
}

function resolveEventUrl(event) {
  const directUrl = (event?.url || '').trim();
  return directUrl || null;
}

// Load and display sample events
function loadEvents() {
  const eventsGrid = document.getElementById('eventsGrid');
  if (!eventsGrid) return;
  if (typeof sampleEvents === 'undefined') {
    console.warn('Sample events data not available.');
    return;
  }

  const eventsHTML = sampleEvents.map(event => {
    const priceDisplay = getPriceDisplay(event);
    const priceText = priceDisplay === 'Free' ? 'Free' : `💰 ${priceDisplay}`;
    const eventUrl = resolveEventUrl(event);
    const hasEventUrl = Boolean(eventUrl);
    const ctaLabel = 'Learn More & Register';
    const ctaHref = hasEventUrl ? eventUrl : '#';
    const ctaClass = `event-btn${hasEventUrl ? '' : ' cta-disabled'}`;
    const ctaAttrs = hasEventUrl
      ? 'target="_blank" rel="noopener noreferrer"'
      : 'aria-disabled="true" tabindex="-1" style="pointer-events: none; opacity: 0.75;"';
    return `
    <div class="event-card ${event.featured ? 'featured-event' : ''}">
      ${event.featured ? '<span class="featured-badge">Featured</span>' : ''}
      <div class="event-date">
        <span class="month">${new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
        <span class="day">${new Date(event.date).getDate()}</span>
      </div>
      <div class="event-info">
        <span class="event-category">${event.category}</span>
        <h3>${event.title}</h3>
        <p class="event-host">by ${event.host}</p>
        <p class="event-details">
          📍 ${event.location}<br>
          🕐 ${event.time}<br>
          ${priceText}
        </p>
        <p class="event-description">${event.description}</p>
        <a href="${ctaHref}" class="${ctaClass}" ${ctaAttrs}>${ctaLabel}</a>
      </div>
    </div>
  `;
  }).join('');

  eventsGrid.innerHTML = eventsHTML;
}

function hydrateCodexCards() {
  if (typeof sampleEvents === 'undefined') return;
  const eventsById = new Map(sampleEvents.map(event => [String(event.id), event]));
  const codexCards = document.querySelectorAll('.events-section .event-card[data-event-id]');
  if (!codexCards.length) return;

  codexCards.forEach(card => {
    const event = eventsById.get(card.dataset.eventId);
    if (!event) return;

    const pricePill = card.querySelector('.price-pill');
    if (pricePill) {
      const priceDisplay = getPriceDisplay(event);
      pricePill.textContent = priceDisplay === 'Free' ? 'Free' : `💰 ${priceDisplay}`;
    }

    const cta = card.querySelector('.event-cta, .event-btn');
    if (cta) {
      const url = resolveEventUrl(event);
      cta.textContent = 'Learn More & Register';
      if (url) {
        cta.href = url;
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer';
        cta.removeAttribute('aria-disabled');
        cta.style.pointerEvents = 'auto';
        cta.style.position = 'relative';
        cta.style.zIndex = '2';
      } else {
        cta.href = '#';
        cta.removeAttribute('target');
        cta.removeAttribute('rel');
        cta.setAttribute('aria-disabled', 'true');
        cta.setAttribute('tabindex', '-1');
        cta.style.pointerEvents = 'none';
        cta.style.opacity = '0.75';
      }
    }
  });
}

/**
 * Scroll-Triggered Fade-In Animations
 * Elements with 'fade-in-on-scroll' class fade in when scrolled into view
 */
function initScrollAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in-on-scroll');
  
  if (fadeElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    fadeElements.forEach(element => observer.observe(element));
  }
}

/**
 * Form Validation Initialization
 * Adds real-time validation to contact and checkout forms
 */
function initFormValidation() {
  const forms = document.querySelectorAll('form[data-validate="true"], .contact-form, #checkout-form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Validate on blur
      input.addEventListener('blur', function() {
        validateField(this);
      });
      
      // Clear error on input
      input.addEventListener('input', function() {
        if (this.classList.contains('error')) {
          this.classList.remove('error');
          const errorMsg = this.parentElement.querySelector('.error-message');
          if (errorMsg) {
            errorMsg.remove();
          }
        }
      });
    });
    
    // Validate on submit
    form.addEventListener('submit', function(e) {
      let isValid = true;
      
      inputs.forEach(input => {
        if (!validateField(input)) {
          isValid = false;
        }
      });
      
      if (!isValid) {
        e.preventDefault();
        const firstError = form.querySelector('.error');
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });
}

/**
 * Validate Individual Form Field
 * Returns true if valid, false if invalid
 */
function validateField(field) {
  // Remove existing error message
  const existingError = field.parentElement.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  field.classList.remove('error');
  
  // Skip validation if field is not required and empty
  if (!field.hasAttribute('required') && !field.value.trim()) {
    return true;
  }
  
  let errorMessage = '';
  
  // Required field validation
  if (field.hasAttribute('required') && !field.value.trim()) {
    errorMessage = 'This field is required';
  }
  
  // Email validation
  else if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value.trim())) {
      errorMessage = 'Please enter a valid email address';
    }
  }
  
  // Phone validation (if applicable)
  else if (field.type === 'tel' && field.value.trim()) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(field.value.trim()) || field.value.trim().length < 10) {
      errorMessage = 'Please enter a valid phone number';
    }
  }
  
  // Minimum length validation
  else if (field.hasAttribute('minlength')) {
    const minLength = parseInt(field.getAttribute('minlength'));
    if (field.value.trim().length < minLength) {
      errorMessage = `Minimum ${minLength} characters required`;
    }
  }
  
  // Display error if validation failed
  if (errorMessage) {
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = errorMessage;
    errorDiv.style.color = '#dc2626';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    field.parentElement.appendChild(errorDiv);
    return false;
  }
  
  return true;
}

/**
 * Show Toast Notification
 * Displays a temporary message to the user
 */
function showToast(message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Add icon based on type
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('toast-show'), 10);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show Loading State
 * Displays a loading spinner for async operations
 */
function showLoading(element) {
  if (element) {
    element.classList.add('loading');
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = '<span class="spinner"></span> Loading...';
  }
}

/**
 * Hide Loading State
 * Removes loading spinner and restores original content
 */
function hideLoading(element) {
  if (element && element.classList.contains('loading')) {
    element.classList.remove('loading');
    element.disabled = false;
    element.textContent = element.dataset.originalText || 'Submit';
  }
}

/**
 * Skip to Content Link
 * Improves accessibility by allowing keyboard users to skip navigation
 */
function initSkipToContent() {
  // Check if skip link already exists
  if (!document.querySelector('.skip-to-content')) {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('tabindex', '0');
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      const mainContent = document.querySelector('main') || document.getElementById('main-content');
      if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/**
 * Email Signup Form Handler
 * Handles newsletter subscription with validation and feedback
 */
function handleEmailSignup(event) {
  event.preventDefault();
  const form = event.target;
  const emailInput = form.querySelector('input[type="email"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  if (!emailInput || !validateField(emailInput)) {
    return;
  }
  
  const email = emailInput.value;
  
  // Show loading state
  showLoading(submitBtn);
  
  // Simulate API call with timeout
  setTimeout(() => {
    hideLoading(submitBtn);
    showToast(`Thank you for subscribing! We'll send cosmic insights to ${email}`, 'success');
    form.reset();
  }, 1000);
}
