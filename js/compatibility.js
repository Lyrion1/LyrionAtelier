console.log('Compatibility page loaded');

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

async function generatePreview() {
  const name1 = document.getElementById('name1').value.trim();
  const date1 = document.getElementById('date1').value.trim();
  const name2 = document.getElementById('name2').value.trim();
  const date2 = document.getElementById('date2').value.trim();
  
  if (!name1 || !date1 || !name2 || !date2) {
    alert('Please fill in all fields');
    return;
  }
  
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(date1) || !dateRegex.test(date2)) {
    alert('Please enter dates in MM/DD/YYYY format');
    return;
  }
  
  const [month1, day1, year1] = date1.split('/');
  const [month2, day2, year2] = date2.split('/');
  const isoDate1 = `${year1}-${month1}-${day1}`;
  const isoDate2 = `${year2}-${month2}-${day2}`;
  
  document.getElementById('preview-result').style.display = 'none';
  document.getElementById('preview-loading').style.display = 'block';
  
  try {
    const response = await fetch('/.netlify/functions/cosmic-compatibility', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        person1Name: name1,
        person1BirthDate: isoDate1,
        person2Name: name2,
        person2BirthDate: isoDate2
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate compatibility');
    }
    
    const data = await response.json();
    
    document.getElementById('preview-loading').style.display = 'none';
    document.getElementById('preview-result').style.display = 'block';
    
    document.getElementById('score-number').textContent = data.compatibilityScore;
    
    const signsHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
        <span style="font-size: 48px;">${data.person1.zodiacEmoji}</span>
        <span style="color: #fbbf24; font-size: 24px;"> </span>
        <span style="font-size: 48px;">${data.person2.zodiacEmoji}</span>
      </div>
      <p style="color: #a78bfa; font-size: 18px; margin-top: 16px;">
        ${data.person1.name} (${data.person1.zodiacSign}) & ${data.person2.name} (${data.person2.zodiacSign})
      </p>
    `;
    document.getElementById('signs-display').innerHTML = signsHTML;
    
    const narrativeText = typeof data.narrative === 'string' ? data.narrative : '';
    const narrativePreview = narrativeText ? narrativeText.split('.').slice(0, 2).join('.') + '...' : 'Your personalized cosmic narrative will appear here.';
    document.getElementById('preview-narrative').innerHTML = `<p>${narrativePreview}</p><p style="font-style: italic; color: #fbbf24; margin-top: 16px;">Full reading included in your certificate!</p>`;
    
    window.scrollTo({ top: document.getElementById('preview-result').offsetTop - 100, behavior: 'smooth' });
    
  } catch (error) {
    console.error('Preview error:', error);
    document.getElementById('preview-loading').style.display = 'none';
    alert('Unable to generate preview. Please try again.');
  }
}

window.generatePreview = generatePreview;

// Compatibility Checkout Function
async function initiateCompatibilityCheckout(productName, price, evt) {
  console.log('Initiating compatibility checkout:', productName, price);
  
  const button = evt?.currentTarget || evt?.target || null;
  const originalText = button ? button.textContent : null;
  if (button) {
    button.textContent = 'Processing...';
    button.disabled = true;
  }
  
  if (!window.initiateCheckout) {
    console.error('Checkout handler not loaded');
    alert('Checkout system unavailable. Please refresh the page.');
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
    return;
  }
  
  try {
    const success = await window.initiateCheckout({
      name: productName,
      price: price,
      type: 'compatibility_certificate'
    });
    if (!success && button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  } catch (error) {
    console.error('Compatibility checkout error:', error);
    alert('Unable to start checkout. Please try again or contact support.');
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  }
}

// Mobile Navigation Function
function toggleMobileNav() {
  const navLinks = document.getElementById('nav-links');
  const navToggle = document.querySelector('.nav-toggle');
  if (navLinks) {
    navLinks.classList.toggle('active');
  }
  if (navToggle) {
    navToggle.classList.toggle('active');
  }
}

// Make functions globally available
window.initiateCompatibilityCheckout = initiateCompatibilityCheckout;
window.toggleMobileNav = toggleMobileNav;

document.addEventListener('DOMContentLoaded', function() {
  formatDateInput('date1');
  formatDateInput('date2');
});
