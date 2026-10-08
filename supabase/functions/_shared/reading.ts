// Written content for paid readings and certificates, generated with Claude
// from computed chart facts (see chart.ts). Every piece is framed as
// reflection and entertainment: nothing is promised about the future,
// health, money or legal matters. The owner reads and approves each one
// before it is sent (see delivery-approve).
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';
import { requireEnv } from './env.ts';
import { longDate, sunSign } from './astro.ts';
import { describePlacements, longitude, natal, solarReturn, transits } from './chart.ts';

export interface Person {
  name: string;
  date: string; // YYYY-MM-DD
  time?: string;
  place?: string;
}

export interface Details {
  kind: 'person' | 'couple' | 'pet' | 'newborn';
  people: Person[];
  species?: string;
  question?: string;
}

const SYSTEM = `You write for Lyrīon Atelier, a British astrology lifestyle house. Your pieces are read as reflection and entertainment.

Voice: warm, assured and literate; British English; no clichés, no exclamation marks, no emoji, no markdown symbols. Use short plain headings on their own line where a long piece needs them.

Firm limits, which apply to every sentence:
- Never predict or promise events, outcomes or luck. Planetary movements may be described as themes to reflect on, never as things that will happen.
- Never comment on health, illness, healing of the body or mind, pregnancy, medication, diet or mental health.
- Never comment on money, income, investments, debt, or legal matters.
- Never tell the reader to make or avoid a decision. Offer questions and themes instead.
- Use only the placements and dates you are given. Do not invent placements, houses, the rising sign, the Midheaven or aspects that are not listed. Where a sign is given as uncertain, say so.
- Write in plain paragraphs separated by blank lines.`;

// What each reading concentrates on, and roughly how long it is (the page
// counts promised on its product page, at about 400 words a page).
const FOCUS: Record<string, { words: number; focus: string; transits?: 'year' | 'solar-return' | 'calendar-year' }> = {
  'life-path-reading': { words: 1400, focus: 'the Sun, the Moon and the lunar nodes as themes of purpose and growth' },
  'natal-chart-blueprint': { words: 3400, focus: 'every placement listed, sign by sign, and how they sit together' },
  'career-purpose-reading': { words: 2100, focus: 'how the Sun, Mars, Jupiter and Saturn placements are traditionally linked with vocation, talents and ways of working, as themes for reflection' },
  'relationship-synastry': { words: 2500, focus: 'how the two charts meet: Sun, Moon, Venus and Mars signs and elements, where they harmonise and where they differ' },
  'lunar-nodes-reading': { words: 1700, focus: 'the North and South Nodes and the traditional story of the nodal axis' },
  'chiron-wound-healing': { words: 1700, focus: 'the myth of Chiron and the theme of the wounded teacher in astrology, read alongside the Sun and Moon. Chiron\'s own position is not computed, so do not state its sign' },
  'solar-return-reading': { words: 1700, focus: 'the solar return date and the slow-planet movements listed for the year after it, as themes to reflect on', transits: 'solar-return' },
  'transit-forecast': { words: 1700, focus: 'the slow-planet movements listed for the next twelve months, as themes to reflect on', transits: 'year' },
  'full-cosmic-synthesis': { words: 4200, focus: 'every placement listed and the slow-planet movements of the coming year, as one portrait for reflection', transits: 'year' },
  '2026-reading': { words: 1700, focus: 'the slow-planet movements listed for the rest of 2026, as themes to reflect on', transits: 'calendar-year' },
};

function facts(details: Details, slug: string, orderedAt: Date): string {
  const lines: string[] = [];
  for (const [i, p] of details.people.entries()) {
    const label = details.people.length > 1 ? `Person ${i + 1}` : 'Birth details';
    lines.push(`${label}: ${p.name}, born ${longDate(p.date)}${p.time ? ` at ${p.time} (read as UTC)` : ' (birth time not given)'}${p.place ? `, ${p.place}` : ''}.`);
    lines.push(`Placements: ${describePlacements(natal(p.date, p.time))}.`);
  }
  const f = FOCUS[slug];
  const first = details.people[0];
  if (f?.transits && first) {
    const sunLon = longitude('Sun', new Date(`${first.date}T${first.time || '12:00'}:00Z`));
    let from = orderedAt;
    let days = 365;
    if (f.transits === 'solar-return') {
      from = solarReturn(first.date, first.time, orderedAt);
      lines.push(`Next solar return: ${from.toISOString().slice(0, 10)}.`);
    }
    if (f.transits === 'calendar-year') {
      const end = new Date(Date.UTC(2026, 11, 31));
      days = Math.max(1, Math.round((end.getTime() - orderedAt.getTime()) / 86_400_000));
    }
    const events = transits(sunLon, from, days);
    lines.push(events.length
      ? `Slow-planet movements from ${from.toISOString().slice(0, 10)} for ${days} days: ${events.map((e) => `${e.date} ${e.text}`).join('; ')}.`
      : `No slow-planet sign changes or exact aspects to the natal Sun in the ${days} days from ${from.toISOString().slice(0, 10)}.`);
  }
  return lines.join('\n');
}

function brief(slug: string, productTitle: string, details: Details, orderedAt: Date): string {
  const known = facts(details, slug, orderedAt);
  switch (details.kind) {
    case 'couple':
      if (slug !== 'relationship-synastry') {
        return `Write the narrative for a "${productTitle}": about 450 words in five paragraphs on how these two charts meet, what each brings, where they differ and what they might enjoy exploring together. Treat it as a keepsake for the couple, not a verdict on the relationship. End with a question for them to reflect on together.\n\n${known}`;
      }
      break;
    case 'pet':
      return `Write a light, affectionate Sun sign portrait for a pet keepsake: about 250 words in three paragraphs describing the character the sign is traditionally associated with, framed playfully. The pet is a ${details.species || 'companion animal'}. Mention only the Sun sign.\n\n${known}`;
    case 'newborn':
      return `Write a gentle keepsake for a newborn: about 300 words in four paragraphs on the qualities traditionally linked with the Sun sign and, briefly, the Moon sign, written to be read aloud by the family in years to come. Make no claims about the child's future.\n\n${known}`;
  }
  const f = FOCUS[slug] ?? { words: 1400, focus: 'the placements listed' };
  return [
    `Write the personalised "${productTitle}", about ${f.words} words. Concentrate on ${f.focus}.`,
    'Open with a short paragraph addressing the reader by first name. Close with a short section of questions for reflection.',
    details.question ? `The reader asked us to reflect on: "${details.question}". Treat it as a theme for reflection only, within the limits above.` : '',
    known,
  ].filter(Boolean).join('\n\n');
}

export async function writePiece(productTitle: string, details: Details, slug = '', orderedAt = new Date()): Promise<string> {
  const client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // Refused requests are retried server-side on a fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{ role: 'user', content: brief(slug, productTitle, details, orderedAt) }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error('The writing model declined this request; it needs writing by hand.');
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
  if (!text) throw new Error('The writing model returned no text.');
  return text;
}

/** The brief sent to the model, for review and tests. */
export const previewBrief = brief;

export const DISCLAIMER =
  'Written for reflection and entertainment. It is not a prediction and not advice about health, money, legal or any other decision.';

export { sunSign };
