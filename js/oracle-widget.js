// Format date input as user types (MM/DD/YYYY)
function formatDateInput() {
  const input = document.getElementById('birth-date');
  if (!input) return;
  
  input.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + '/' + value.slice(5, 9);
    }
    
    e.target.value = value;
  });
  
  // Allow Enter key to submit
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      getOracleReading();
    }
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Oracle widget...');
  formatDateInput();
});

// Get Oracle Reading from Anthropic API
async function getOracleReading() {
  const birthDateInput = document.getElementById('birth-date');
  const birthDate = birthDateInput ? birthDateInput.value : '';
  
  console.log('getOracleReading called with:', birthDate);
  
  if (!birthDate || birthDate.trim() === '') {
    alert('Please enter your birth date in MM/DD/YYYY format');
    return;
  }
  
  // Validate MM/DD/YYYY format
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(birthDate)) {
    alert('Please enter date in MM/DD/YYYY format (e.g., 03/15/1990)');
    return;
  }
  
  // Convert MM/DD/YYYY to YYYY-MM-DD for API
  const [month, day, year] = birthDate.split('/');
  const isoDate = `${year}-${month}-${day}`;
  
  console.log('Converted date for API:', isoDate);
  
  // Hide intro, show loading
  const introEl = document.getElementById('oracle-intro');
  const loadingEl = document.getElementById('oracle-loading');
  const resultEl = document.getElementById('oracle-result');
  
  if (introEl) introEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'block';
  if (resultEl) resultEl.style.display = 'none';
  
  try {
    console.log('Calling Anthropic API via Netlify function...');
    
    const response = await fetch('/.netlify/functions/oracle-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ birthDate: isoDate })
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Oracle reading received:', data);
    
    if (!data || !data.reading) {
      throw new Error('Invalid response format from API');
    }
    
    // Store reading for sharing
    window.currentReading = data;
    
    // Display results
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'block';
    
    const signBadge = document.getElementById('sign-badge');
    const readingText = document.getElementById('reading-text');
    const urgencyMsg = document.getElementById('urgency-message');
    
    if (signBadge) {
      signBadge.innerHTML = `<span class=\"zodiac-icon\" style=\"font-size: 48px;\">${data.zodiacSign || ' '}</span>`;
    }
    
    if (readingText) {
      readingText.innerHTML = `<p style=\"color: rgba(255,255,255,0.9); line-height: 1.7;\">${data.reading}</p>`;
    }
    
    if (urgencyMsg && data.urgencyMessage) {
      urgencyMsg.innerHTML = `<p style=\"margin: 0;\">${data.urgencyMessage}</p>`;
      urgencyMsg.style.display = 'block';
    } else if (urgencyMsg) {
      urgencyMsg.style.display = 'none';
    }
    
    console.log('Reading displayed successfully');
    
  } catch (error) {
    console.error('Oracle reading error:', error);
    
    // Show error to user
    alert('Unable to get your reading. Please try again.\\n\\nError: ' + error.message + '\\n\\nIf this persists, contact admin@lyrionatelier.com');
    
    // Reset UI
    if (loadingEl) loadingEl.style.display = 'none';
    if (introEl) introEl.style.display = 'block';
  }
}

// Make function globally available
window.getOracleReading = getOracleReading;
