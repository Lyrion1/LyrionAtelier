const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { birthDate } = JSON.parse(event.body);

    if (!birthDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Birth date required' })
      };
    }

    console.log('Processing oracle reading for:', birthDate);

    // Calculate zodiac sign
    const date = new Date(birthDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const zodiacSigns = [
      { sign: ' Capricorn', start: [12, 22], end: [1, 19] },
      { sign: ' Aquarius', start: [1, 20], end: [2, 18] },
      { sign: ' Pisces', start: [2, 19], end: [3, 20] },
      { sign: ' Aries', start: [3, 21], end: [4, 19] },
      { sign: ' Taurus', start: [4, 20], end: [5, 20] },
      { sign: ' Gemini', start: [5, 21], end: [6, 20] },
      { sign: ' Cancer', start: [6, 21], end: [7, 22] },
      { sign: ' Leo', start: [7, 23], end: [8, 22] },
      { sign: ' Virgo', start: [8, 23], end: [9, 22] },
      { sign: ' Libra', start: [9, 23], end: [10, 22] },
      { sign: ' Scorpio', start: [10, 23], end: [11, 21] },
      { sign: ' Sagittarius', start: [11, 22], end: [12, 21] },
    ];

    let zodiacSign = ' ';
    for (const z of zodiacSigns) {
      const [startMonth, startDay] = z.start;
      const [endMonth, endDay] = z.end;
      
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        zodiacSign = z.sign;
        break;
      }
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    // Check Saturn Return
    const isSaturnReturn = (age >= 28 && age <= 30) || (age >= 57 && age <= 59);

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are a mystical oracle. Give a brief, intriguing 2-3 sentence cosmic reading for someone born on ${birthDate}, zodiac sign ${zodiacSign}, currently age ${age}. Make it personal, mysterious, and encouraging. Focus on their current life phase and cosmic energies.`
      }]
    });

    const reading = message.content[0].text;

    // Create urgency message
    let urgencyMessage = '';
    if (isSaturnReturn) {
      urgencyMessage = ' You are in your Saturn Return - a powerful time of transformation and life restructuring. A full reading can guide you through this pivotal period.';
    } else if (age < 25) {
      urgencyMessage = ' You are in a formative period of discovery. A deeper reading can illuminate your path forward.';
    } else if (age >= 40) {
      urgencyMessage = ' You have accumulated wisdom and experience. A comprehensive reading can help you align with your highest purpose.';
    }

    // Recommend product
    const recommendedReading = isSaturnReturn ? 'cosmic-blueprint' : (age < 30 ? 'life-path' : 'natal-chart');

    const response = {
      zodiacSign: zodiacSign,
      reading: reading,
      urgencyMessage: urgencyMessage,
      recommendedReading: recommendedReading,
      shareText: `I just discovered my cosmic signature: ${zodiacSign}! Get your free reading at Lyrion Atelier.`
    };

    console.log('Oracle reading generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Anthropic API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate reading',
        message: error.message 
      })
    };
  }
};
