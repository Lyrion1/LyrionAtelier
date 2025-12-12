# Lyrīon Atelier

Celestial oracle readings and astrological guidance for the US market - Lyrīon Atelier's digital storefront.

A modern, accessible e-commerce website featuring astrology-themed clothing and oracle reading services, built with vanilla JavaScript, HTML, and CSS. Optimized for performance and ready for deployment on Netlify with Stripe payment integration.

## ✨ Features

### 🛒 Shopping Cart
- localStorage-based cart with persistence across page loads
- Add/remove items with real-time updates
- Quantity adjustment controls
- Cart count badge with pulse animation
- Toast notifications for user feedback
- Free shipping on orders over $50

### 🔍 Product Filtering
- Filter by product type (T-shirts, Hoodies, Sweatshirts)
- Filter by zodiac sign (all 12 signs)
- Price range filtering with debounced input
- URL parameter updates for shareable filter states
- Smooth animations during filtering
- Real-time results count display

### 🖼️ Product Gallery
- Thumbnail gallery with smooth transitions
- Lightbox modal for full-size images
- Keyboard navigation (Escape to close)
- Click outside to close
- Responsive image loading with lazy load

### 📱 Mobile Navigation
- Smooth slide-in animation
- Click outside to close
- Body scroll lock when menu is open
- Escape key support
- Accessible ARIA labels

### ✅ Form Validation
- Real-time field validation
- Email format checking
- Phone number validation
- Required field checking
- Visual error states with messages
- Success feedback with toast notifications

### 🎨 Smooth Behaviors
- Smooth scrolling for anchor links
- Sticky header with shadow on scroll
- Loading states for async operations
- Scroll-triggered fade-in animations using IntersectionObserver
- Product card staggered animations

### 💳 Stripe Integration
- Secure checkout page
- Test mode banner for development
- Comprehensive setup instructions
- Stripe Elements mounting (documented)
- Payment intent handling (documented)

### 🚀 Performance Optimizations
- Lazy loading for images
- Deferred script loading
- Font display swap
- Preconnect to external domains
- Optimized CSS animations
- Debounced filter inputs

### ♿ Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus-visible states
- Skip to content link
- Screen reader only content with .sr-only
- Semantic HTML structure
- aria-live regions for dynamic content

### 📊 SEO & Metadata
- Unique meta titles and descriptions
- Open Graph tags for social sharing
- Twitter card metadata
- JSON-LD structured data
- robots.txt for search engine crawling
- Sitemap.xml for indexing

### 🌐 Netlify Ready
- netlify.toml configuration
- _redirects for clean URLs
- Netlify Forms integration
- Security headers configured
- Cache control policies

## 📦 Products

The site features 20 unique products across three categories:
- **T-Shirts**: 8 products ($32.99 - $36.99)
- **Hoodies**: 6 products ($59.99 - $64.99)
- **Sweatshirts**: 6 products ($44.99 - $47.99)

Plus 8 oracle reading services ($44 - $75) including:
- Past Life Reading
- Career Compass Reading
- Love Forecast Reading
- Spiritual Awakening Reading
- Life Purpose Reading
- Year Ahead Reading
- Soul Mate Connection
- Ancestral Wisdom Reading

## 🛠️ Setup Instructions

### Prerequisites
- A web browser (Chrome, Firefox, Safari, Edge)
- A text editor (VS Code, Sublime Text, etc.)
- (Optional) A local web server for development

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lyrion1/LyrionAtelier.git
   cd LyrionAtelier
   ```

2. **Open in a browser**
   - Simply open `index.html` in your web browser
   - Or use a local development server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   
   # Using PHP
   php -S localhost:8000
   ```

3. **No build process required!**
   - This is a vanilla JavaScript project with no dependencies
   - All files are ready to use as-is

## 🎨 Adding New Products

To add a new product to the shop:

1. Open `js/products.js`
2. Add a new product object to the `products` array:
   ```javascript
   {
     id: 21, // Unique ID
     name: "Product Name",
     price: 39.99,
     category: "tshirt", // or "hoodie", "sweatshirt"
     zodiac: "aries", // lowercase zodiac sign
     image: null, // or path to image: "/images/product-21.jpg"
     description: "Detailed product description here.",
     sizes: ["XS", "S", "M", "L", "XL", "XXL"]
   }
   ```

3. Save the file - the product will automatically appear on the shop page

### Product Image Guidelines
- **Format**: JPEG or PNG
- **Dimensions**: 800x800px minimum (1:1 aspect ratio)
- **File size**: Under 200KB for optimal loading
- **Location**: Place images in `/images/products/`
- **Naming**: Use descriptive names like `aries-fire-tee.jpg`

