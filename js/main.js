// Lyrion Atelier - Main JavaScript

/**
 * Main initialization on DOM content loaded
 * Sets up all interactive features and event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
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
  
  // Initialize scroll-triggered fade-in animations
  initScrollAnimations();
  
  // Initialize form validation
  initFormValidation();
  
  // Initialize "Skip to Content" link
  initSkipToContent();
});

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
}

/**
 * Sticky Header with Shadow Effect
 * Adds visual feedback when user scrolls down the page
 */
function initStickyHeader() {
  const header = document.querySelector('.header');
  
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

/**
 * Contact Form Handler
 * Handles contact form submission with validation and feedback
 */
function handleContactForm(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Show loading state
  showLoading(submitBtn);
  
  // Simulate API call with timeout
  setTimeout(() => {
    hideLoading(submitBtn);
    showToast('Thank you for your message! We will get back to you soon.', 'success');
    form.reset();
  }, 1000);
}
