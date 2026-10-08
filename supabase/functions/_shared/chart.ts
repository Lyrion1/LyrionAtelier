// Planetary positions for readings, computed with astronomy-engine (geocentric,
// tropical zodiac). What can be known from a date (and an optional time) is
// computed here so the writing model is handed facts, never asked to invent
// them. Houses, the rising sign and the Midheaven need the birth place's
// coordinates and are not computed.
import * as Astronomy from 'npm:astronomy-engine@2.1.19';

export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;
type Body = typeof BODIES[number];
const SLOW: Body[] = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

export function longitude(body: Body, when: Date): number {
  const vec = Astronomy.GeoVector(body as Astronomy.Body, when, true);
  return Astronomy.Ecliptic(vec).elon;
}

export function signOf(lon: number): { sign: string; degree: number } {
  const l = ((lon % 360) + 360) % 360;
  return { sign: SIGNS[Math.floor(l / 30)], degree: Math.floor(l % 30) };
}

/** Mean lunar node (north), in degrees. */
export function meanNode(when: Date): number {
  const T = (when.getTime() / 86_400_000 + 2440587.5 - 2451545.0) / 36525;
  return (((125.04452 - 1934.136261 * T + 0.0020708 * T * T) % 360) + 360) % 360;
}

export interface Placement {
  body: string;
  sign: string;
  degree: number;
  alternative?: string; // the other possible sign when the time is unknown
}

/**
 * Natal placements. The birth time is read as UTC when given; without it the
 * whole day is considered, and a body that changes sign that day (usually the
 * Moon) is reported with both signs.
 */
export function natal(date: string, time?: string): Placement[] {
  const at = new Date(`${date}T${time || '12:00'}:00Z`);
  const spanHours = time ? 3 : 12;
  const early = new Date(at.getTime() - spanHours * 3600_000);
  const late = new Date(at.getTime() + spanHours * 3600_000);
  const out: Placement[] = BODIES.map((body) => {
    const mid = signOf(longitude(body, at));
    const a = signOf(longitude(body, early)).sign;
    const b = signOf(longitude(body, late)).sign;
    const alt = a !== mid.sign ? a : b !== mid.sign ? b : undefined;
    return { body, sign: mid.sign, degree: mid.degree, ...(alt ? { alternative: alt } : {}) };
  });
  const node = signOf(meanNode(at));
  out.push({ body: 'North Node', sign: node.sign, degree: node.degree });
  out.push({ body: 'South Node', sign: SIGNS[(SIGNS.indexOf(node.sign) + 6) % 12], degree: node.degree });
  return out;
}

/** The moment the Sun returns to its natal longitude, on or after `from`. */
export function solarReturn(date: string, time: string | undefined, from: Date): Date {
  const natalSun = longitude('Sun', new Date(`${date}T${time || '12:00'}:00Z`));
  const [, m, d] = date.split('-').map(Number);
  let year = from.getUTCFullYear();
  if (Date.UTC(year, m - 1, d) < from.getTime() - 2 * 86_400_000) year += 1;
  const found = Astronomy.SearchSunLongitude(natalSun, Astronomy.MakeTime(new Date(Date.UTC(year, m - 1, d) - 5 * 86_400_000)), 10);
  if (!found) throw new Error('solar return not found');
  return found.date;
}

export interface TransitEvent {
  date: string; // YYYY-MM-DD
  text: string;
}

/**
 * Slow-planet events over a window: sign changes, and exact conjunctions,
 * squares, trines and oppositions to the natal Sun. These are astronomical
 * facts; the reading treats them as themes for reflection.
 */
export function transits(natalSunLon: number, from: Date, days: number): TransitEvent[] {
  const events: TransitEvent[] = [];
  const aspects: [number, string][] = [[0, 'conjunct'], [90, 'square'], [120, 'trine'], [180, 'opposite'], [240, 'trine'], [270, 'square']];
  for (const body of SLOW) {
    let prev = longitude(body, from);
    for (let i = 1; i <= days; i += 1) {
      const when = new Date(from.getTime() + i * 86_400_000);
      const lon = longitude(body, when);
      const day = when.toISOString().slice(0, 10);
      if (Math.floor(prev / 30) !== Math.floor(lon / 30)) {
        events.push({ date: day, text: `${body} moves into ${signOf(lon).sign}` });
      }
      for (const [angle, name] of aspects) {
        const target = (natalSunLon + angle) % 360;
        const before = ((prev - target + 540) % 360) - 180;
        const after = ((lon - target + 540) % 360) - 180;
        if (Math.sign(before) !== Math.sign(after) && Math.abs(before) < 5) {
          events.push({ date: day, text: `${body} ${name} the natal Sun` });
        }
      }
      prev = lon;
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function describePlacements(list: Placement[]): string {
  return list.map((p) => `${p.body} in ${p.sign}${p.alternative ? ` (or ${p.alternative}, depending on the birth time)` : ` ${p.degree}°`}`).join('; ');
}
