import type { ItemKey } from './types';

export interface ExtractResult {
  itemType: ItemKey | null;
  date: { day: number; month: number; year: number } | null;
  /** Raw text decoded from the barcode — kept for debugging. */
  rawText: string;
  /** Barcode format (e.g. PDF_417, QR_CODE) when known. */
  format?: string;
}

// ─── Date helpers ────────────────────────────────────────────────────────

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LONG = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];

function monthIndex(token: string): number {
  return MONTHS.indexOf(token.toLowerCase().slice(0, 3));
}

function isPlausibleDate(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function parseDateInText(text: string): { day: number; month: number; year: number } | null {
  const monthsAlt = [...MONTHS, ...MONTH_LONG].join('|');

  // "Jan 01, 2022" or "January 1 2022"
  const m1 = text.match(new RegExp(`(${monthsAlt})\\.?\\s*(\\d{1,2})[,\\s]+(\\d{4})`, 'i'));
  if (m1) {
    const month = monthIndex(m1[1]) + 1;
    const day = Number(m1[2]);
    const year = Number(m1[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  // "01 Jan 2022"
  const m2 = text.match(new RegExp(`(\\d{1,2})\\s+(${monthsAlt})\\.?\\s+(\\d{4})`, 'i'));
  if (m2) {
    const day = Number(m2[1]);
    const month = monthIndex(m2[2]) + 1;
    const year = Number(m2[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  // "01/01/2022" with /, -, or .
  const m3 = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m3) {
    const day = Number(m3[1]);
    const month = Number(m3[2]);
    const year = Number(m3[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  return null;
}

// ─── Format-specific parsers ─────────────────────────────────────────────

/**
 * AAMVA PDF417 — the standard barcode on most US, Canadian, and many
 * Caribbean driver's licences. Payload is tab-separated lines of
 * three-letter field tags followed by their values.
 *
 *   DBA  Expiration date (MMDDCCYY for 2016+ AAMVA, CCYYMMDD for earlier)
 *   DBB  Date of birth
 *   DAQ  Licence number
 *   DBN  First name
 *   etc.
 *
 * We only read DBA; the disclaimer commits us to that.
 */
function parseAAMVA(text: string): ExtractResult | null {
  // Header is usually "@\n" then "ANSI <iin>".
  if (!/ANSI\s*\d{6}/i.test(text)) return null;

  const dbaMatch = text.match(/DBA(\d{8})/);
  if (!dbaMatch) {
    return { itemType: 'drivers-licence', date: null, rawText: text, format: 'AAMVA' };
  }

  const s = dbaMatch[1];

  // Try MMDDCCYY first (modern AAMVA).
  const m1 = Number(s.slice(0, 2));
  const d1 = Number(s.slice(2, 4));
  const y1 = Number(s.slice(4, 8));
  if (isPlausibleDate(d1, m1, y1)) {
    return {
      itemType: 'drivers-licence',
      date: { day: d1, month: m1, year: y1 },
      rawText: text,
      format: 'AAMVA',
    };
  }

  // Fall back to CCYYMMDD (older AAMVA).
  const y2 = Number(s.slice(0, 4));
  const m2 = Number(s.slice(4, 6));
  const d2 = Number(s.slice(6, 8));
  if (isPlausibleDate(d2, m2, y2)) {
    return {
      itemType: 'drivers-licence',
      date: { day: d2, month: m2, year: y2 },
      rawText: text,
      format: 'AAMVA',
    };
  }

  return { itemType: 'drivers-licence', date: null, rawText: text, format: 'AAMVA' };
}

/**
 * Generic fallback for QR codes / other barcode formats that aren't
 * AAMVA. Looks for an expiry-like keyword followed by a date, then
 * falls back to any plausible date in the text.
 */
function parseGeneric(text: string, format?: string): ExtractResult {
  const lines = text.split(/[\r\n\t;|]+/).map(l => l.trim()).filter(Boolean);

  // Document type from keywords.
  const lower = text.toLowerCase();
  let itemType: ItemKey | null = null;
  if (/driv(er|ing)/.test(lower) && /lic/.test(lower)) itemType = 'drivers-licence';
  else if (/\bpassport\b/.test(lower)) itemType = 'passport';
  else if (/vehicle/.test(lower) && /(reg|licen)/.test(lower)) itemType = 'vehicle-registration';
  else if (/\bpermit\b/.test(lower)) itemType = 'permit';

  // Date — prefer lines containing an expiry keyword.
  const expiryKeyword = /\b(expir|exp\.?\s*date|valid\s+(until|to|till))\b/i;
  for (const line of lines) {
    if (!expiryKeyword.test(line)) continue;
    const date = parseDateInText(line);
    if (date) return { itemType, date, rawText: text, format };
  }
  for (const line of lines) {
    const date = parseDateInText(line);
    if (date) return { itemType, date, rawText: text, format };
  }
  return { itemType, date: null, rawText: text, format };
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Load the image into an HTMLImageElement so ZXing can decode it.
 */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')); };
    img.src = url;
  });
}

/**
 * Pre-warm the barcode reader by importing the chunk early. Cheap and
 * worth doing when the user opens the photo panel so the chunk is in
 * memory before they tap Choose a photo.
 */
let readerPromise: Promise<typeof import('@zxing/browser')> | null = null;

export function prewarmExtractor(): Promise<unknown> {
  if (!readerPromise) {
    readerPromise = import('@zxing/browser');
  }
  return readerPromise;
}

/**
 * Decode the barcode from `image` and return the document type and
 * expiry date. Throws if no barcode can be found.
 */
export async function extractDocument(image: File): Promise<ExtractResult> {
  const [{ BrowserMultiFormatReader }, img] = await Promise.all([
    prewarmExtractor() as Promise<typeof import('@zxing/browser')>,
    fileToImage(image),
  ]);

  const reader = new BrowserMultiFormatReader();
  const result = await reader.decodeFromImageElement(img);
  const text = result.getText();
  const format = String(result.getBarcodeFormat());

  // Try AAMVA first — most driver's licences. Falls back to generic
  // keyword/date scanning for QR codes and other barcode payloads.
  const aamva = parseAAMVA(text);
  if (aamva) return aamva;

  return parseGeneric(text, format);
}
