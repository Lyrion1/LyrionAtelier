function getZodiacSign(month, day) {
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

function calculateScore(name1, date1, name2, date2) {
  const seed =
    name1.length * 7 +
    name2.length * 5 +
    date1.reduce((a, b) => a + b, 0) +
    date2.reduce((a, b) => a + b, 0);
  return 60 + (seed % 41);
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

  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const date1Match = date1Raw.match(datePattern);
  const date2Match = date2Raw.match(datePattern);

  if (!date1Match || !date2Match) {
    alert('Please use MM/DD/YYYY format for both birth dates.');
    return;
  }

  const date1Parts = date1Match.slice(1).map(Number);
  const date2Parts = date2Match.slice(1).map(Number);

  const [month1, day1] = date1Parts;
  const [month2, day2] = date2Parts;

  if (month1 > 12 || day1 > 31 || month2 > 12 || day2 > 31) {
    alert('Please enter valid calendar dates.');
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

    const scoreNumber = document.getElementById('score-number');
    const signsDisplay = document.getElementById('signs-display');
    const previewNarrative = document.getElementById('preview-narrative');

    if (scoreNumber) scoreNumber.textContent = score;
    if (signsDisplay) {
      signsDisplay.textContent = `${sign1.emoji} ${sign1.name} + ${sign2.emoji} ${sign2.name}`;
    }
    if (previewNarrative) {
      previewNarrative.textContent = `${name1} and ${name2}, your bond resonates at ${score}% cosmic harmony. ${sign1.name} brings ${month1 % 2 ? 'fiery passion' : 'gentle intuition'}, while ${sign2.name} offers ${month2 % 2 ? 'grounded devotion' : 'radiant creativity'}. Together you weave a love story that glows brighter than the constellations that guided your birth.`;
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
