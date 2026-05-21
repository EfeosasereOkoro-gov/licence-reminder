# Decisions

This file records the substantive decisions made while building Renew
Reminder. It's not a changelog (use `git log` for that) and it's not a
spec (read the brief in `README.md`). It exists to answer the question
*"why does it look like this?"* for anyone who joins the project later.

## How to use this file

- One section per decision.
- Decisions are ordered by when they were made, not by importance.
- Each entry has three parts:
  - **Context** — what we were trying to do and what the question was.
  - **Decision** — what we chose, in one sentence.
  - **Trade-offs** — what we accepted by choosing this, and what we
    rejected.
- If a decision changes, update the section and add a line like
  `_Updated: 2026-MM-DD — reason_` at the end. Don't delete the old
  text outright; the history is useful.

---

## 1. No backend, no database

**Context:** The brief asks for a service that reminds citizens before a
document expires. The obvious implementation is a server that stores
reminders and emails users on a schedule. The brief also asks for
data minimisation — store nothing more than necessary, retain nothing
longer than necessary.

**Decision:** Build the prototype as a static site with no server
component at all. No backend, no database, no email queue.

**Trade-offs:**

- ✅ Hosts on GitHub Pages for free. No infrastructure to maintain.
- ✅ The privacy story is much stronger: there's nothing for us to lose
  because we hold nothing.
- ✅ Faster to prototype and iterate.
- ❌ We can't send emails or SMS ourselves. The user has to add the
  reminder to their own calendar (see decision 2).
- ❌ Anything that needs to fire on a schedule has to be delegated to
  the user's calendar app.

---

## 2. No email or SMS sending — calendar integration instead

**Context:** The original brief framed reminders as "we send the user
an email or text X days before expiry". Without a backend (decision 1),
we can't actually send anything.

**Decision:** Don't send anything. Instead, give the user a deep-link
to their own calendar with the event pre-filled. Their calendar app
becomes the reminder.

**Trade-offs:**

- ✅ Honest about what the prototype does. No fake promises.
- ✅ The reminder lives with the user, on a device they already check,
  in a tool they already trust.
- ✅ No email-deliverability problems, no spam-filter issues, no
  bounced messages.
