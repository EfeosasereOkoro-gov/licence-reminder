import { createContext, useContext } from 'react';
import type { Answers, StoredReminder } from './types';

export const EMPTY_ANSWERS: Answers = {
  itemType: null,
  customName: '',
  expiryDay: '',
  expiryMonth: '',
  expiryYear: '',
  channel: null,
  email: '',
  phone: '',
};

export interface JourneyContextValue {
  answers: Answers;
  setAnswers: (next: Partial<Answers>) => void;
  /**
   * Reset the in-memory journey.
   *
   * Pass `{ keepContact: true }` after a successful submission so the user
   * can set another reminder without re-entering their email or phone —
   * we wipe the item, expiry, and any submission state, but carry the
   * notification channel and contact field forward.
   */
  resetAnswers: (options?: { keepContact?: boolean }) => void;
  saveReminder: (r: StoredReminder) => void;
  lastReminder: StoredReminder | null;
}

export const JourneyContext = createContext<JourneyContextValue | null>(null);

export function useJourney(): JourneyContextValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}

const STORAGE_KEY = 'renew-reminder:reminders:v1';

export function loadReminders(): StoredReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReminder[];
    const now = Date.now();
    // Honour the retention principle — auto-delete entries past their retain window.
    const kept = parsed.filter(r => new Date(r.retainUntilISO).getTime() >= now);
    if (kept.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    }
    return kept;
  } catch {
    return [];
  }
}

export function persistReminder(r: StoredReminder): void {
  const all = loadReminders();
  all.push(r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function generateReminderId(): string {
  // REM-XXXX-XXXX — short, human-readable, no PII.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  };
  return `REM-${block()}-${block()}`;
}

export function computeReminderDates(expiry: Date): Date[] {
  const offsets = [90, 30, 7];
  return offsets.map(d => {
    const date = new Date(expiry);
    date.setDate(date.getDate() - d);
    return date;
  });
}

export function computeRetainUntil(expiry: Date): Date {
  const date = new Date(expiry);
  date.setDate(date.getDate() + 30);
  return date;
}
