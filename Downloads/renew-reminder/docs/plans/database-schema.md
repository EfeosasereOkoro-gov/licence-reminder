# Database schema — renew-reminder

## Goal

Define the smallest database schema that lets the renew-reminder service send three reminder notifications (90, 30, 7 days before expiry) to each subscriber, then forget them.

The current app stores reminders only in `localStorage`, so nothing is actually sent. This schema is the data shape a server-side backend would use when one exists; it does not commit to a specific backend stack.

## Approach

**Two tables, normalised**: one row per *reminder* (the citizen's request) plus one row per *scheduled send* (three children per reminder).

Considered and rejected:

- **One flat table** (every send carries its own copy of contact info and item label). Simpler queries, but triples the PII footprint — directly contradicts the "store as little as possible" goal.
- **Status as an aggregate field on the reminder** (`pending` / `partial` / `complete`). Compact, but loses per-send detail and forces a separate audit log to answer "which of the three failed?".

The chosen shape lets the scheduler poll a small partial index for due sends, keeps PII in a single row, and supports a clean cascade delete when retention expires.

## Schema

PostgreSQL dialect. Adjust types if a different engine is chosen (see Open Questions).

```sql
-- One row per reminder request.
CREATE TABLE reminders (
  id              TEXT        PRIMARY KEY,           -- 'REM-XXXX-XXXX', generated client-side
  item_label      TEXT        NOT NULL,              -- e.g. 'Passport', 'Boat licence'
  expiry_date     DATE        NOT NULL,              -- so messages can say 'expires on 14 Aug 2026'
  contact_method  TEXT        NOT NULL
                              CHECK (contact_method IN ('email', 'sms')),
  contact_value   TEXT        NOT NULL,              -- email address or phone number
  delete_after    TIMESTAMPTZ NOT NULL,              -- hard-delete deadline; enforced by purge job
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reminders_delete_after_idx ON reminders (delete_after);

-- One row per scheduled send (three per reminder: 90 / 30 / 7 days before expiry).
CREATE TABLE reminder_sends (
  id           BIGSERIAL    PRIMARY KEY,
  reminder_id  TEXT         NOT NULL
                            REFERENCES reminders(id) ON DELETE CASCADE,
  send_at      TIMESTAMPTZ  NOT NULL,                -- when this notification should fire
  status       TEXT         NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at      TIMESTAMPTZ,                          -- null until status='sent'
  attempts     INTEGER      NOT NULL DEFAULT 0       -- worker retry counter; drop if no backend yet
);

CREATE INDEX reminder_sends_due_idx
  ON reminder_sends (send_at)
  WHERE status = 'pending';
```

### Field notes

- **`id`** — keeps the existing `REM-XXXX-XXXX` format from `store.ts`. Human-readable, no PII, no auto-increment collisions across environments.
- **`item_label`** — free text, populated from the frontend's `ITEM_LABELS[itemType]` or the user's `customName`. Avoids the `custom` enum-key gap.
- **`expiry_date`** — `DATE`, not `TIMESTAMPTZ`. Expiries are a calendar concept; time-of-day is noise.
- **`contact_value`** — single column for both email and SMS targets. Validated by `contact_method`. Encryption at rest is an open question (see below).
- **`delete_after`** — computed at insert time as `expiry_date + 7 days` (proposed; see Open Questions). Stable single field, so the purge job is a one-line `DELETE FROM reminders WHERE delete_after < now()` and the cascade clears the sends.
- **`reminder_sends.send_at`** — full timestamp, because the time of day a reminder fires is a real operational choice (probably early morning local time).
- **`status`** — per-row, so the scheduler query is `SELECT ... WHERE status = 'pending' AND send_at <= now()`. `'skipped'` covers the case where a reminder is created within the 90/30/7-day windows (e.g. user enters a date 20 days away; the 90- and 30-day rows are inserted already `'skipped'`).
- **`attempts`** — operational only. Remove if the schema is purely descriptive; reinstate once a worker exists.

### Lifecycle

1. **Create**: insert one `reminders` row plus three `reminder_sends` rows in a single transaction. Past send dates get inserted with `status='skipped'`.
2. **Send**: worker selects due rows from the partial index, sends the notification, sets `status='sent'`, `sent_at=now()`. On failure: `status='failed'`, `attempts=attempts+1` (retry policy TBD).
3. **Delete**: a purge job runs daily, `DELETE FROM reminders WHERE delete_after < now()`. The foreign-key cascade removes the matching `reminder_sends` rows.

## Scope

- Schema definition (the two tables above) as a migration file
- Documentation of the retention policy and worker contract
- No backend code, no migration tooling choice, no worker implementation — those are separate sessions

## Files

To be added in the implementation session:

- `migrations/0001_create_reminders.sql` — the two `CREATE TABLE` statements above (path depends on the migration tool, TBD)
- Possibly a `db/README.md` documenting the retention model and how the worker is expected to interact with `reminder_sends`

No frontend file changes from this plan. The client's `StoredReminder` shape in `src/types.ts` (and the `localStorage` logic in `src/store.ts`) stay as-is until the backend exists and the frontend is wired to POST to it.

## Verify

- The schema applies cleanly on a fresh Postgres database.
- A manual end-to-end check: insert one reminder + three sends, fast-forward `send_at`, run the scheduler query, confirm the right row is returned.
- The purge query, run against a reminder with `delete_after < now()`, deletes both the parent and all child rows.

## Open questions

1. **Real backend or design-ahead?** This plan keeps the operational columns (`attempts`) in case a worker is coming. If the schema is purely descriptive for now, drop `attempts` and `sent_at`.
2. **Database engine.** Schema is written in PostgreSQL. SQLite or MySQL would need type changes (`BIGSERIAL`, `TIMESTAMPTZ`, partial index syntax). What's the target?
3. **Confirmation / double opt-in.** Right now anyone can submit any email or phone number, including ones they don't own. Should the schema include a `verified_at` column and a confirmation-token flow? Adds complexity but protects against abuse.
4. **Retention grace period.** Proposal: `delete_after = expiry_date + 7 days`. The current `localStorage` logic uses 30 days. Which is right? Shorter is better for minimisation; longer helps with support queries.
5. **PII encryption at rest.** Most hosted Postgres providers encrypt at rest by default at the disk level. Is that sufficient, or does `contact_value` need column-level encryption (which complicates the worker)?
6. **Operational error info.** No `last_error` column in the minimal schema. Adding one would help debugging but error messages from providers sometimes echo the email back, effectively duplicating PII. Decide once a worker is on the table.
7. **Time of day for sends.** `send_at` is a full timestamp but the offset rule is currently "subtract N days from expiry, midnight UTC". Is that the right firing time, or should it be a fixed local hour (e.g. 08:00 Atlantic Standard Time)?

## Next session

When ready to implement, start `/bb:dev-start` and pick one of:

- Land the schema only (migration file + README) against a chosen DB engine.
- Land the schema **plus** a thin write API the frontend can POST to, so the journey actually persists.