## 💳 Stripe Configuration

To enable real payment processing:

### 1. Sign up for Stripe
- Go to [https://stripe.com](https://stripe.com)
- Create an account
- Get your API keys from the Dashboard

### 2. Create `js/stripe-checkout.js`
```javascript
// Initialize Stripe with your publishable key
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY');
const elements = stripe.elements();

// Create card element
const cardElement = elements.create('card', {
  style: {
    base: {
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      '::placeholder': { color: '#94a3b8' }
    },
    invalid: { color: '#ef4444' }
  }
});
cardElement.mount('#card-element');

// Handle errors
cardElement.on('change', (event) => {
  const displayError = document.getElementById('card-errors');
  displayError.textContent = event.error ? event.error.message : '';
});

// Handle form submission
const form = document.getElementById('checkout-form');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const submitBtn = form.querySelector('button[type="submit"]');
  showLoading(submitBtn);
  
  // Create payment intent on your backend
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: calculateTotal() * 100, // Amount in cents
      currency: 'usd'
    })
  });
  
  const { clientSecret } = await response.json();
  
  // Confirm payment
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: document.getElementById('full-name').value,
        email: document.getElementById('email').value
      }
    }
  });
  
  hideLoading(submitBtn);
  
  if (error) {
    showToast(error.message, 'error');
  } else if (paymentIntent.status === 'succeeded') {
    localStorage.removeItem('cart');
    showToast('Payment successful!', 'success');
    setTimeout(() => window.location.href = 'index.html', 2000);
  }
});

function calculateTotal() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  return subtotal + shipping;
}
```

### 3. Create Backend Endpoint
You'll need a backend to create payment intents. Example using Node.js + Express:

```javascript
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### 4. Add Script to checkout.html
```html
<script src="js/stripe-checkout.js"></script>
```

### 5. Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date
- Any 3-digit CVC

## 🌐 Netlify Deployment

### One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Lyrion1/LyrionAtelier)

### Manual Deployment

1. **Connect to GitHub**
   - Log in to [Netlify](https://app.netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select this repository

2. **Configure Build Settings**
   - Build command: (leave empty)
   - Publish directory: `.` (root)
   - Click "Deploy site"

3. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add your Stripe keys:
     - `STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_SECRET_KEY`

4. **Configure Domain**
   - Go to Domain settings
   - Add your custom domain (optional)
   - Netlify will automatically provision SSL certificate

5. **Enable Forms**
   - Forms are automatically detected via `data-netlify="true"`
   - View submissions in Netlify Dashboard > Forms

### Netlify Features Enabled
- ✅ Clean URLs (no .html extension)
- ✅ HTTPS redirect
- ✅ Security headers
- ✅ Cache control
- ✅ Form handling
- ✅ 404 page

## 📁 Project Structure

```
LyrionAtelier/
├── index.html              # Homepage
├── shop.html               # Product listing page
├── product.html            # Individual product page
├── cart.html               # Shopping cart
├── checkout.html           # Checkout with Stripe
├── contact.html            # Contact form (Netlify Forms)
├── oracle.html             # Oracle readings
├── codex.html              # Astrology information
├── css/
│   └── style.css          # All styles (888+ lines)
├── js/
│   ├── main.js            # Core functionality
│   ├── products.js        # Product data & display
│   └── cart.js            # Shopping cart logic
├── netlify.toml           # Netlify configuration
├── _redirects             # URL rewrites
├── robots.txt             # Search engine directives
├── sitemap.xml            # SEO sitemap
└── README.md              # This file
```

## 🎯 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔧 Customization

### Colors
Edit CSS variables in `css/style.css`:
```css
:root {
  --purple: #8b5cf6;
  --gold: #fbbf24;
  --dark-bg: #0f172a;
  --dark-purple: #1e1b4b;
  --white: #ffffff;
  --gray-light: #e2e8f0;
  --gray-medium: #64748b;
}
```

### Fonts
Currently using Google Fonts:
- Headings: Cinzel (serif)
- Body: Inter (sans-serif)

Change in `css/style.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=YourFont&display=swap');
```

### Shipping Calculation
Edit in `js/cart.js`:
```javascript
const shipping = subtotal > 50 ? 0 : 5.99; // Free over $50
```

## 🐛 Known Issues

- Product images are placeholders (add real images to `/images/products/`)
- Stripe integration requires backend implementation
- Oracle readings booking is placeholder (add real booking system)

## 📝 License

© 2024 Lyrīon Atelier. All rights reserved.

## 🤝 Contributing

This is a private repository. If you have access and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📧 Support

For questions or issues, contact: info@lyrionatelier.com

---

Made with cosmic energy ✨
