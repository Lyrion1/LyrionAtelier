console.log('Oracle widget script loaded');

function openOracleWidget() {
 console.log('Opening oracle widget');
 const panel = document.getElementById('oracle-panel');
 if (panel) {
 panel.style.display = 'block';
 resetOracleWidget();
 } else {
 console.error('Oracle panel not found');
 }
}

function closeOracleWidget() {
 console.log('Closing oracle widget');
 const panel = document.getElementById('oracle-panel');
 if (panel) {
 panel.style.display = 'none';
 }
}

function toggleOracleWidget() {
 const panel = document.getElementById('oracle-panel');
 if (panel) {
 if (panel.style.display === 'none') {
 openOracleWidget();
 } else {
 closeOracleWidget();
 }
 }
}

function formatOracleDateInput() {
 const input = document.getElementById('birth-date');
 if (!input) {
 console.error('Birth date input not found');
 return;
 }
 
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
 console.log('getOracleReading called');
 
 const birthDateInput = document.getElementById('birth-date');
 if (!birthDateInput) {
 console.error('Birth date input not found');
 alert('Form error. Please refresh the page.');
 return;
 }
 
 const birthDate = birthDateInput.value.trim();
 
 console.log('Birth date value:', birthDate);
 
 if (!birthDate) {
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
 
 console.log('Converted to ISO date:', isoDate);
 
 const introEl = document.getElementById('oracle-intro');
 const loadingEl = document.getElementById('oracle-loading');
 const resultEl = document.getElementById('oracle-result');
 
 if (introEl) introEl.style.display = 'none';
 if (loadingEl) loadingEl.style.display = 'block';
 if (resultEl) resultEl.style.display = 'none';
 
 try {
 console.log('Calling oracle-ai function');
 
 const response = await fetch('/.netlify/functions/oracle-ai', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ birthDate: isoDate })
 });
 
 console.log('Response status:', response.status);
 
 if (!response.ok) {
 const errorText = await response.text();
 console.error('API error:', errorText);
 throw new Error('Failed to get reading: ' + response.status);
 }
 
 const data = await response.json();
 console.log('Oracle data received:', data);
 
 if (!data || !data.reading) {
 throw new Error('Invalid response format');
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
 
 console.log('Reading displayed successfully');
 
 } catch (error) {
 console.error('Oracle error:', error);
 alert('Unable to get your oracle reading. Please try again soon.');
 
 if (loadingEl) loadingEl.style.display = 'none';
 if (introEl) introEl.style.display = 'block';
 }
}

function bookFullReading() {
 console.log('Booking full reading');
 const recommended = window.currentReading?.recommendedReading || '';
 window.location.href = recommended ? 'oracle.html#' + recommended : 'oracle.html';
}

function shareReading() {
 console.log('Sharing reading');
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
 console.log('Resetting oracle widget');
 const introEl = document.getElementById('oracle-intro');
 const loadingEl = document.getElementById('oracle-loading');
 const resultEl = document.getElementById('oracle-result');
 const birthDateInput = document.getElementById('birth-date');
 
 if (introEl) introEl.style.display = 'block';
 if (loadingEl) loadingEl.style.display = 'none';
 if (resultEl) resultEl.style.display = 'none';
 if (birthDateInput) birthDateInput.value = '';
 
 window.currentReading = null;
}

window.openOracleWidget = openOracleWidget;
window.closeOracleWidget = closeOracleWidget;
window.toggleOracleWidget = toggleOracleWidget;
window.getOracleReading = getOracleReading;
window.bookFullReading = bookFullReading;
window.shareReading = shareReading;
window.resetOracleWidget = resetOracleWidget;

document.addEventListener('DOMContentLoaded', function() {
 console.log('Oracle widget DOM loaded');
 formatOracleDateInput();
});

console.log('Oracle widget functions registered');
