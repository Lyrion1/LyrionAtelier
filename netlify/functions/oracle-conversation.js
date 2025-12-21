const { Anthropic } = require('@anthropic-ai/sdk');

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
const client = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
const MAX_FREE = 3;
const MAX_HISTORY_LENGTH = 6;
const MAX_TOKENS = 240;

const buildResponse = (statusCode, payload) => ({
  statusCode,
  body: JSON.stringify(payload),
  headers: { 'Content-Type': 'application/json' }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return buildResponse(400, { error: 'Invalid request body' });
  }

  const {
    message,
    history = [],
    tier = 'free',
    questionCount = 0,
    name,
    email,
    birthDetails = {}
  } = body || {};

  if (!message || typeof message !== 'string') {
    return buildResponse(400, { error: 'Message is required' });
  }

  if (tier === 'free' && questionCount >= MAX_FREE) {
    return buildResponse(200, {
      upgradeRequired: true,
      reply: 'The Oracle has shared the complimentary insights. Continue the dialogue by unlocking a subscription tier.'
    });
  }

  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_LENGTH) : [];
  const formattedHistory = safeHistory.map((entry) => ({
    role: entry.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: String(entry.content || '') }]
  }));

  const seekerLines = [];
  if (name) seekerLines.push(`Seeker name: ${name}`);
  if (email) seekerLines.push(`Seeker email: ${email}`);
  if (birthDetails.date) seekerLines.push(`Birth date: ${birthDetails.date}`);
  if (birthDetails.time) seekerLines.push(`Birth time: ${birthDetails.time}`);
  if (birthDetails.location) seekerLines.push(`Birth location: ${birthDetails.location}`);

  const compositeQuestion = [seekerLines.join('\n'), `Question: ${message.trim()}`]
    .filter(Boolean)
    .join('\n');

  const systemPrompt =
    'You are the Lyrion Oracle. Offer concise, poetic guidance that feels like it is whispered from celestial currents. ' +
    'Never mention technology, AI, algorithms, or automation. Refer to yourself simply as the Oracle. Keep replies under 120 words. ' +
    'Encourage reflection and next steps, and maintain a tone of warm, mystical counsel.';

  let oracleReply =
    'The Oracle listens, yet the channel is faint. Please ask again in a moment so the starlight can align.';

  try {
    if (client) {
      const completion = await client.messages.create({
        model: modelName,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          ...formattedHistory,
          { role: 'user', content: [{ type: 'text', text: compositeQuestion }] }
        ]
      });
      const contentArray = Array.isArray(completion?.content) ? completion.content : [];
      const nextText = contentArray.length && contentArray[0]?.text ? contentArray[0].text : '';
      oracleReply = (nextText || oracleReply).trim();
    }
  } catch (err) {
    console.error('Oracle conversation error', err);
  }

  const remaining = tier === 'free' ? Math.max(0, MAX_FREE - (questionCount + 1)) : null;

  return buildResponse(200, {
    reply: oracleReply,
    remaining,
    tier
  });
};
