# Renew Reminder

A privacy-first reminder service that helps citizens stay on top of important
document renewals — driver's licence, vehicle registration, passport, permit.

Built for the Government of Barbados Digital Service Standards. Designed to do
the minimum possible: collect only the document type and expiry date, never
store identifying information server-side, and hand the user back a calendar
event they save in their own Google Calendar or Microsoft Outlook account.

## Status

Alpha prototype. The service does not send reminder emails or text messages
itself; it gives the user a pre-filled deep-link to their own calendar
provider, and that calendar handles the reminders.

## Live URLs

| Branch | URL | What's on it |
| --- | --- | --- |
| `master` | <https://efeosasereokoro-gov.github.io/licence-reminder/> | Production |
| `staging` | <https://efeosasereokoro-gov.github.io/licence-reminder/staging/> | Pre-merge preview |
| `calendar` | <https://efeosasereokoro-gov.github.io/licence-reminder/calendar/> | Calendar-only feature branch |

## User journey

1. **Start page** — choose between manual entry (Start now) or the photo
   shortcut (Use a photo of your document).
2. **Manual path** — Step 1 picks the document type, Step 2 enters the expiry
   date.
3. **Photo path** — uploads an image; an in-browser OCR pass tries to read the
   document type and expiry date. The user confirms each with Yes/No before
   continuing. Capped at 2.5 seconds so the user never waits long.
4. **Check answers** — review what was collected, with Change links per row.
5. **Confirmation** — two deep-link buttons: Add to Google Calendar and Add to
   Microsoft Outlook. Both open the user's calendar with the event pre-filled.

## Data handling

The service collects:

- the type of document
- its expiry date

It does **not** collect or store:

- your name, address, or date of birth
- any document numbers
- the photo you uploaded (read in-browser only; never leaves the device)

No backend, no database, no email. The reminder lives in your own calendar.

## Why does it look like this?

The substantive design and architecture decisions — no backend, no email
sending, in-browser OCR, dual calendar deep-links, 30-day event offset
— are documented in [`docs/decisions.md`](docs/decisions.md). Start
there if you want to understand why the service is shaped the way it
is.

## Tech stack

| Layer | Library |
| --- | --- |
| Framework | React 19 + Vite 6 |
| Language | TypeScript |
| Design system | GovBB (Government of Barbados) |
| OCR | Tesseract.js (WebAssembly, lazy-loaded) |
| Calendar integration | Google Calendar `action=TEMPLATE` and Outlook `deeplink/compose` URLs |
| Hosting | GitHub Pages |

## Local development

Requires Node.js 20+.

```bash
cd Downloads/renew-reminder
npm install
npm run dev      # serves on http://localhost:3001
```

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run lint     # tsc --noEmit
```

## Deployment

Pushes to `master`, `staging`, or `calendar` trigger
`.github/workflows/deploy.yml`. The workflow checks out all three branches,
builds each with the right `--base` for its sub-path, and ships them as one
GitHub Pages artifact. See the workflow file for the full pipeline.

---

Built for the Government of Barbados Digital Service.
