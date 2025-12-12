// Lyrion Atelier - Main JavaScript

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.nav');
  
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('active');
      });
    });
  }
  
  // Header shadow on scroll
  const header = document.querySelector('.header');
  
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Update cart count
  updateCartCount();
  
  // Tab functionality
  initTabs();
  
  // Size selector
  initSizeSelector();
  
  // Thumbnail gallery
  initThumbnailGallery();
});

// Cart Count Update
function updateCartCount() {
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (totalItems === 0) {
      cartCount.style.display = 'none';
    } else {
      cartCount.style.display = 'flex';
    }
  }
}

// Tab Functionality
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// Size Selector
function initSizeSelector() {
  const sizeOptions = document.querySelectorAll('.size-option');
  
  sizeOptions.forEach(option => {
    option.addEventListener('click', function() {
      sizeOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// Thumbnail Gallery
function initThumbnailGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.querySelector('.main-image');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      // Remove active class from all thumbnails
      thumbnails.forEach(thumb => thumb.classList.remove('active'));
      
      // Add active class to clicked thumbnail
      this.classList.add('active');
      
      // Update main image (if images are present)
      const thumbnailImg = this.querySelector('img');
      const mainImg = mainImage.querySelector('img');
      if (thumbnailImg && mainImg) {
        mainImg.src = thumbnailImg.src;
      }
    });
  });
}

// Email signup form
function handleEmailSignup(event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value;
  alert(`Thank you for subscribing! We'll send cosmic insights to ${email}`);
  event.target.reset();
}

// Contact form
function handleContactForm(event) {
  event.preventDefault();
  alert('Thank you for your message! We will get back to you soon.');
  event.target.reset();
}
