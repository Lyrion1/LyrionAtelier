console.log('Compatibility page script loaded');
const SUPPORT_EMAIL = 'admin@lyrionatelier.com';

// Format date input as user types
function formatDateInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '/' + value.slice(5, 9);
    }

    e.target.value = value;
  });
}

// Buy Compatibility Certificate
async function buyCompatibilityCertificate(productName, price, evt) {
  console.log('Buy button clicked:', productName, price);

  const button = (evt && evt.currentTarget instanceof HTMLButtonElement) ? evt.currentTarget : null;
  const priceValue = parseFloat(price);
  const originalText = button ? button.textContent : null;

  if (button) {
    button.textContent = 'Processing...';
    button.disabled = true;
  }

  try {
    if (typeof window.initiateCheckout === 'function') {
      await window.initiateCheckout({
        name: productName,
        price: priceValue,
        type: 'compatibility_certificate'
      });
    } else {
      console.error('initiateCheckout function not found');

      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName,
          productPrice: priceValue,
          productType: 'compatibility_certificate'
        })
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Unable to start checkout. Please try again or contact ' + SUPPORT_EMAIL);
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  }
}

// Generate Preview
async function generatePreview() {
  console.log('Generate preview clicked');

  const name1 = document.getElementById('name1');
  const date1 = document.getElementById('date1');
  const name2 = document.getElementById('name2');
  const date2 = document.getElementById('date2');

  if (!name1 || !date1 || !name2 || !date2) {
    console.error('Form elements not found');
    alert('Form error. Please refresh the page.');
    return;
  }

  const name1Val = name1.value.trim();
  const date1Val = date1.value.trim();
  const name2Val = name2.value.trim();
  const date2Val = date2.value.trim();

  console.log('Form values:', { name1Val, date1Val, name2Val, date2Val });

  if (!name1Val || !date1Val || !name2Val || !date2Val) {
    alert('Please fill in all fields');
    return;
  }

  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(date1Val) || !dateRegex.test(date2Val)) {
    alert('Please enter dates in MM/DD/YYYY format (e.g., 03/15/1990)');
    return;
  }

  const [month1, day1, year1] = date1Val.split('/');
  const [month2, day2, year2] = date2Val.split('/');
  const isoDate1 = `${year1}-${month1}-${day1}`;
  const isoDate2 = `${year2}-${month2}-${day2}`;

  const resultEl = document.getElementById('preview-result');
  const loadingEl = document.getElementById('preview-loading');

  if (resultEl) resultEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    console.log('Calling cosmic-compatibility function...');

    const response = await fetch('/.netlify/functions/cosmic-compatibility', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person1Name: name1Val,
        person1BirthDate: isoDate1,
        person2Name: name2Val,
        person2BirthDate: isoDate2
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error('Failed to generate compatibility');
    }

    const data = await response.json();
    console.log('Compatibility data:', data);

    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'block';

    const scoreNum = document.getElementById('score-number');
    const signsDisplay = document.getElementById('signs-display');
    const narrativeDisplay = document.getElementById('preview-narrative');

    if (scoreNum) {
      scoreNum.textContent = data.compatibilityScore || '0';
    }

    if (signsDisplay) {
      signsDisplay.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px;">
        <span style="font-size: 48px;">${data.person1.zodiacEmoji || ' '}</span>
        <span style="color: #fbbf24; font-size: 24px;"> </span>
        <span style="font-size: 48px;">${data.person2.zodiacEmoji || ' '}</span>
      </div>
      <p style="color: #a78bfa; font-size: 18px; margin: 0;">
        ${data.person1.name} (${data.person1.zodiacSign}) & ${data.person2.name} (${data.person2.zodiacSign})
      </p>
      `;
    }

    if (narrativeDisplay && data.narrative) {
      const sentences = data.narrative.match(/[^.!?]+(?:[.!?]|$)/g) || [data.narrative];
      const previewText = sentences.slice(0, 3).join(' ').trim();
      const preview = previewText + (sentences.length > 3 ? '...' : '');
      narrativeDisplay.innerHTML = `
      <p style="margin-bottom: 20px;">${preview}</p>
      <p style="font-style: italic; color: #fbbf24; margin: 0;">Full reading included in your certificate!</p>
      `;
    }

    if (resultEl) {
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

  } catch (error) {
    console.error('Preview generation error:', error);
    if (loadingEl) loadingEl.style.display = 'none';
    alert('Unable to generate preview. Please try again.\n\nError: ' + error.message);
  }
}

// Make functions globally available
window.buyCompatibilityCertificate = buyCompatibilityCertificate;
window.generatePreview = generatePreview;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing compatibility page');

  formatDateInput('date1');
  formatDateInput('date2');

  const generateBtn = document.querySelector('.generate-btn');
  if (generateBtn) {
    console.log('Generate button found, attaching listener');
    generateBtn.onclick = generatePreview;
  } else {
    console.error('Generate button not found');
  }
});
