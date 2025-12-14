const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getZodiacSign(month, day) {
  const signs = [
    { sign: 'Capricorn', start: [12, 22], end: [1, 19] },
    { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
  ];

  for (const s of signs) {
    if ((month === s.start[0] && day >= s.start[1]) ||
        (month === s.end[0] && day <= s.end[1])) {
      return s.sign;
    }
  }
  return 'Capricorn';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { birthDate } = JSON.parse(event.body);

    const [year, month, day] = birthDate.split('-').map(Number);
    const zodiacSign = getZodiacSign(month, day);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    const saturnReturn = (age >= 28 && age <= 30) || (age >= 57 && age <= 59);

    const prompt = `You are the Oracle of Lyrion Atelier, a mystical astrologer.

Birth: ${zodiacSign}, Age ${age}, Saturn Return: ${saturnReturn ? 'YES - Critical transformation period' : 'No'}

Create a captivating 3-sentence reading that:
1. Reveals profound truth about ${zodiacSign} energy
2. ${saturnReturn ? 'Emphasizes URGENT Saturn Return transformation' : 'Highlights current themes'}
3. Creates intrigue for deeper exploration
4. Ends with mystical cliffhanger

Tone: Mystical, poetic, eerily accurate. Make them think "How did they know?!"`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const reading = message.content[0].text;

    let recommendedReading = 'natal-chart';
    let urgencyMessage = '';

    if (saturnReturn) {
      recommendedReading = 'career';
      urgencyMessage = ' Your Saturn Return is NOW. This is your once-in-30-years transformation window.';
    } else if (age < 25) {
      recommendedReading = 'life-path';
      urgencyMessage = ' Pivotal discovery phase. Your Life Path Reading reveals your destiny.';
    } else if (age >= 40) {
      recommendedReading = 'cosmic-blueprint';
      urgencyMessage = ' Entering power years. Full Cosmic Blueprint shows how to claim them.';
    } else {
      urgencyMessage = ' The stars reveal your path. Discover your complete cosmic blueprint.';
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        reading,
        zodiacSign,
        age,
        saturnReturn,
        recommendedReading,
        urgencyMessage,
        shareText: `I just got my cosmic reading from Lyrion Atelier and it's eerily accurate! ${zodiacSign} - Try yours: https://lyrionatelier.com`
      }),
    };

  } catch (error) {
    console.error('Oracle AI Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'The stars are temporarily misaligned. Please try again.' }),
    };
  }
};
