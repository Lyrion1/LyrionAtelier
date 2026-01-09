// Lyrīon Atelier - Main JavaScript

const NAV_VERSION = 'nav-v4';
const SITE_ORIGIN = 'https://lyrionatelier.com';
const OG_IMAGE = `${SITE_ORIGIN}/images/og-image.jpg`;
const SEO_KEYWORDS = 'astrology, zodiac, luxury apparel, oracle readings, birth chart, horoscope, cosmic fashion, spiritual guidance';
const SEO_TEMPLATES = {
  '/': {
    title: 'Lyrīon Atelier - Luxury Astrology, Oracle Readings & Zodiac Apparel',
    description: 'Discover your cosmic destiny with personalized oracle readings and wear your celestial identity with luxury zodiac apparel. Astrology-inspired fashion and mystical guidance.'
  },
  '/shop': {
    title: 'Luxury Zodiac Apparel - Hoodies, Tees & Accessories | Lyrīon Atelier',
    description: 'Premium astrology-themed apparel for every zodiac sign. Cosmic hoodies, celestial tees, and mystical accessories designed with intention. Free shipping over $50.'
  },
  '/oracle': {
    title: 'Personalized Oracle Readings - Birth Chart Analysis | Lyrīon Atelier',
    description: 'Professional astrology readings from expert astrologers. Life path guidance, compatibility analysis, and cosmic forecasts. Delivered in 48 hours.'
  },
  '/compatibility': {
    title: 'Astrological Compatibility Reading - Cosmic Love Analysis | Lyrīon Atelier',
    description: 'Discover your cosmic connection. Personalized compatibility analysis for couples. Available as digital certificate, luxury print, or museum-quality framed art.'
  },
  '/codex': {
    title: 'Lyrīon Atelier Codex | Cosmic Knowledge & Guidance',
    description: 'Dive into the Lyrīon Atelier codex for cosmic guidance, rituals, and stories behind our zodiac-inspired creations.'
  },
  '/contact': {
    title: 'Contact Lyrīon Atelier | Astrology & Oracle Support',
    description: 'Reach the Lyrīon Atelier team for oracle readings, order support, and cosmic concierge assistance.'
  }
};

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

   const ensureMeta = (attributes) => {
    const selector = Object.entries(attributes)
      .map(([key, value]) => `[${key.toLowerCase()}="${value}"]`)
      .join('');
    let tag = head.querySelector(`meta${selector}`);
    if (!tag) {
      tag = document.createElement('meta');
      Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
      head.appendChild(tag);
    } else if (attributes.content) {
      tag.setAttribute('content', attributes.content);
    }
    return tag;
  };

  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    head.prepend(meta);
  } else if (!/width=device-width/.test(viewport.getAttribute('content') || '')) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
  }

  ensureMeta({ charset: 'UTF-8' });
  ensureMeta({ 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' });
  ensureMeta({ name: 'author', content: 'Lyrīon Atelier' });
  ensureMeta({ 'http-equiv': 'Cache-Control', content: 'max-age=31536000' });

  [
    { href: 'https://fonts.googleapis.com' },
    { href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { href: 'https://api.stripe.com' }
  ].forEach(({ href, crossorigin }) => {
    if (!head.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      if (crossorigin) link.crossOrigin = crossorigin;
      head.appendChild(link);
    }
  });

  ensureAnalytics();
})();

/**
 * Main initialization on DOM content loaded
 * Sets up all interactive features and event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('loaded');
  applySharedLayout();
  ensureSeoMetadata();
  ensureAnalytics();
  enhanceImages();
  
  // Mobile menu is initialized in applySharedLayout via initInlineNavToggle
  
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

  const needsNewHeader = !existingHeader || existingHeader.dataset.navVersion !== NAV_VERSION;
  const header = needsNewHeader ? buildSiteHeader() : existingHeader;
  if (existingHeader && needsNewHeader) {
    existingHeader.replaceWith(header);
  } else if (skipLink && skipLink.parentElement === body) {
    skipLink.insertAdjacentElement('afterend', header);
  } else {
    body.insertBefore(header, body.firstChild);
  }
  setActiveNavLink(header);
  if (header.querySelector('.nav-toggle')) {
    initInlineNavToggle(header);
  }

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
  header.dataset.navVersion = NAV_VERSION;
  header.innerHTML = `
    <nav class="main-nav" aria-label="Main navigation">
    <a href="/" class="logo-link">
    <img src="/images/lyrion-logo.png" alt="Lyrīon Atelier" class="logo-img">
    <span class="brand-name">LYRĪON ATELIER</span>
    </a>
    
    <button class="nav-toggle" aria-expanded="false" aria-label="Toggle navigation" aria-controls="primary-nav">☰</button>
    
    <div class="nav-links" id="primary-nav" aria-hidden="true">
    <a href="/">Home</a>
    <a href="/shop">Shop All</a>
    <div class="mobile-dropdown">
      <button class="dropdown-toggle" type="button" aria-expanded="false">Shop Categories ▼</button>
      <div class="dropdown-content" aria-hidden="true">
        <a href="/shop">All Products</a>
        <a href="/shop?zodiac=aries">Aries</a>
        <a href="/shop?zodiac=taurus">Taurus</a>
        <a href="/shop?zodiac=gemini">Gemini</a>
        <a href="/shop?zodiac=cancer">Cancer</a>
        <a href="/shop?zodiac=leo">Leo</a>
        <a href="/shop?zodiac=virgo">Virgo</a>
        <a href="/shop?zodiac=libra">Libra</a>
        <a href="/shop?zodiac=scorpio">Scorpio</a>
        <a href="/shop?zodiac=sagittarius">Sagittarius</a>
        <a href="/shop?zodiac=capricorn">Capricorn</a>
        <a href="/shop?zodiac=aquarius">Aquarius</a>
        <a href="/shop?zodiac=pisces">Pisces</a>
      </div>
    </div>
    <a href="/curated-for-gifting">Curated for Gifting</a>
    <a href="/oracle">Oracle</a>
    <a href="/compatibility">Compatibility</a>
    <a href="/codex">Codex</a>
    <a href="/contact">Contact</a>
    <a href="/cart" class="cart-icon">Cart <span class="cart-count" aria-live="polite" style="display:none;">0</span></a>
    </div>
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

function ensureAnalytics() {
  const head = document.head || document.body;
  if (!head) return;

  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
    head.appendChild(gtagScript);
  }

  if (!document.querySelector('script[data-gtag-inline]')) {
    const inline = document.createElement('script');
    inline.setAttribute('data-gtag-inline', 'true');
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    `;
    head.appendChild(inline);
  }

  if (!document.querySelector('script[data-fb-pixel]')) {
    const fb = document.createElement('script');
    fb.setAttribute('data-fb-pixel', 'true');
    fb.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', 'YOUR_PIXEL_ID');
      fbq('track', 'PageView');
    `;
    head.appendChild(fb);
  }
}

function normalizePathname(pathname = '/') {
  const normalized = pathname.replace(/\\/g, '/').replace(/\/index\.html$/, '/').replace(/\/+$/, '');
  return normalized || '/';
}

function getSeoTemplate(pathname) {
  const normalized = normalizePathname(pathname);
  if (SEO_TEMPLATES[normalized]) return SEO_TEMPLATES[normalized];
  if (normalized.startsWith('/shop/')) {
    const name = (document.querySelector('#product-name')?.textContent || 'Zodiac Apparel').trim();
    const title = `${name} | Lyrīon Atelier - Luxury Astrology & Zodiac Apparel`;
    const description = (document.querySelector('#product-description')?.textContent || 'Premium zodiac apparel featuring celestial symbolism from Lyrīon Atelier.').trim();
    return { title, description };
  }
  return {
    title: document.title || 'Lyrīon Atelier - Luxury Astrology, Oracle Readings & Zodiac Apparel',
    description: 'Explore luxury zodiac apparel, oracle readings, and cosmic guidance from Lyrīon Atelier.'
  };
}

function initInlineNavToggle(header) {
  const navToggle = header?.querySelector('.nav-toggle');
  const navLinks = header?.querySelector('.nav-links');
  if (!navToggle || !navLinks) return;

  const getFocusables = () => [
    navToggle,
    ...navLinks.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
  ];

  const closeMenu = () => {
    navLinks.classList.remove('active');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.setAttribute('aria-hidden', 'true');
    navToggle.textContent = '☰';
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    navLinks.classList.add('active');
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navLinks.setAttribute('aria-hidden', 'false');
    navToggle.textContent = '×';
    document.body.style.overflow = 'hidden';
    const firstLink = navLinks.querySelector('a');
    firstLink?.focus();
  };

  const toggleMenu = () => {
    if (navLinks.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  navToggle.addEventListener('click', toggleMenu);

  navToggle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleMenu();
    }
  });

  // Close menu when clicking on a nav link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    if (navLinks.classList.contains('active') && !header.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks.classList.contains('active')) {
      event.preventDefault();
      closeMenu();
      navToggle.focus();
    }
  });

  header.addEventListener('keydown', (event) => {
    if (!navLinks.classList.contains('active') || event.key !== 'Tab') return;
    const focusables = getFocusables();
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Initialize mobile dropdown toggles
  initMobileDropdowns(header);
}

/**
 * Initialize mobile dropdown functionality for Shop categories
 */
function initMobileDropdowns(container) {
  const dropdownToggles = container?.querySelectorAll('.dropdown-toggle');
  if (!dropdownToggles) return;

  dropdownToggles.forEach(toggle => {
    const dropdown = toggle.closest('.mobile-dropdown');
    const content = dropdown?.querySelector('.dropdown-content');
    if (!content) return;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = content.classList.toggle('active');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      content.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      
      // Update toggle text indicator
      if (isOpen) {
        toggle.textContent = toggle.textContent.replace('▼', '▲');
      } else {
        toggle.textContent = toggle.textContent.replace('▲', '▼');
      }
    });

    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle.click();
      }
    });
  });
}

