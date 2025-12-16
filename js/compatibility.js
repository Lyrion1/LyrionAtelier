function getZodiacSign(month, day) {
  // Capricorn appears twice to simplify the wrap across new year
  const signs = [
    { name: 'Capricorn', emoji: '♑', end: [1, 19] },
    { name: 'Aquarius', emoji: '♒', end: [2, 18] },
    { name: 'Pisces', emoji: '♓', end: [3, 20] },
    { name: 'Aries', emoji: '♈', end: [4, 19] },
    { name: 'Taurus', emoji: '♉', end: [5, 20] },
    { name: 'Gemini', emoji: '♊', end: [6, 20] },
    { name: 'Cancer', emoji: '♋', end: [7, 22] },
    { name: 'Leo', emoji: '♌', end: [8, 22] },
    { name: 'Virgo', emoji: '♍', end: [9, 22] },
    { name: 'Libra', emoji: '♎', end: [10, 22] },
    { name: 'Scorpio', emoji: '♏', end: [11, 21] },
    { name: 'Sagittarius', emoji: '♐', end: [12, 21] },
    { name: 'Capricorn', emoji: '♑', end: [12, 31] }
  ];

  for (const sign of signs) {
    const [signMonth, signDay] = sign.end;
    if (month < signMonth || (month === signMonth && day <= signDay)) {
      return sign;
    }
  }
  return signs[0];
}

function isValidDate(month, day, year) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

const NAME_WEIGHT_PRIMARY = 7;
const NAME_WEIGHT_SECONDARY = 5;
const MIN_COMPATIBILITY_SCORE = 60;
const SCORE_RANGE = 41;
// Accepts single or double digit month/day with 4-digit year
const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const signTraits = {
  Aries: 'bold, trailblazing passion',
  Taurus: 'steady, sensual devotion',
  Gemini: 'playful, curious connection',
  Cancer: 'nurturing, heartfelt care',
  Leo: 'radiant, generous warmth',
  Virgo: 'thoughtful, grounded harmony',
  Libra: 'graceful, balanced affection',
  Scorpio: 'intense, transformative love',
  Sagittarius: 'adventurous, truth-seeking spirit',
  Capricorn: 'loyal, enduring commitment',
  Aquarius: 'visionary, electric chemistry',
  Pisces: 'dreamy, empathetic understanding'
};

function calculateScore(name1, date1, name2, date2) {
  const seed =
    name1.length * NAME_WEIGHT_PRIMARY + // slight emphasis on first entered name for variety
    name2.length * NAME_WEIGHT_SECONDARY +
    date1.reduce((a, b) => a + b, 0) +
    date2.reduce((a, b) => a + b, 0);
  return MIN_COMPATIBILITY_SCORE + (seed % SCORE_RANGE);
}

function generatePreview() {
  const name1Input = document.getElementById('name1');
  const name2Input = document.getElementById('name2');
  const date1Input = document.getElementById('date1');
  const date2Input = document.getElementById('date2');

  const name1 = (name1Input?.value || '').trim();
  const name2 = (name2Input?.value || '').trim();
  const date1Raw = (date1Input?.value || '').trim();
  const date2Raw = (date2Input?.value || '').trim();

  if (!name1 || !name2 || !date1Raw || !date2Raw) {
    alert('Please enter both names and birth dates to generate a preview.');
    return;
  }

  const date1Match = date1Raw.match(DATE_PATTERN);
  const date2Match = date2Raw.match(DATE_PATTERN);

  if (!date1Match || !date2Match) {
    alert('Please use MM/DD/YYYY format for both birth dates.');
    return;
  }

  const date1Parts = date1Match.slice(1).map(Number);
  const date2Parts = date2Match.slice(1).map(Number);

  const [month1, day1, year1] = date1Parts;
  const [month2, day2, year2] = date2Parts;

  if (!isValidDate(month1, day1, year1) || !isValidDate(month2, day2, year2)) {
    alert('Please enter valid calendar dates in MM/DD/YYYY format.');
    return;
  }

  const previewLoading = document.getElementById('preview-loading');
  const previewResult = document.getElementById('preview-result');

  previewResult.style.display = 'none';
  previewLoading.style.display = 'block';

  setTimeout(() => {
    const score = calculateScore(name1, date1Parts, name2, date2Parts);
    const sign1 = getZodiacSign(month1, day1);
    const sign2 = getZodiacSign(month2, day2);
    const trait1 = signTraits[sign1.name] || 'celestial energy';
    const trait2 = signTraits[sign2.name] || 'cosmic grace';

    const scoreNumber = document.getElementById('score-number');
    const signsDisplay = document.getElementById('signs-display');
    const previewNarrative = document.getElementById('preview-narrative');

    if (scoreNumber) scoreNumber.textContent = score;
    if (signsDisplay) {
      signsDisplay.textContent = `${sign1.emoji} ${sign1.name} + ${sign2.emoji} ${sign2.name}`;
    }
    if (previewNarrative) {
      previewNarrative.textContent = `${name1} and ${name2}, your bond resonates at ${score}% cosmic harmony. ${sign1.name} brings ${trait1}, while ${sign2.name} offers ${trait2}. Together you weave a love story that glows brighter than the constellations that guided your birth.`;
    }

    previewLoading.style.display = 'none';
    previewResult.style.display = 'block';
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  const ctaButtons = document.querySelectorAll('.tier-cta');
  ctaButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const { price, name, product } = btn.dataset;
      if (typeof window.initiateCheckout === 'function') {
        initiateCheckout({
          name: name || 'Cosmic Compatibility Certificate',
          price: price || '0',
          type: product || 'compatibility_certificate'
        });
      } else {
        alert('Checkout is currently unavailable. Please try again shortly.');
      }
    });
  });

  window.generatePreview = generatePreview;
});
