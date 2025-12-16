console.log('Oracle widget loading...');

function openOracleWidget() {
 console.log('Opening oracle panel');
 const panel = document.getElementById('oracle-panel');
 if (panel) {
 panel.style.display = 'block';
 resetOracleWidget();
 }
}

function closeOracleWidget() {
 console.log('Closing oracle panel');
 const panel = document.getElementById('oracle-panel');
 if (panel) {
 panel.style.display = 'none';
 }
}

function formatOracleDateInput() {
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
 console.log('Getting oracle reading');
 
 const birthDateInput = document.getElementById('birth-date');
 if (!birthDateInput) {
 alert('Form error. Please refresh.');
 return;
 }
 
 const birthDate = birthDateInput.value.trim();
 
 if (!birthDate) {
 alert('Please enter your birth date in MM/DD/YYYY format');
 return;
 }
 
 const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
 if (!dateRegex.test(birthDate)) {
 alert('Please enter date in MM/DD/YYYY format (e.g., 03/15/1990)');
 return;
 }
 
 const parts = birthDate.split('/');
 const isoDate = parts[2] + '-' + parts[0] + '-' + parts[1];
 
 const introEl = document.getElementById('oracle-intro');
 const loadingEl = document.getElementById('oracle-loading');
 const resultEl = document.getElementById('oracle-result');
 
 if (introEl) introEl.style.display = 'none';
 if (loadingEl) loadingEl.style.display = 'block';
 if (resultEl) resultEl.style.display = 'none';
 
 try {
 const response = await fetch('/.netlify/functions/oracle-ai', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ birthDate: isoDate })
 });
 
 if (!response.ok) {
 throw new Error('Failed to get reading');
 }
 
 const data = await response.json();
 
 if (!data || !data.reading) {
 throw new Error('Invalid response');
 }
 
 window.currentReading = data;
 
 if (loadingEl) loadingEl.style.display = 'none';
 if (resultEl) resultEl.style.display = 'block';
 
 const signBadge = document.getElementById('sign-badge');
 const readingText = document.getElementById('reading-text');
 const urgencyMsg = document.getElementById('urgency-message');
 
 if (signBadge) {
 signBadge.innerHTML = '<span style="font-size: 48px;">' + (data.zodiacSign || ' ') + '</span>';
 }
 
 if (readingText) {
 readingText.innerHTML = '<p>' + data.reading + '</p>';
 }
 
 if (urgencyMsg && data.urgencyMessage) {
 urgencyMsg.innerHTML = '<p>' + data.urgencyMessage + '</p>';
 urgencyMsg.style.display = 'block';
 } else if (urgencyMsg) {
 urgencyMsg.style.display = 'none';
 }
 
 } catch (error) {
 console.error('Oracle error:', error);
 alert('Unable to get reading. Please try again.');
 if (loadingEl) loadingEl.style.display = 'none';
 if (introEl) introEl.style.display = 'block';
 }
}

function bookFullReading() {
 const recommended = window.currentReading?.recommendedReading || '';
 window.location.href = recommended ? 'oracle.html#' + recommended : 'oracle.html';
}

function shareReading() {
 const shareText = window.currentReading?.shareText || 'I got my cosmic reading!';
 
 if (navigator.share) {
 navigator.share({
 title: 'My Cosmic Reading',
 text: shareText,
 url: window.location.href
 }).catch(err => console.log('Share failed:', err));
 } else {
 navigator.clipboard.writeText(shareText + ' ' + window.location.href)
 .then(() => alert('Reading copied!'))
 .catch(() => alert(shareText));
 }
}

function resetOracleWidget() {
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

function attachOracleEventListeners() {
 console.log('Attaching event listeners');
 
 const trigger = document.getElementById('crystal-ball-trigger');
 const closeBtn = document.getElementById('oracle-close-btn');
 const submitBtn = document.getElementById('oracle-submit-btn');
 const bookBtn = document.getElementById('book-reading-btn');
 const shareBtn = document.getElementById('share-reading-btn');
 const resetBtn = document.getElementById('reset-oracle-btn');
 const closeBottomBtn = document.getElementById('oracle-close-bottom-btn');
 
 if (trigger) {
 trigger.addEventListener('click', openOracleWidget);
 console.log('Crystal ball click listener attached');
 } else {
 console.error('Crystal ball trigger not found');
 }
 
 if (closeBtn) closeBtn.addEventListener('click', closeOracleWidget);
 if (submitBtn) submitBtn.addEventListener('click', getOracleReading);
 if (bookBtn) bookBtn.addEventListener('click', bookFullReading);
 if (shareBtn) shareBtn.addEventListener('click', shareReading);
 if (resetBtn) resetBtn.addEventListener('click', resetOracleWidget);
 if (closeBottomBtn) closeBottomBtn.addEventListener('click', closeOracleWidget);
 
 formatOracleDateInput();
}

document.addEventListener('DOMContentLoaded', function() {
 console.log('Oracle widget DOM ready');
 attachOracleEventListeners();
});

console.log('Oracle widget script loaded');
