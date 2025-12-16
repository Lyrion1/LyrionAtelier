// Oracle Widget: handles the single-person crystal ball experience
function toggleOracleWidget() {
  const panel = document.getElementById('oracle-panel');
  if (panel) {
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
  }
}

function formatDateInput() {
  const input = document.getElementById('birth-date');
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
  
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      getOracleReading();
    }
  });
}

async function getOracleReading() {
  const birthDateInput = document.getElementById('birth-date');
  const birthDate = birthDateInput ? birthDateInput.value : '';
  
  console.log('Oracle: getOracleReading called with:', birthDate);
  
  if (!birthDate || birthDate.trim() === '') {
    alert('Please enter your birth date in MM/DD/YYYY format');
    return;
  }
  
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(birthDate)) {
    alert('Please enter date in MM/DD/YYYY format (e.g., 03/15/1990)');
    return;
  }
  
  const [month, day, year] = birthDate.split('/');
  const isoDate = `${year}-${month}-${day}`;
  
  console.log('Oracle: Converted date for API:', isoDate);
  
  const introEl = document.getElementById('oracle-intro');
  const loadingEl = document.getElementById('oracle-loading');
  const resultEl = document.getElementById('oracle-result');
  
  if (introEl) introEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'block';
  if (resultEl) resultEl.style.display = 'none';
  
  try {
    console.log('Oracle: Calling oracle-ai function (NOT compatibility)');
    
    const response = await fetch('/.netlify/functions/oracle-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ birthDate: isoDate })
    });
    
    console.log('Oracle: API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Oracle: API error response:', errorText);
      throw new Error('Oracle API error: ' + response.status);
    }
    
    const data = await response.json();
    console.log('Oracle: Reading received:', data);
    
    if (!data || !data.reading) {
      throw new Error('Invalid oracle response format');
    }
    
    window.currentReading = data;
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'block';
    
    const signBadge = document.getElementById('sign-badge');
    const readingText = document.getElementById('reading-text');
    const urgencyMsg = document.getElementById('urgency-message');
    
    if (signBadge) {
      signBadge.textContent = data.zodiacSign || ' ';
    }
    
    if (readingText) {
      readingText.textContent = data.reading;
    }
    
    if (urgencyMsg && data.urgencyMessage) {
      urgencyMsg.textContent = data.urgencyMessage;
      urgencyMsg.style.display = 'block';
    } else if (urgencyMsg) {
      urgencyMsg.style.display = 'none';
    }
    
    console.log('Oracle: Reading displayed successfully');
    
  } catch (error) {
    console.error('Oracle: Error:', error);
    alert('Unable to get your oracle reading. Please try again.');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (introEl) introEl.style.display = 'block';
  }
}

function bookFullReading() {
  const recommended = window.currentReading?.recommendedReading || '';
  window.location.href = recommended ? 'oracle.html#' + recommended : 'oracle.html';
}

function shareReading() {
  const shareText = window.currentReading?.shareText || 'I just got my free cosmic reading from Lyrion Atelier!';
  
  if (navigator.share) {
    navigator.share({
      title: 'My Cosmic Reading',
      text: shareText,
      url: window.location.href
    }).catch(err => console.log('Share failed:', err));
  } else {
    navigator.clipboard.writeText(shareText + ' ' + window.location.href)
      .then(() => alert('Reading copied! Share it on social media.'))
      .catch(() => alert('Share: ' + shareText));
  }
}

function resetOracleWidget() {
  const result = document.getElementById('oracle-result');
  const intro = document.getElementById('oracle-intro');
  if (result) result.style.display = 'none';
  if (intro) intro.style.display = 'block';
  const input = document.getElementById('birth-date');
  if (input) input.value = '';
  window.currentReading = null;
}

function attachOracleControls() {
  const widgetTrigger = document.getElementById('crystal-ball-widget');
  const closeButton = document.querySelector('.oracle-close');
  const bookButton = document.querySelector('.oracle-cta');
  const shareButton = document.querySelector('.oracle-share');
  const resetButton = document.querySelector('.oracle-reset');
  const revealButton = document.querySelector('.oracle-submit');

  widgetTrigger?.addEventListener('click', toggleOracleWidget);
  closeButton?.addEventListener('click', toggleOracleWidget);
  bookButton?.addEventListener('click', bookFullReading);
  shareButton?.addEventListener('click', shareReading);
  resetButton?.addEventListener('click', resetOracleWidget);
  if (revealButton && !revealButton.getAttribute('onclick')) {
    revealButton.addEventListener('click', getOracleReading);
  }
}

window.toggleOracleWidget = toggleOracleWidget;
window.getOracleReading = getOracleReading;
window.bookFullReading = bookFullReading;
window.shareReading = shareReading;
window.resetOracleWidget = resetOracleWidget;

document.addEventListener('DOMContentLoaded', function() {
  console.log('Oracle widget initialized');
  formatDateInput();
  attachOracleControls();
});
