import type { ItemKey } from './types';
import type { Worker } from 'tesseract.js';

export interface ExtractProgress {
  message: string;
  progress: number;
}

export interface ExtractResult {
  itemType: ItemKey | null;
  date: { day: number; month: number; year: number } | null;
  rawText: string;
}

// "Fast" tessdata variant — smaller download and quicker OCR. Accuracy
// is slightly lower than "best" but still good for sans-serif ID text.
const TESS_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast';

let workerPromise: Promise<Worker> | null = null;

export function prewarmExtractor(
  onProgress?: (p: ExtractProgress) => void,
): Promise<Worker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    onProgress?.({ message: 'Loading recognition engine…', progress: 0 });
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      langPath: TESS_LANG_PATH,
      logger: (m: { status: string; progress: number }) => {
        const label =
          m.status === 'loading tesseract core' ? 'Loading recognition engine…' :
          m.status === 'initializing tesseract' ? 'Starting recognition engine…' :
          m.status === 'loading language traineddata' ? 'Downloading English language data…' :
          m.status === 'initializing api' ? 'Getting ready…' :
          m.status;
        onProgress?.({ message: label, progress: m.progress * 0.6 });
      },
    });
    return worker;
  })();

  return workerPromise;
}

async function shrinkForOCR(file: File, maxDim = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= maxDim) return file;

  const scale = maxDim / longest;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });

  const ctx = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  }
  return new Promise<Blob>(resolve => {
    (canvas as HTMLCanvasElement).toBlob(b => resolve(b!), 'image/jpeg', 0.9);
  });
}

// ─── Parsers ─────────────────────────────────────────────────────────────

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

function parseDateLine(line: string): { day: number; month: number; year: number } | null {
  const monthsAlt = [...MONTHS, ...MONTH_LONG].join('|');

  const m1 = line.match(new RegExp(`(${monthsAlt})\\.?\\s*(\\d{1,2})[,\\s]+(\\d{4})`, 'i'));
  if (m1) {
    const month = monthIndex(m1[1]) + 1;
    const day = Number(m1[2]);
    const year = Number(m1[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  const m2 = line.match(new RegExp(`(\\d{1,2})\\s+(${monthsAlt})\\.?\\s+(\\d{4})`, 'i'));
  if (m2) {
    const day = Number(m2[1]);
    const month = monthIndex(m2[2]) + 1;
    const year = Number(m2[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  const m3 = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m3) {
    const day = Number(m3[1]);
    const month = Number(m3[2]);
    const year = Number(m3[3]);
    if (isPlausibleDate(day, month, year)) return { day, month, year };
  }

  return null;
}

function findExpiryDate(text: string): { day: number; month: number; year: number } | null {
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const expiryKeyword = /\b(expir|exp\.?\s*date|valid\s+(until|to|till))\b/i;

  for (let i = 0; i < lines.length; i++) {
    if (!expiryKeyword.test(lines[i])) continue;
    for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
      const date = parseDateLine(lines[j]);
      if (date) return date;
    }
  }

  const all = lines.map(parseDateLine).filter((d): d is NonNullable<typeof d> => !!d);
  if (all.length === 0) return null;
  all.sort((a, b) =>
    new Date(b.year, b.month - 1, b.day).getTime() -
    new Date(a.year, a.month - 1, a.day).getTime(),
  );
  return all[0];
}

function detectItemType(text: string): ItemKey | null {
  const t = text.toLowerCase();
  if (/driv(er|ing)['’]?s?\s*lic[ae]?nce/.test(t)) return 'drivers-licence';
  if (/driver/.test(t) && /lic/.test(t)) return 'drivers-licence';
  if (/\bpassport\b/.test(t)) return 'passport';
  if (/vehicle\s+(reg|licen)/.test(t) || /motor\s+vehicle/.test(t)) return 'vehicle-registration';
  if (/\bpermit\b/.test(t)) return 'permit';
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function extractDocument(
  image: File,
  onProgress?: (p: ExtractProgress) => void,
): Promise<ExtractResult> {
  const worker = await prewarmExtractor(onProgress);

  onProgress?.({ message: 'Preparing image…', progress: 0.6 });
  const resized = await shrinkForOCR(image);

  onProgress?.({ message: `Reading ${image.name}…`, progress: 0.65 });
  const result = await worker.recognize(resized);

  onProgress?.({ message: 'Looking for the document type and expiry date…', progress: 0.95 });
  const text = result.data.text;
  const date = findExpiryDate(text);
  const itemType = detectItemType(text);

  onProgress?.({ message: 'Done', progress: 1 });
  return { itemType, date, rawText: text };
}
