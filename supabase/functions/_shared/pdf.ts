// Printable PDFs for readings and certificates: A4, cream page, hairline gold
// rules, serif type. Standard PDF fonts only cover the Windows-1252 character
// set, so text is folded into it (Lyrīon prints as Lyrion).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';
import { OPERATOR_LINE } from './env.ts';

const INK = rgb(0.11, 0.08, 0.13);
const SOFT = rgb(0.29, 0.25, 0.32);
const GOLD = rgb(0.54, 0.43, 0.18);
const CREAM = rgb(0.973, 0.957, 0.925);
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 64;

const CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export function fold(text: string): string {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, (ch) => (CP1252_EXTRA.includes(ch) ? ch : ''));
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of fold(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Doc {
  pdf: PDFDocument;
  serif: PDFFont;
  italic: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
}

function frame(page: PDFPage) {
  const [w, h] = A4;
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: CREAM });
  page.drawRectangle({ x: 28, y: 28, width: w - 56, height: h - 56, borderColor: GOLD, borderWidth: 0.6 });
}

async function start(): Promise<Doc> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  frame(page);
  return {
    pdf,
    page,
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    y: A4[1] - MARGIN - 20,
  };
}

function centred(d: Doc, text: string, font: PDFFont, size: number, color = INK, gap = 8) {
  const t = fold(text);
  const width = font.widthOfTextAtSize(t, size);
  d.page.drawText(t, { x: (A4[0] - width) / 2, y: d.y, size, font, color });
  d.y -= size + gap;
}

function rule(d: Doc, gap = 18) {
  d.page.drawLine({ start: { x: MARGIN + 80, y: d.y }, end: { x: A4[0] - MARGIN - 80, y: d.y }, thickness: 0.5, color: GOLD });
  d.y -= gap;
}

function body(d: Doc, text: string, size = 11.5) {
  const width = A4[0] - MARGIN * 2;
  for (const para of text.split(/\n{2,}/)) {
    for (const line of wrap(para.trim(), d.serif, size, width)) {
      if (d.y < MARGIN + 40) {
        d.page = d.pdf.addPage(A4);
        frame(d.page);
        d.y = A4[1] - MARGIN;
      }
      d.page.drawText(line, { x: MARGIN, y: d.y, size, font: d.serif, color: INK });
      d.y -= size * 1.5;
    }
    d.y -= size * 0.6;
  }
}

function footer(d: Doc, disclaimer: string) {
  const width = A4[0] - MARGIN * 2;
  const rows = [
    ...wrap(disclaimer, d.italic, 8.5, width).map((t) => ({ t, font: d.italic, size: 8.5 })),
    ...wrap(OPERATOR_LINE, d.serif, 7.5, width).map((t) => ({ t, font: d.serif, size: 7.5 })),
  ];
  for (const page of d.pdf.getPages()) {
    let y = 44 + rows.length * 10;
    for (const row of rows) {
      const w = row.font.widthOfTextAtSize(row.t, row.size);
      page.drawText(row.t, { x: (A4[0] - w) / 2, y, size: row.size, font: row.font, color: SOFT });
      y -= 10;
    }
  }
}

export interface PieceLayout {
  eyebrow: string; // e.g. "Personalised reading" / "Compatibility certificate"
  title: string; // product title
  names: string; // "Ada & Grace"
  lines: string[]; // one per person: "Born 3 May 1990 · Sun in Taurus · Earth · Fixed"
  text: string; // approved narrative
  disclaimer: string;
}

export async function buildPdf(layout: PieceLayout): Promise<string> {
  const d = await start();
  centred(d, 'LYRION ATELIER', d.bold, 11, GOLD, 22);
  centred(d, layout.eyebrow.toUpperCase(), d.serif, 9.5, SOFT, 16);
  centred(d, layout.title, d.serif, 22, INK, 14);
  rule(d, 40);
  centred(d, layout.names, d.italic, 26, INK, 14);
  layout.lines.forEach((l) => centred(d, l, d.serif, 10.5, SOFT, 6));
  d.y -= 12;
  rule(d, 26);
  body(d, layout.text);
  footer(d, layout.disclaimer);
  const bytes = await d.pdf.save();
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
