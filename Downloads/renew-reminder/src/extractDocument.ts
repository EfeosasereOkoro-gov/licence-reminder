import type { ItemKey } from './types';

export type ExtractProgress =
  | { stage: 'loading' }   // downloading the OCR engine and language data (first run only)
  | { stage: 'reading' }   // running OCR on the image
  | { stage: 'parsing' };  // OCR done, looking for date and document type in the text

export interface ExtractResult {
  itemType: ItemKey | null;
  date: { day: number; month: number; year: number } | null;
  rawText: string;
}

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const MONTH_LONG = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function monthIndex(token: string): number {
  const t = token.toLowerCase().slice(0, 3);
  return MONTHS.indexOf(t);
}

/**
 * Try to read a date from a single line of text.
 * Returns the first sensible date — common formats only:
 *   - "Jan 01, 2022" / "January 1, 2022"
 *   - "01 Jan 2022"
 *   - "01/01/2022" / "01-01-2022" / "01.01.2022"  (interpreted as DD/MM/YYYY)
 */
function parseDateLine(line: string): { day: number; month: number; year: number } | null {
  const monthsAlt = [...MONTHS, ...MONTH_LONG].join('|');

  // "Jan 01, 2022" or "January 1 2022"
  const m1 = line.match(new RegExp(`(${monthsAlt})\\.?\\s*(\\d{1,2})[,\\s]+(\\d{4})`, 'i'));
  if (m1) {
    const month = monthIndex(m1[1]) + 1;
    const day = Number(m1[2]);
    const year = Number(m1[3]);
    if (isPlausible(day, month, year)) return { day, month, year };
  }

  // "01 Jan 2022"
  const m2 = line.match(new RegExp(`(\\d{1,2})\\s+(${monthsAlt})\\.?\\s+(\\d{4})`, 'i'));
  if (m2) {
    const day = Number(m2[1]);
    const month = monthIndex(m2[2]) + 1;
    const year = Number(m2[3]);
    if (isPlausible(day, month, year)) return { day, month, year };
  }

  // "01/01/2022" with /, -, or .
  const m3 = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m3) {
    const day = Number(m3[1]);
    const month = Number(m3[2]);
    const year = Number(m3[3]);
    if (isPlausible(day, month, year)) return { day, month, year };
  }

  return null;
}

function isPlausible(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
  // Reject impossible combinations like Feb 30.
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * From raw OCR text, find the expiry date. Strategy:
 *   1. Prefer dates on (or just after) a line that contains "expir" /
 *      "exp date" / "valid until" etc.
 *   2. If no keyword-tagged date is found, fall back to the latest date
 *      in the text — on a typical ID, expiry is the most-future date.
 */
function findExpiryDate(text: string): { day: number; month: number; year: number } | null {
  const lines = text
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(Boolean);

  const expiryKeyword = /\b(expir|exp\.?\s*date|valid\s+(until|to|till))\b/i;

  // 1. Same line as the keyword, OR the next line.
  for (let i = 0; i < lines.length; i++) {
    if (!expiryKeyword.test(lines[i])) continue;
    for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
      const date = parseDateLine(lines[j]);
      if (date) return date;
    }
  }

  // 2. Fallback — pick the latest parseable date in the document.
  const all = lines.map(parseDateLine).filter((d): d is NonNullable<typeof d> => !!d);
  if (all.length === 0) return null;
  all.sort((a, b) =>
    new Date(b.year, b.month - 1, b.day).getTime() -
    new Date(a.year, a.month - 1, a.day).getTime(),
  );
  return all[0];
}

/**
 * Heuristic document-type detection from OCR text.
 */
function detectItemType(text: string): ItemKey | null {
  const t = text.toLowerCase();

  if (/driv(er|ing)['’]?s?\s*lic[ae]?nce/.test(t) || /driver/.test(t) && /lic/.test(t)) {
    return 'drivers-licence';
  }
  if (/\bpassport\b/.test(t)) {
    return 'passport';
  }
  if (/vehicle\s+(reg|licen)/.test(t) || /motor\s+vehicle/.test(t)) {
    return 'vehicle-registration';
  }
  if (/\bpermit\b/.test(t)) {
    return 'permit';
  }
  return null;
}

/**
 * Run OCR on the supplied image and return the document type and expiry
 * date. Tesseract.js is loaded lazily so users on the manual path don't
 * pay its bundle cost.
 *
 * `onProgress` fires as the workflow moves through loading -> reading ->
 * parsing so the UI can update its status text.
 */
export async function extractDocument(
  image: File,
  onProgress?: (p: ExtractProgress) => void,
): Promise<ExtractResult> {
  onProgress?.({ stage: 'loading' });
  const Tesseract = await import('tesseract.js');

  onProgress?.({ stage: 'reading' });
  const result = await Tesseract.recognize(image, 'eng');
  const text = result.data.text;

  onProgress?.({ stage: 'parsing' });
  const date = findExpiryDate(text);
  const itemType = detectItemType(text);

  return { itemType, date, rawText: text };
}
