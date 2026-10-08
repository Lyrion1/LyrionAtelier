// Personal details for readings and certificates: validated on the way into
// checkout, carried in the Stripe session's metadata (500 characters per key),
// and unpacked by the webhook.
import type { Details, Person } from './reading.ts';

export interface RawDetails {
  people?: { name?: unknown; date?: unknown; time?: unknown; place?: unknown }[];
  species?: unknown;
  question?: unknown;
}

const PEOPLE_FOR: Record<Details['kind'], number> = { person: 1, couple: 2, pet: 1, newborn: 1 };

function text(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isoDate(value: unknown): string | null {
  const s = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  if (s < '1900-01-01' || d.getTime() > Date.now() + 86_400_000) return null;
  return s;
}

export function cleanDetails(kind: Details['kind'], raw: RawDetails | undefined): Details | null {
  if (!raw || !Array.isArray(raw.people)) return null;
  const need = PEOPLE_FOR[kind];
  if (raw.people.length < need) return null;
  const people: Person[] = [];
  for (const p of raw.people.slice(0, need)) {
    const name = text(p?.name, 40);
    const date = isoDate(p?.date);
    if (!name || !date) return null;
    const time = /^\d{2}:\d{2}$/.test(String(p?.time ?? '')) ? String(p?.time) : undefined;
    const place = text(p?.place, 60) || undefined;
    people.push({ name, date, ...(time ? { time } : {}), ...(place ? { place } : {}) });
  }
  const out: Details = { kind, people };
  if (kind === 'pet') {
    const species = text(raw.species, 30);
    if (!species) return null;
    out.species = species;
  }
  if (kind === 'person') {
    const question = text(raw.question, 160);
    if (question) out.question = question;
  }
  return out;
}

/** Compact form for Stripe metadata. */
export function packDetails(d: Details): string {
  return JSON.stringify({
    k: d.kind,
    p: d.people.map((p) => [p.name, p.date, p.time ?? '', p.place ?? '']),
    ...(d.species ? { s: d.species } : {}),
    ...(d.question ? { q: d.question } : {}),
  });
}

export function unpackDetails(packed: string | undefined): Details | null {
  if (!packed) return null;
  try {
    const o = JSON.parse(packed);
    return {
      kind: o.k,
      people: (o.p as string[][]).map(([name, date, time, place]) => ({
        name, date, ...(time ? { time } : {}), ...(place ? { place } : {}),
      })),
      ...(o.s ? { species: o.s } : {}),
      ...(o.q ? { question: o.q } : {}),
    };
  } catch {
    return null;
  }
}
