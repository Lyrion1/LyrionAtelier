/**
 * Lyrīon Atelier - Spinning Wheel Fortune Game
 * Cosmic fortune wheel for first-time visitors with discount prizes
 */

(function() {
  'use strict';

  // Configuration
  const WHEEL_CONFIG = {
    STORAGE_KEY: 'lyrion_wheel_last_spin',
    DISCOUNT_KEY: 'lyrion_wheel_discount',
    HOURS_BETWEEN_SPINS: 24,
    POPUP_DELAY_MS: 5000,
    SPIN_DURATION_MS: 4000,
    SPIN_ROTATIONS: 5,
    DISCOUNT_EXPIRY_DAYS: 7
  };

  // Prize segments with probability weights (must sum to 100)
  const PRIZES = [
    { id: 'off10', label: '10% Off', weight: 30, type: 'discount', value: 10 },
    { id: 'freeship', label: 'Free Shipping', weight: 25, type: 'shipping', value: 0 },
    { id: 'off5', label: '$5 Off', weight: 20, type: 'fixed', value: 5 },
    { id: 'off15', label: '15% Off', weight: 10, type: 'discount', value: 15 },
    { id: 'mystery', label: 'Mystery Gift', weight: 8, type: 'mystery', value: 0 },
    { id: 'reading', label: 'Free Reading Preview', weight: 5, type: 'reading', value: 0 },
    { id: 'luck', label: 'Better Luck!', weight: 1, type: 'luck', value: 5 },
    { id: 'off20', label: '20% Off', weight: 1, type: 'discount', value: 20 }
  ];

  // Brand colors
  const COLORS = {
    purple: '#302b63',
    purpleDark: '#24243e',
    gold: '#d4af37',
    goldLight: '#f0c659',
    navy: '#0f0c29'
  };

  // Astrology memes for "Better Luck" prize
  const ASTROLOGY_MEMES = [
    { text: "Mercury is in retrograde... but your luck isn't!", alt: "Mercury retrograde meme" },
    { text: "The stars aligned... just not for jackpots today!", alt: "Stars alignment meme" },
    { text: "Your horoscope said try again tomorrow!", alt: "Horoscope meme" }
  ];

  let wheelCanvas = null;
  let wheelCtx = null;
  let currentRotation = 0;
  let isSpinning = false;

  /**
   * Generate a unique discount code
   */
  function generateDiscountCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'COSMIC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get expiry date (7 days from now)
   */
  function getExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  /**
   * Check if user can spin (24 hour cooldown)
   */
  function canUserSpin() {
    try {
      const lastSpin = localStorage.getItem(WHEEL_CONFIG.STORAGE_KEY);
      if (!lastSpin) return true;
      
      const lastSpinTime = parseInt(lastSpin, 10);
      const now = Date.now();
      const hoursSinceLastSpin = (now - lastSpinTime) / (1000 * 60 * 60);
      
      return hoursSinceLastSpin >= WHEEL_CONFIG.HOURS_BETWEEN_SPINS;
    } catch {
      return true;
    }
  }

  /**
   * Record spin timestamp
   */
  function recordSpin() {
    try {
      localStorage.setItem(WHEEL_CONFIG.STORAGE_KEY, Date.now().toString());
    } catch {
      // Silent fail for localStorage issues
    }
  }

  /**
   * Save discount code for checkout
   */
  function saveDiscountToSession(prize, code) {
    try {
      const expiryMs = WHEEL_CONFIG.DISCOUNT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      const discountData = {
        code: code,
        type: prize.type,
        value: prize.value,
        label: prize.label,
        expiry: new Date(Date.now() + expiryMs).toISOString()
      };
      localStorage.setItem(WHEEL_CONFIG.DISCOUNT_KEY, JSON.stringify(discountData));
    } catch {
      // Silent fail for localStorage issues
    }
  }

  /**
   * Select prize based on probability weights
   */
  function selectPrize() {
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < PRIZES.length; i++) {
      random -= PRIZES[i].weight;
      if (random <= 0) {
        return { prize: PRIZES[i], index: i };
      }
    }
    return { prize: PRIZES[0], index: 0 };
  }

  /**
   * Draw the wheel on canvas
   */
  function drawWheel() {
    if (!wheelCanvas || !wheelCtx) return;

    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    const segmentAngle = (2 * Math.PI) / PRIZES.length;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    // Draw segments
    PRIZES.forEach((prize, index) => {
      const startAngle = currentRotation + index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      // Alternate colors
      const isEven = index % 2 === 0;
      
      // Create gradient for each segment
      const gradient = wheelCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      if (isEven) {
        gradient.addColorStop(0, COLORS.purpleDark);
        gradient.addColorStop(1, COLORS.purple);
      } else {
        gradient.addColorStop(0, '#1a1535');
        gradient.addColorStop(1, COLORS.navy);
      }

      wheelCtx.beginPath();
      wheelCtx.moveTo(centerX, centerY);
      wheelCtx.arc(centerX, centerY, radius, startAngle, endAngle);
      wheelCtx.closePath();
      wheelCtx.fillStyle = gradient;
      wheelCtx.fill();

      // Draw segment border
      wheelCtx.strokeStyle = COLORS.gold;
      wheelCtx.lineWidth = 2;
      wheelCtx.stroke();

      // Draw text
      wheelCtx.save();
      wheelCtx.translate(centerX, centerY);
      wheelCtx.rotate(startAngle + segmentAngle / 2);
      wheelCtx.textAlign = 'right';
      wheelCtx.fillStyle = isEven ? COLORS.goldLight : '#fff';
      wheelCtx.font = 'bold 12px "Source Serif 4", serif';
      wheelCtx.fillText(prize.label, radius - 15, 4);
      wheelCtx.restore();
    });

    // Draw outer ring
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    wheelCtx.strokeStyle = COLORS.gold;
    wheelCtx.lineWidth = 4;
    wheelCtx.stroke();

    // Draw inner circle
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
    wheelCtx.fillStyle = COLORS.navy;
    wheelCtx.fill();
    wheelCtx.strokeStyle = COLORS.gold;
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();
  }

  /**
   * Animate wheel spin
   */
  function spinWheel(targetIndex, callback) {
    if (isSpinning) return;
    isSpinning = true;

    const spinBtn = document.getElementById('spin-wheel-btn');
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.classList.add('spinning');
    }

    const segmentAngle = (2 * Math.PI) / PRIZES.length;
    // Calculate target rotation to land on prize
    // Add extra rotations for visual effect
    const targetRotation = (WHEEL_CONFIG.SPIN_ROTATIONS * 2 * Math.PI) + 
                          (PRIZES.length - targetIndex - 0.5) * segmentAngle;
    
    const startRotation = currentRotation;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / WHEEL_CONFIG.SPIN_DURATION_MS, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      currentRotation = startRotation + (targetRotation - startRotation) * easeOut;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        if (spinBtn) {
          spinBtn.classList.remove('spinning');
        }
        if (callback) callback();
      }
    }

    requestAnimationFrame(animate);
  }

  /**
   * Show prize result
   */
  function showPrizeResult(prize) {
    const prizeSection = document.getElementById('spin-wheel-prize');
    const wheelContainer = document.querySelector('.spin-wheel-container');
    
    if (!prizeSection) return;

    const discountCode = generateDiscountCode();
    const expiryDate = getExpiryDate();

    // Save discount to session
    saveDiscountToSession(prize, discountCode);

    let prizeHTML = '';

    switch (prize.type) {
      case 'discount':
        prizeHTML = `
          <div class="prize-emoji">🎉</div>
          <h3>You Won ${prize.label}!</h3>
          <p class="prize-details">Use this code at checkout for ${prize.value}% off your order!</p>
          <div class="spin-wheel-code">
            <span class="spin-wheel-code-text" id="discount-code">${discountCode}</span>
            <button class="spin-wheel-copy-btn">Copy</button>
          </div>
          <button class="spin-wheel-claim-btn">Claim Prize</button>
          <p class="spin-wheel-expiry">Expires: ${expiryDate}</p>
        `;
        break;

      case 'fixed':
        prizeHTML = `
          <div class="prize-emoji">🎉</div>
          <h3>You Won ${prize.label}!</h3>
          <p class="prize-details">Use this code at checkout for $${prize.value} off your order!</p>
          <div class="spin-wheel-code">
            <span class="spin-wheel-code-text" id="discount-code">${discountCode}</span>
            <button class="spin-wheel-copy-btn">Copy</button>
          </div>
          <button class="spin-wheel-claim-btn">Claim Prize</button>
          <p class="spin-wheel-expiry">Expires: ${expiryDate}</p>
        `;
        break;

      case 'shipping':
        prizeHTML = `
          <div class="prize-emoji">📦</div>
          <h3>You Won Free Shipping!</h3>
          <p class="prize-details">Free shipping on your next order - no minimum required!</p>
          <div class="spin-wheel-code">
            <span class="spin-wheel-code-text" id="discount-code">${discountCode}</span>
            <button class="spin-wheel-copy-btn">Copy</button>
          </div>
          <button class="spin-wheel-claim-btn">Claim Prize</button>
          <p class="spin-wheel-expiry">Expires: ${expiryDate}</p>
        `;
        break;

      case 'mystery':
        prizeHTML = `
          <div class="prize-emoji">🎁</div>
          <h3>Mystery Gift Unlocked!</h3>
          <p class="prize-details">A mystery gift will be added to your next order over $50!</p>
          <div class="spin-wheel-code">
            <span class="spin-wheel-code-text" id="discount-code">${discountCode}</span>
            <button class="spin-wheel-copy-btn">Copy</button>
          </div>
          <button class="spin-wheel-claim-btn">Claim Prize</button>
          <p class="spin-wheel-expiry">Expires: ${expiryDate}</p>
        `;
        break;

      case 'reading':
        prizeHTML = `
          <div class="prize-emoji">🔮</div>
          <h3>Free Reading Preview!</h3>
          <p class="prize-details">Unlock a complimentary compatibility reading preview!</p>
          <a href="/compatibility" class="spin-wheel-claim-btn" style="display: block; text-align: center; text-decoration: none;">Get Your Free Preview</a>
        `;
        break;

      case 'luck':
        const meme = ASTROLOGY_MEMES[Math.floor(Math.random() * ASTROLOGY_MEMES.length)];
        prizeHTML = `
          <div class="prize-emoji">🌟</div>
          <h3>Better Luck Next Time!</h3>
          <div class="spin-wheel-meme">
            <p>"${meme.text}"</p>
          </div>
          <p class="prize-details">But here's 5% off anyway! ✨</p>
          <div class="spin-wheel-code">
            <span class="spin-wheel-code-text" id="discount-code">${discountCode}</span>
            <button class="spin-wheel-copy-btn">Copy</button>
          </div>
          <button class="spin-wheel-claim-btn">Claim Your Consolation Prize</button>
          <p class="spin-wheel-expiry">Expires: ${expiryDate}</p>
        `;
        break;
    }

    prizeSection.innerHTML = prizeHTML;
    prizeSection.classList.add('active');

    // Attach event listeners programmatically
    const copyBtn = prizeSection.querySelector('.spin-wheel-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyDiscountCode);
    }

    const claimBtn = prizeSection.querySelector('.spin-wheel-claim-btn');
    if (claimBtn && !claimBtn.href) {
      claimBtn.addEventListener('click', claimPrize);
    }

    // Hide wheel container after showing prize
    if (wheelContainer) {
      wheelContainer.style.display = 'none';
    }
  }

  /**
   * Copy discount code to clipboard
   */
  function copyDiscountCode() {
    const codeElement = document.getElementById('discount-code');
    const copyBtn = document.querySelector('.spin-wheel-copy-btn');
    
    if (!codeElement) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeElement.textContent).then(() => {
        if (copyBtn) {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      }).catch(() => {
        // Fallback for clipboard permission denied
        if (copyBtn) {
          copyBtn.textContent = 'Failed';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }
      });
    } else {
      // Fallback for browsers without clipboard API
      try {
        const range = document.createRange();
        range.selectNode(codeElement);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        if (copyBtn) {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      } catch {
        if (copyBtn) {
          copyBtn.textContent = 'Select & Copy';
        }
      }
    }
  }

  /**
   * Claim prize and close popup
   */
  function claimPrize() {
    closeSpinWheel();
  };

  /**
   * Close the spin wheel popup
   */
  function closeSpinWheel() {
    const overlay = document.getElementById('spin-wheel-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Open the spin wheel popup
   */
  function openSpinWheel() {
    const overlay = document.getElementById('spin-wheel-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      // Force reflow for animation
      void overlay.offsetWidth;
      overlay.classList.add('active');
      
      // Initialize canvas if not already done
      initCanvas();
      drawWheel();
    }
  }

  /**
   * Initialize canvas
   */
  function initCanvas() {
    wheelCanvas = document.getElementById('spin-wheel-canvas');
    if (wheelCanvas) {
      wheelCtx = wheelCanvas.getContext('2d');
      // Set canvas size
      const size = 280;
      wheelCanvas.width = size;
      wheelCanvas.height = size;
    }
  }

  /**
   * Handle spin button click
   */
  function handleSpin() {
    if (isSpinning) return;

    recordSpin();
    
    const { prize, index } = selectPrize();
    
    spinWheel(index, () => {
      setTimeout(() => {
        showPrizeResult(prize);
      }, 500);
    });
  }

  /**
   * Create the popup HTML structure
   */
  function createPopupHTML() {
    const existingOverlay = document.getElementById('spin-wheel-overlay');
    if (existingOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'spin-wheel-overlay';
    overlay.className = 'spin-wheel-overlay';
    overlay.innerHTML = `
      <div class="spin-wheel-popup">
        <button class="spin-wheel-close" aria-label="Close popup">&times;</button>
        
        <div class="spin-wheel-logo">
          <img src="/images/lyrion-logo.png" alt="Lyrīon Atelier" loading="lazy">
        </div>
        
        <div class="spin-wheel-header">
          <h2>✨ Spin Your Cosmic Fortune ✨</h2>
          <p>First-time visitors get a chance to win exclusive discounts!</p>
        </div>
        
        <div class="spin-wheel-container">
          <div class="spin-wheel-pointer"></div>
          <canvas id="spin-wheel-canvas" class="spin-wheel-canvas"></canvas>
          <button id="spin-wheel-btn" class="spin-wheel-btn">Spin Your Cosmic Fortune</button>
        </div>
        
        <div id="spin-wheel-prize" class="spin-wheel-prize"></div>
        
        <div class="spin-wheel-share">
          <p>Want another spin? Share your win on <strong>Instagram/TikTok</strong> and tag <strong>@lyrionatelier</strong> for a bonus spin tomorrow!</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Attach spin button handler
    const spinBtn = document.getElementById('spin-wheel-btn');
    if (spinBtn) {
      spinBtn.addEventListener('click', handleSpin);
    }

    // Attach close button handler
    const closeBtn = overlay.querySelector('.spin-wheel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSpinWheel);
    }

    // Close on overlay click (outside popup)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSpinWheel();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSpinWheel();
      }
    });
  }

  /**
   * Initialize the spinning wheel
   */
  function init() {
    // Only show on homepage
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      return;
    }

    // Check if user can spin
    if (!canUserSpin()) {
      return;
    }

    // Create popup structure
    createPopupHTML();

    // Show popup after delay
    setTimeout(() => {
      openSpinWheel();
    }, WHEEL_CONFIG.POPUP_DELAY_MS);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose function to manually open wheel (for testing)
  window.openSpinWheel = openSpinWheel;
  window.closeSpinWheel = closeSpinWheel;

})();
