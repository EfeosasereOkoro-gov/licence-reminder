import type { StoredReminder } from './types';

/**
 * Build a standards-compliant .ics (iCalendar) file for a single
 * reminder. The result imports cleanly into Apple Calendar, Outlook,
 * and Google Calendar (via "Import").
 *
 * We model the document expiry as one all-day event on the expiry
 * date, with three VALARM components attached — one for each scheduled
 * reminder (90, 30, 7 days before). When the user adds the event to
 * their calendar, their calendar app fires those reminder notifications
 * automatically; we don't need to send anything ourselves.
 */
export function buildReminderICS(reminder: StoredReminder): string {
  const expiry = new Date(reminder.expiryISO);
  const dtstart = formatDateUTC(expiry);
  const dtend = formatDateUTC(addDays(expiry, 1));
  const dtstamp = formatDateTimeUTC(new Date());

  const summary = `${reminder.itemLabel} expires`;
  const description = [
    `Your ${reminder.itemLabel} expires today.`,
    '',
    'You set this up using the Government of Barbados Renew Reminder service.',
    `Reference: ${reminder.id}`,
  ].join('\\n');

  const valarms = [90, 30, 7].map(days => [
    'BEGIN:VALARM',
    `TRIGGER:-P${days}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`${reminder.itemLabel} expires in ${days} days`)}`,
    'END:VALARM',
  ].join('\r\n'));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Government of Barbados//Renew Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@renew-reminder.gov.bb`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${description}`,
    'TRANSP:TRANSPARENT',
    ...valarms,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];

  return lines.join('\r\n');
}

/**
 * Trigger a download of the ICS file in the user's browser.
 *
 * Kept for fallback / non-Google calendar users — the .ics carries the
 * three VALARMs natively so the user's calendar app fires the reminders
 * itself. Not currently wired to a button on the confirmation page.
 */
export function downloadReminderICS(reminder: StoredReminder): void {
  const ics = buildReminderICS(reminder);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const fileName = `renew-reminder-${reminder.id}.ics`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Defer revoke a moment so iOS Safari has time to fetch the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a Google Calendar "create event" URL that opens the event-editor
 * with everything pre-filled. Clicking it from a browser drops the user
 * into Google Calendar; they review and tap Save.
 *
 * Caveat: a single Google Calendar URL can only carry the event itself,
 * not multiple notification alarms — Google has its own reminder system
 * with one default reminder on each event. We include the three reminder
 * dates in the description so the user can add native reminders manually
 * if they want them.
 */
export function googleCalendarURL(reminder: StoredReminder): string {
  const expiry = new Date(reminder.expiryISO);

  // All-day event: dates are YYYYMMDD with the second one EXCLUSIVE.
  const start = formatDateUTC(expiry);
  const end = formatDateUTC(addDays(expiry, 1));

  const reminderDates = reminder.reminderDates.map(iso =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  );

  const details = [
    `Your ${reminder.itemLabel} expires today.`,
    '',
    'We recommend setting up reminders for these dates inside Google Calendar:',
    `• 90 days before — ${reminderDates[0]}`,
    `• 30 days before — ${reminderDates[1]}`,
    `• 7 days before — ${reminderDates[2]}`,
    '',
    `Reference: ${reminder.id}`,
  ].join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${reminder.itemLabel} expires`,
    dates: `${start}/${end}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── helpers ─────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYYMMDD in UTC — used for all-day DTSTART/DTEND. */
function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** YYYYMMDDTHHMMSSZ — used for DTSTAMP. */
function formatDateTimeUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/** Escape commas, semicolons, and newlines per RFC 5545. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
