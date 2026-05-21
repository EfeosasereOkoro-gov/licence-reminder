import type { StoredReminder } from './types';

/**
 * Build a Google Calendar "create event" URL that opens the event-editor
 * with everything pre-filled. Clicking it from a browser drops the user
 * into Google Calendar; they review and tap Save.
 *
 * The event lands 30 days BEFORE the actual expiry so the user gets
 * useful lead-time, not a notification on the day the document expires.
 */
export function googleCalendarURL(reminder: StoredReminder): string {
  const expiry = new Date(reminder.expiryISO);
  const eventDate = addDays(expiry, -30);

  // All-day event: dates are YYYYMMDD with the second one EXCLUSIVE.
  const start = formatDateUTC(eventDate);
  const end = formatDateUTC(addDays(eventDate, 1));

  const details = buildEventDescription(reminder);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Renew your ${reminder.itemLabel}`,
    dates: `${start}/${end}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an Outlook "create event" deep-link that opens the Outlook
 * Web compose view with everything pre-filled. Uses outlook.live.com
 * (personal accounts); Microsoft 365 / business accounts auto-redirect
 * to outlook.office.com.
 */
export function outlookCalendarURL(reminder: StoredReminder): string {
  const expiry = new Date(reminder.expiryISO);
  const eventDate = addDays(expiry, -30);
  const eventEnd = addDays(eventDate, 1);

  // Outlook accepts ISO-8601 date-only for all-day events.
  const startdt = formatDateOnly(eventDate);
  const enddt = formatDateOnly(eventEnd);

  const body = buildEventDescription(reminder);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `Renew your ${reminder.itemLabel}`,
    body,
    startdt,
    enddt,
    allday: 'true',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Shared event-description body used by both deep-links. */
function buildEventDescription(reminder: StoredReminder): string {
  const expiryLong = new Date(reminder.expiryISO).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const reminderDates = reminder.reminderDates.map(iso =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  );

  return [
    `Your ${reminder.itemLabel} expires on ${expiryLong}.`,
    '',
    'This reminder is set 30 days before that date so you have time to renew.',
    'You can add earlier reminders inside your calendar app — we suggest:',
    `• 90 days before — ${reminderDates[0]}`,
    `• 30 days before — ${reminderDates[1]}`,
    `• 7 days before — ${reminderDates[2]}`,
    '',
    `Reference: ${reminder.id}`,
  ].join('\n');
}

// ─── helpers ─────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYYMMDD in UTC — Google Calendar's all-day deep-link date format. */
function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** YYYY-MM-DD in UTC — Outlook's all-day deep-link date format. */
function formatDateOnly(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
