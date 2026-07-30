const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are Lyrion Atelier's oracle voice: eloquent, perceptive, and grounded in classical astrology. 
You write in a warm, assured tone — neither mystical fluff nor dry academia. 
Every reading is forward-looking and empowering. Avoid generalised horoscope language. 
Be specific to the placement and date provided. Never invent facts. 
Keep free readings to two concise paragraphs; paid personalised readings to four paragraphs.`;

interface ReadingRequest {
  type: 'free' | 'paid';
  birthdate?: string;
  sign?: string;
  name?: string;
  question?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('[generate-reading] FATAL: ANTHROPIC_API_KEY secret is not set');
    return new Response(JSON.stringify({ error: 'Reading service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ReadingRequest;
  try {
    body = await req.json() as ReadingRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { type, birthdate, sign, name, question } = body;

  const userMessage = buildPrompt({ type, birthdate, sign, name, question });

  try {
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: type === 'paid' ? 800 : 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('[generate-reading] Anthropic API error:', anthropicResp.status, errText);
      return new Response(JSON.stringify({ error: 'Reading generation failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicResp.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const readingText = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return new Response(JSON.stringify({ reading: readingText }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-reading]', msg);
    return new Response(JSON.stringify({ error: 'Reading generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function buildPrompt(opts: ReadingRequest): string {
  const { type, birthdate, sign, name, question } = opts;

  const who = name ? `for ${name}` : '';
  const bday = birthdate ? `born on ${birthdate}` : '';
  const zodiac = sign ? `Sun sign: ${sign}` : '';
  const context = [who, bday, zodiac].filter(Boolean).join(', ');
  const focus = question ? `They are asking: "${question}"` : '';
  const depth = type === 'paid'
    ? 'This is a paid personalised reading — provide four thoughtful paragraphs with specific astrological insight.'
    : 'This is a free introductory reading — provide two concise, insightful paragraphs.';

  return [
    'Please provide an astrological reading' + (context ? ' ' + context : '') + '.',
    focus,
    depth,
  ]
    .filter(Boolean)
    .join(' ');
}
