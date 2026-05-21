import type { StoredReminder } from './types';

function eventTitle(reminder: StoredReminder): string {
  return `Renew your ${reminder.itemLabel}`;
}

/**
 * Build a Google Calendar "create event" URL. Event lands on
 * `reminderDate` — the user's chosen number of days before the
 * actual expiry.
 */
export function googleCalendarURL(reminder: StoredReminder): string {
  const eventDate = new Date(reminder.reminderDate);

  const start = formatDateUTC(eventDate);
  const end = formatDateUTC(addDays(eventDate, 1));

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(reminder),
    dates: `${start}/${end}`,
    details: buildEventDescription(reminder),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build a Microsoft Outlook deep-link. Uses outlook.live.com; Microsoft
 * 365 / business accounts auto-redirect to outlook.office.com.
 */
export function outlookCalendarURL(reminder: StoredReminder): string {
  const eventDate = new Date(reminder.reminderDate);

  const startdt = formatDateOnly(eventDate);
  const enddt = formatDateOnly(addDays(eventDate, 1));

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: eventTitle(reminder),
    body: buildEventDescription(reminder),
    startdt,
    enddt,
    allday: 'true',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Build an iCalendar (.ics) file for Apple Calendar / Thunderbird /
 * any native calendar app that imports .ics.
 */
export function buildICS(reminder: StoredReminder): string {
  const eventDate = new Date(reminder.reminderDate);

  const dtstart = formatDateUTC(eventDate);
  const dtend = formatDateUTC(addDays(eventDate, 1));
  const dtstamp = formatDateTimeUTC(new Date());

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
    `SUMMARY:${escapeText(eventTitle(reminder))}`,
    `DESCRIPTION:${escapeText(buildEventDescription(reminder))}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];
  return lines.join('\r\n');
}

/** Trigger a browser download of the .ics for the given reminder. */
export function downloadICS(reminder: StoredReminder): void {
  const ics = buildICS(reminder);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `renew-reminder-${reminder.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Shared event-description body used by all three calendar exports. */
function buildEventDescription(reminder: StoredReminder): string {
  const expiryLong = new Date(reminder.expiryISO).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return [
    `Your ${reminder.itemLabel} expires on ${expiryLong}.`,
    '',
    `This reminder lands ${reminder.reminderOffset} days before that date so you have time to renew.`,
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

/** YYYYMMDDTHHMMSSZ — iCalendar DTSTAMP. */
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
