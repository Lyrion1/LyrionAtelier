// Sun sign facts used by readings and keepsakes. Only what can be stated from
// a birth date: the Sun's sign, its element, modality and traditional ruler.
import { houseCore } from './catalogue.ts';

const MODALITY: Record<string, string> = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};
const RULER: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'the Moon', Leo: 'the Sun', Virgo: 'Mercury',
  Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};
const GLYPH: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export interface SunSign {
  sign: string;
  element: string;
  modality: string;
  ruler: string;
  glyph: string;
}

/** ISO date (YYYY-MM-DD) to the Sun sign facts, or null for a bad date. */
export function sunSign(isoDate: string): SunSign | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!m) return null;
  const sign = houseCore.signFromBirthDate(Number(m[2]), Number(m[3]));
  if (!sign) return null;
  return { sign, element: houseCore.ELEMENT_OF[sign], modality: MODALITY[sign], ruler: RULER[sign], glyph: GLYPH[sign] };
}

export function longDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