- ❌ Users without a Google or Microsoft account get less value (the
  deep-links won't work for them).
- ❌ The user has to take an extra step (the click). If they don't
  click, there's no reminder.
- ❌ A single deep-link URL can only carry one reminder per event,
  not three. We address this by placing the event 30 days before
  expiry (see decision 10) and listing the 90/30/7-day schedule in
  the event description for users who want to add their own
  reminders.

---

## 3. Tech stack: Vite + React 19 + TypeScript

**Context:** Needed a small front-end framework that supports the GovBB
design system CSS as-is, builds fast, deploys statically, and has
TypeScript out of the box.

**Decision:** Vite 6 + React 19 + TypeScript. Mirrors the existing
VoiceBox app's stack to keep tooling consistent across the repo.

**Trade-offs:**

- ✅ Fast HMR during development.
- ✅ Small production bundle (around 230 KB for the main entry).
- ✅ Easy code-splitting for lazy-loaded chunks (Tesseract is loaded
  this way).
- ❌ Pulls a build step in. Not the absolute minimum (vanilla HTML +
  JS would also work) but the productivity payoff is worth it.

---

## 4. Design system: GovBB CSS as-is

**Context:** A `dist/styles.css` ships with the project — the
Government of Barbados design system, with all the `govbb-*`
component classes. Reimplementing it in Tailwind or CSS modules would
be more work and would drift from the source.

**Decision:** Import the GovBB CSS file unchanged. App-specific
extensions live in `src/app.css` with `app-*` class names, never
overriding `govbb-*`.

**Trade-offs:**

- ✅ Design consistency with other Government of Barbados services.
- ✅ Any updates to the GovBB design system can be pulled in by
  swapping `src/govbb.css`.
- ❌ The bundle carries CSS we don't use. Manageable: ~52 KB
  uncompressed.

---

## 5. Hosting: GitHub Pages, three-branch sub-paths

**Context:** Needed a public preview URL with no infrastructure cost,
plus a way to share work-in-progress without disturbing production.

**Decision:** Deploy to GitHub Pages. The workflow at
`.github/workflows/deploy.yml` builds all three branches on every push
and ships them as one Pages artifact:

- `master` → `/licence-reminder/`
- `staging` → `/licence-reminder/staging/`
- `calendar` → `/licence-reminder/calendar/`

**Trade-offs:**

- ✅ Free, low-friction, no card needed.
- ✅ Each branch gets its own URL for stakeholder review.
- ✅ Pages cache invalidates automatically per deploy.
- ❌ Pages replaces the entire site on every deploy, so the workflow
  has to rebuild every branch every time. Each push triggers a
  triple-build.
- ❌ The `github-pages` environment has a branch-policy that needed
  manual whitelisting of `staging` and `calendar` (via the API)
  before they could deploy.

---

## 6. Journey shape: GDS one-thing-per-page

**Context:** The Barbados Digital Service Standards reference GOV.UK
patterns. The default GOV.UK pattern is one question per page, an
error-summary at the top on failed submission, and a "Check your
answers" page before the final commit.

**Decision:** Follow the GDS pattern. Manual journey is:

```
Start → Select item → Expiry date → Check answers → Confirmation
```

Each step has a single fieldset, a Previous/Continue button group at
the bottom, and an error-summary at the top on validation failure.

**Trade-offs:**

- ✅ Accessibility-friendly. Easier to navigate with a screen reader.
- ✅ Easier to test (per-step state).
- ✅ Easier to renumber when steps are added or removed.
- ❌ More clicks than a single-page form.

---

## 7. Photo recognition: in-browser OCR with a 2.5-second budget

**Context:** A photo of the document would let the user skip Steps 1
and 2. The naive solution is a cloud Vision API (Google, Anthropic,
GPT-4o); the privacy-preserving solution is in-browser OCR.

**Decision:** Use Tesseract.js running in a WebAssembly worker.
Lazy-load it only when the user opens the photo panel. Hard-cap the
recognition step at 2.5 seconds — if OCR hasn't returned by then, we
move on with whatever it found (which may be nothing), and the user
fills in the missing fields manually.

**Trade-offs:**

- ✅ The photo never leaves the device. Aligns with the brief's data
  principles.
- ✅ No API key, no cost, no rate limits.
- ❌ Tesseract on phone-camera photos is unreliable. We mitigated by:
  resizing the image to 640 px before OCR; using the "fast" tessdata
  variant; prewarming the engine when the panel opens; and pairing
  the result with a Yes/No verification flow (decision 8).
- ❌ First run downloads ~3 MB of language data from the public
  Tesseract CDN. Cached for subsequent uses.

_Considered and rejected:_ a cloud Vision API. Would be faster and
more accurate but needs a serverless proxy (Cloudflare Worker or
similar) to hold the API key. Outside the scope of a static prototype.

_Considered and rejected:_ a barcode-only flow (the back of a driver's
licence carries a PDF417 barcode). Tested briefly — accurate when it
worked, but most users wouldn't think to photograph the back of the
card, and not all document types have a barcode.

---

## 8. Photo flow UX: Yes/No verification, not auto-fill-and-trust

**Context:** OCR isn't reliable. If we silently auto-fill the form
with whatever Tesseract returned, the user might commit a wrong date
without noticing.

**Decision:** After OCR completes (or times out), show what was read
and ask the user to confirm each field — *"Is this the type of
document?"* with Yes / *No, choose another*. Same for the date. If
they pick "No", reveal the inline correction form pre-filled with the
OCR'd value so they can edit rather than retype.

**Trade-offs:**

- ✅ Bad OCR can't slip through unnoticed.
- ✅ Users get the speed benefit when OCR works, the manual path when
  it doesn't, and a tweak-not-retype experience in between.
- ❌ One extra screen between photo and the rest of the journey.

---

## 9. Calendar integration: dual Google + Outlook deep-links

**Context:** "Save to my calendar" can be done three ways: an `.ics`
file download, a deep-link to the calendar provider's web UI, or
both. Different users want different things.

**Decision:** Two buttons on the confirmation page:

- **Add to Google Calendar** — primary, teal. Opens
  `calendar.google.com/calendar/render?action=TEMPLATE&...` in a new
  tab.
- **Add to Microsoft Outlook** — secondary, grey. Opens
  `outlook.live.com/calendar/0/deeplink/compose?...` (Microsoft 365
  accounts auto-redirect to `outlook.office.com`).

Both share `buildEventDescription()` so the description text is
identical across providers.

**Trade-offs:**

- ✅ One-click for Google and Microsoft users — the two largest
  consumer/business calendar populations.
- ✅ No file downloads, no "open with…" picker.
- ❌ Apple Calendar users have to do something else (we don't offer
  an `.ics` button right now). Listed in `README.md` follow-ups.
- ❌ Deep-links can only carry one event, not three alarms. We mitigate
  with decision 10.

---

## 10. Calendar event placed 30 days before expiry

**Context:** Originally the calendar event landed on the actual expiry
date with the text "Your X expires today". This was a bug: the whole
point of the service is to give the user notice *before* the document
expires, and a calendar's default notification (usually 10 minutes
before) wouldn't be useful for that. The user would see the event in
their calendar and think they'd been reminded in time — but their
document would already have expired that morning.

**Decision:** The deep-link places the event 30 days before the
expiry date, titled "Renew your X" rather than "X expires". The event
description states the real expiry date and lists the 90/30/7-day
reminder schedule so the user can add earlier in-calendar reminders
manually.

**Trade-offs:**

- ✅ The user sees the event 30 days out — useful lead-time for any
  renewal.
- ✅ The title is action-oriented, not just informational.
- ❌ Power users might prefer to choose the lead-time themselves. Not
  worth the UI complexity yet for a prototype.

_Status: current. Was wrong in initial implementation — fixed in
commit 67d2c8b._

---

## 11. No SMS option in the MVP

**Context:** The original brief offered both email and SMS as
notification channels. We never wired up a real SMS provider, and
once we moved to "no notifications at all, calendar deep-link only"
(decision 2), SMS became moot.

**Decision:** Drop SMS entirely. The `Channel` type and `phone` field
remain in the data layer in case SMS comes back, but no UI collects
them.

**Trade-offs:**

- ✅ One fewer step in the journey.
- ✅ Less type-level branching on every page that touches contact info.
- ❌ Lock-in to one channel. Bringing SMS back means re-adding the
  channel-picker step.

---

## 12. No email collection step

**Context:** Email was originally collected so the service could send
reminder emails. Once we moved to calendar-only delivery (decision 2),
the email address served no purpose.

**Decision:** Drop the Contact step entirely. The journey is now
two steps (Select item, Expiry date) followed by Check answers.

**Trade-offs:**

- ✅ Matches the brief's "collect only what you need" principle.
- ✅ Shorter journey: "It takes less than a minute" rather than
  "about 2 minutes".
- ❌ If we ever bring back email/SMS, we re-add the step.