function ensureJsonLd(id, data) {
  if (!data) return;
  const head = document.head || document.body;
  if (!head) return;
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function ensureSeoMetadata() {
  const head = document.head;
  if (!head) return;

  const pathname = normalizePathname(window.location.pathname);
  const seo = getSeoTemplate(pathname);
  const canonicalHref = `${SITE_ORIGIN}${pathname}`;

  document.title = seo.title;

  const upsertMeta = (attr, content, key = 'name') => {
    if (!content) return;
    let tag = head.querySelector(`meta[${key}="${attr}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(key, attr);
      head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  const upsertLink = (rel, href, extra = {}) => {
    if (!href) return;
    let link = head.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      head.appendChild(link);
    }
    link.href = href;
    Object.entries(extra).forEach(([k, v]) => {
      link.setAttribute(k, v);
    });
  };

  upsertMeta('title', seo.title);
  upsertMeta('description', seo.description);
  upsertMeta('keywords', SEO_KEYWORDS);
  upsertMeta('author', 'Lyrīon Atelier');
  upsertMeta('twitter:card', 'summary_large_image', 'name');
  upsertMeta('twitter:title', seo.title, 'name');
  upsertMeta('twitter:description', seo.description, 'name');
  upsertMeta('twitter:image', OG_IMAGE, 'name');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:url', canonicalHref, 'property');
  upsertMeta('og:title', seo.title, 'property');
  upsertMeta('og:description', seo.description, 'property');
  upsertMeta('og:image', OG_IMAGE, 'property');
  upsertMeta('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
  upsertMeta('Cache-Control', 'max-age=31536000', 'http-equiv');
  upsertMeta('X-UA-Compatible', 'IE=edge', 'http-equiv');

  upsertLink('canonical', canonicalHref);
  upsertLink('icon', '/images/favicon/favicon.png');
  upsertLink('apple-touch-icon', '/images/favicon/favicon.png');

  if (pathname === '/') {
    ensureJsonLd('ldjson-store', {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": "Lyrīon Atelier",
      "description": "Luxury astrology apparel and oracle readings",
      "url": SITE_ORIGIN,
      "logo": `${SITE_ORIGIN}/images/lyrion-logo.png`,
      "sameAs": [
        "https://www.youtube.com/@LyrionAtelier",
        "https://www.instagram.com/lyrionatelier?igsh=cG85eGhodzJkb2Jj&utm_source=qr"
      ],
      "priceRange": "$$-$$$"
    });
  }

  if (pathname.startsWith('/shop/')) {
    const name = (document.querySelector('#product-name')?.textContent || 'Zodiac Apparel').trim();
    const description = (document.querySelector('#product-description')?.textContent || seo.description).trim();
    const image = document.querySelector('#product-gallery img')?.src || OG_IMAGE;
    const price = (document.querySelector('#product-price')?.textContent || '').replace(/[^\d.]/g, '') || '0';
    ensureJsonLd('ldjson-product', {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description,
      "image": image.startsWith('http') ? image : `${SITE_ORIGIN}${image}`,
      "brand": {
        "@type": "Brand",
        "name": "Lyrīon Atelier"
      },
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": canonicalHref
      }
    });
  }
}

function enhanceImages() {
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    const applyDimensions = () => {
      if (!img.getAttribute('width') && img.naturalWidth) img.setAttribute('width', img.naturalWidth.toString());
      if (!img.getAttribute('height') && img.naturalHeight) img.setAttribute('height', img.naturalHeight.toString());
    };
    if (img.complete) {
      applyDimensions();
    } else {
      img.addEventListener('load', applyDimensions, { once: true });
    }
  });
}

const FOOTER_YOUTUBE_ICON = `
  <svg class="footer-social__icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.8 8.2s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.9-.9C16.3 5 12 5 12 5s-4.3 0-7.1.3c-.4.1-1.2.1-1.9.9-.6.6-.8 2-.8 2S2 9.8 2 11.4v1.2c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.8 1.5.8 1.9.9 2.8.3 7.1.3 7.1.3s4.3 0 7.1-.3c.4-.1 1.2-.1 1.9-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.2c0-1.6-.2-3.2-.2-3.2zM9.75 14.5v-4l3.75 2-3.75 2z" />
  </svg>`;

const FOOTER_INSTAGRAM_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="footer-social__icon">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>`;

function buildSiteFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  const socialLinks = `
    <div class="footer-social" aria-label="Lyrion Atelier social links">
      <a class="footer-social__link" href="https://www.youtube.com/@LyrionAtelier" target="_blank" rel="noopener noreferrer" aria-label="Lyrion Atelier on YouTube">
        ${FOOTER_YOUTUBE_ICON}
      </a>
      <a class="footer-social__link" href="https://www.instagram.com/lyrionatelier?igsh=cG85eGhodzJkb2Jj&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Lyrion Atelier on Instagram">
        ${FOOTER_INSTAGRAM_ICON}
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
 * - Full-screen overlay menu
 * - Click outside to close
 * - Body scroll lock when open
 * - Toggle button text between ☰ and ×
 */
function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.hamburger') ||
    document.querySelector('.mobile-menu-toggle') ||
    document.querySelector('.nav-toggle') ||
    document.querySelector('#menu-toggle');
  const nav = document.querySelector('.mobile-nav') ||
    document.querySelector('.nav-menu') ||
    document.querySelector('.nav-links') ||
    document.querySelector('.nav') ||
    document.querySelector('nav ul');
  const navLinksEl = document.querySelector('.nav-links') || nav;
  const body = document.body;

  if (mobileMenuToggle && nav) {
    // Toggle menu on button click
    mobileMenuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const isActive = nav.classList.toggle('active');
      if (navLinksEl && navLinksEl !== nav) {
        navLinksEl.classList.toggle('active', isActive);
      }
      mobileMenuToggle.classList.toggle('active');
      mobileMenuToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      nav.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      navLinksEl?.setAttribute?.('aria-hidden', isActive ? 'false' : 'true');
      
      // Toggle button text
      mobileMenuToggle.textContent = isActive ? '×' : '☰';
      
      // Toggle body scroll lock
      if (isActive) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    });
    
    // Close menu when clicking on a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('active');
        navLinksEl?.classList?.remove('active');
        mobileMenuToggle.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.textContent = '☰';
        nav.setAttribute('aria-hidden', 'true');
        navLinksEl?.setAttribute?.('aria-hidden', 'true');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (nav.classList.contains('active') && 
          !nav.contains(e.target) && 
          !mobileMenuToggle.contains(e.target)) {
        nav.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.textContent = '☰';
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        nav.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        body.style.overflow = '';
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.textContent = '☰';
        mobileMenuToggle.focus();
      }
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
/**
 * Ensures a cart badge element exists on the cart link and returns it.
 * Creates the badge if missing; returns null when no cart link is present.
 * @returns {HTMLElement|null}
 */
function ensureCartBadge() {
  const cartLink =
    document.querySelector('a[href="/cart"].cart-icon') ||
    document.querySelector('.nav-links a[href="/cart"]');
  if (!cartLink) return null;
  let cartCount = cartLink.querySelector('.cart-count');
  if (!cartCount) {
    cartCount = document.createElement('span');
    cartCount.className = 'cart-count';
    cartCount.textContent = '0';
    cartCount.style.display = 'none';
    cartLink.appendChild(cartCount);
  }
  return cartCount;
}

function updateCartCount() {
  const cartCount = ensureCartBadge();
  if (!cartCount) return;

  let cart = [];
  try {
    const storedCart = localStorage.getItem('cart');
    cart = JSON.parse(storedCart && storedCart.trim() ? storedCart : '[]');
  } catch {
    cart = [];
  }
  let invalidQuantityCount = 0;
  const totalItems = cart.reduce((sum, item) => {
    const hasValidQuantity = Number.isFinite(item.quantity);
    const qty = hasValidQuantity ? item.quantity : 1;
    if (!hasValidQuantity) invalidQuantityCount += 1;
    return sum + qty;
  }, 0);
  if (invalidQuantityCount) {
    console.warn(`[cart] ${invalidQuantityCount} item(s) missing valid quantity, defaulting to 1`);
  }
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

document.addEventListener('cart:updated', updateCartCount);

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
const PREMIUM_LISTING_THRESHOLD = 300;
const FEATURED_LISTING_THRESHOLD = 150;

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

function extractNumericValue(candidate) {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === 'string') {
    const match = candidate.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const numeric = Number(match[0]);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function parseEventValue(event) {
  const numericFields = [event?.listingValue];
  for (const candidate of numericFields) {
    const numeric = extractNumericValue(candidate);
    if (numeric !== null) return numeric;
  }

  const priceFields = [event?.listingFee, event?.price, event?.priceUSD];
  for (const candidate of priceFields) {
    const numeric = extractNumericValue(candidate);
    if (numeric !== null) return numeric;
  }

  return 0;
}

function getEventTier(event) {
  const value = parseEventValue(event);
  let tier = 'standard';

  if (value >= PREMIUM_LISTING_THRESHOLD) {
    tier = 'premium';
  } else if (value >= FEATURED_LISTING_THRESHOLD) {
    tier = 'featured';
  }

  if (event?.featured && tier === 'standard') {
    tier = 'featured';
  }

  return tier;
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
    const tier = getEventTier(event);
    const tierClass =
      tier === 'premium' ? 'premium-card' : tier === 'featured' ? 'featured-card' : 'standard-card';
    const ctaLabel = 'Learn More & Register';
    const ctaHref = hasEventUrl ? eventUrl : '#';
    const ctaClass = `event-btn${hasEventUrl ? '' : ' cta-disabled'}`;
    const ctaAttrs = hasEventUrl
      ? 'target="_blank" rel="noopener noreferrer"'
      : 'aria-disabled="true" tabindex="-1" style="pointer-events: none; opacity: 0.75;"';
    return `
    <div class="event-card ${tierClass} ${event.featured ? 'featured-event' : ''}" data-event-id="${event.id}" data-event-tier="${tier}">
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

    const tier = getEventTier(event);
    if (tier) {
      card.dataset.eventTier = tier;
      card.classList.remove('premium-card', 'featured-card', 'standard-card');
      card.classList.add(`${tier}-card`);
    }

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
