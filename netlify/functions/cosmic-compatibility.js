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
    const { person1Name, person1BirthDate, person2Name, person2BirthDate } = JSON.parse(event.body);

    if (!person1Name || !person1BirthDate || !person2Name || !person2BirthDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'All fields required' })
      };
    }

    console.log('Generating compatibility for:', person1Name, 'and', person2Name);

    const date1 = new Date(person1BirthDate);
    const date2 = new Date(person2BirthDate);

    function getZodiacSign(month, day) {
      const signs = [
        { sign: 'Capricorn', emoji: ' ', start: [12, 22], end: [1, 19] },
        { sign: 'Aquarius', emoji: ' ', start: [1, 20], end: [2, 18] },
        { sign: 'Pisces', emoji: ' ', start: [2, 19], end: [3, 20] },
        { sign: 'Aries', emoji: ' ', start: [3, 21], end: [4, 19] },
        { sign: 'Taurus', emoji: ' ', start: [4, 20], end: [5, 20] },
        { sign: 'Gemini', emoji: ' ', start: [5, 21], end: [6, 20] },
        { sign: 'Cancer', emoji: ' ', start: [6, 21], end: [7, 22] },
        { sign: 'Leo', emoji: ' ', start: [7, 23], end: [8, 22] },
        { sign: 'Virgo', emoji: ' ', start: [8, 23], end: [9, 22] },
        { sign: 'Libra', emoji: ' ', start: [9, 23], end: [10, 22] },
        { sign: 'Scorpio', emoji: ' ', start: [10, 23], end: [11, 21] },
        { sign: 'Sagittarius', emoji: ' ', start: [11, 22], end: [12, 21] },
      ];

      for (const z of signs) {
        const [startMonth, startDay] = z.start;
        const [endMonth, endDay] = z.end;
        
        if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
          return z;
        }
      }
      return signs[0];
    }

    const sign1 = getZodiacSign(date1.getMonth() + 1, date1.getDate());
    const sign2 = getZodiacSign(date2.getMonth() + 1, date2.getDate());

    const elementMap = {
      'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
      'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
      'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
      'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
    };

    const element1 = elementMap[sign1.sign];
    const element2 = elementMap[sign2.sign];

    const compatibilityMatrix = {
      'Fire-Fire': 95, 'Fire-Air': 88, 'Fire-Earth': 70, 'Fire-Water': 65,
      'Air-Air': 93, 'Air-Fire': 88, 'Air-Water': 72, 'Air-Earth': 68,
      'Earth-Earth': 92, 'Earth-Water': 90, 'Earth-Fire': 70, 'Earth-Air': 68,
      'Water-Water': 94, 'Water-Earth': 90, 'Water-Air': 72, 'Water-Fire': 65
    };

    const elementKey = `${element1}-${element2}`;
    const reverseKey = `${element2}-${element1}`;
    const baseScore = compatibilityMatrix[elementKey] || compatibilityMatrix[reverseKey] || 75;

    const dayDiff = Math.abs(date1.getDate() - date2.getDate());
    const scoreAdjustment = dayDiff < 5 ? 3 : (dayDiff < 10 ? 1 : -1);
    const finalScore = Math.min(99, Math.max(70, baseScore + scoreAdjustment));

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a mystical cosmic oracle writing a romantic compatibility certificate. Write a beautiful, poetic 3-4 paragraph narrative about the cosmic connection between ${person1Name} (${sign1.sign}) born on ${person1BirthDate} and ${person2Name} (${sign2.sign}) born on ${person2BirthDate}. 

Their compatibility score is ${finalScore}/100. ${person1Name} is ${element1} element and ${person2Name} is ${element2} element.

Write in an enchanting, romantic tone that celebrates their unique bond. Include:
- How their zodiac signs complement each other
- The cosmic significance of their elements meeting
- What makes their connection special and destined
- The strengths of their relationship
- A beautiful closing about their shared destiny

Make it feel like a once-in-a-lifetime love story written in the stars. Be poetic, mystical, and deeply romantic.`
      }]
    });

    const narrative = message.content[0].text;

    const certificateNumber = `CC-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const response = {
      person1: {
        name: person1Name,
        birthDate: person1BirthDate,
        zodiacSign: sign1.sign,
        zodiacEmoji: sign1.emoji,
        element: element1
      },
      person2: {
        name: person2Name,
        birthDate: person2BirthDate,
        zodiacSign: sign2.sign,
        zodiacEmoji: sign2.emoji,
        element: element2
      },
      compatibilityScore: finalScore,
      narrative: narrative,
      certificateNumber: certificateNumber,
      issuedDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };

    console.log('Compatibility certificate generated:', certificateNumber);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Compatibility API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate compatibility certificate',
        message: error.message 
      })
    };
  }
};
