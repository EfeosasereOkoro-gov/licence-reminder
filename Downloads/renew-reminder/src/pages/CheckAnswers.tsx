import { useEffect } from 'react';
import { navigate } from '../router';
import {
  computeRetainUntil,
  computeReminderDate,
  generateReminderId,
  useJourney,
} from '../store';
import { ITEM_LABELS } from '../types';
import { usePageTitle } from '../usePageTitle';

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const OFFSET_CHOICES: { days: number; label: string }[] = [
  { days: 90, label: '90 days before' },
  { days: 30, label: '30 days before' },
  { days: 7,  label: '7 days before' },
];

export function CheckAnswers() {
  const { answers, setAnswers, saveReminder } = useJourney();
  usePageTitle('Check your answers');

  useEffect(() => {
    if (
      !answers.itemType ||
      !answers.expiryDay ||
      !answers.expiryMonth ||
      !answers.expiryYear
    ) {
      navigate('/');
    }
  }, [answers]);

  if (!answers.itemType) return null;

  const itemLabel =
    answers.itemType === 'custom'
      ? answers.customName.trim() || ITEM_LABELS.custom
      : ITEM_LABELS[answers.itemType];

  const expiry = new Date(
    Number(answers.expiryYear),
    Number(answers.expiryMonth) - 1,
    Number(answers.expiryDay),
  );

  // For each candidate offset, work out whether it would put the
  // reminder date in the past. If so, that option isn't actually usable
  // — we can't add an event to a calendar that's already happened.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOffsetValid = (days: number) => {
    const d = new Date(expiry);
    d.setDate(d.getDate() - days);
    return d.getTime() >= today.getTime();
  };
  const anyOffsetValid = OFFSET_CHOICES.some(c => isOffsetValid(c.days));

  // If the currently-selected offset is invalid but a longer-notice one
  // is, drop down to the longest available. The user can still change
  // it themselves.
  useEffect(() => {
    if (!anyOffsetValid) return;
    if (!isOffsetValid(answers.reminderOffset)) {
      const next = OFFSET_CHOICES.find(c => isOffsetValid(c.days));
      if (next) setAnswers({ reminderOffset: next.days });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiry.getTime()]);

  const handleConfirm = () => {
    if (!isOffsetValid(answers.reminderOffset)) return; // safety; button is disabled in this case
    const reminderDate = computeReminderDate(expiry, answers.reminderOffset);
    const retainUntil = computeRetainUntil(expiry);
    saveReminder({
      id: generateReminderId(),
      itemLabel,
      expiryISO: expiry.toISOString(),
      channel: 'email',
      reminderOffset: answers.reminderOffset,
      reminderDate: reminderDate.toISOString(),
      createdAtISO: new Date().toISOString(),
      retainUntilISO: retainUntil.toISOString(),
    });
    navigate('/save-to-calendar');
  };

  return (
    <>
      <span className="app-caption">Review</span>
      <h1 className="govbb-text-h2 app-mb-xm">Check your answers</h1>

      <dl className="app-summary-list">
        <div className="app-summary-row">
          <dt className="app-summary-row__key">Reminder for</dt>
          <dd className="app-summary-row__value">{itemLabel}</dd>
          <dd className="app-summary-row__action">
            <a className="govbb-link" href="#/select-item">
              Change<span className="govbb-visually-hidden"> reminder type</span>
            </a>
          </dd>
        </div>

        <div className="app-summary-row">
          <dt className="app-summary-row__key">Expiry date</dt>
          <dd className="app-summary-row__value">{formatLongDate(expiry)}</dd>
          <dd className="app-summary-row__action">
            <a className="govbb-link" href="#/expiry-date">
              Change<span className="govbb-visually-hidden"> expiry date</span>
            </a>
          </dd>
        </div>
      </dl>

      <fieldset className="govbb-fieldset app-mt-m" aria-describedby="reminder-offset-hint">
        <legend className="govbb-fieldset__legend">
          <h2 className="govbb-text-h3 app-mb-xs">When should we remind you?</h2>
        </legend>
        <p className="govbb-hint" id="reminder-offset-hint">
          Choose one — your calendar can only hold one reminder event per save.
        </p>

        <div className="app-stack-s app-mt-s" role="radiogroup">
          {OFFSET_CHOICES.map(({ days, label }) => {
            const id = `reminder-offset-${days}`;
            const reminderDate = new Date(expiry);
            reminderDate.setDate(reminderDate.getDate() - days);
            const valid = isOffsetValid(days);
            return (
              <div className="govbb-radio-item" key={days}>
                <input
                  id={id}
                  name="reminder-offset"
                  type="radio"
                  className="govbb-radio"
                  value={days}
                  checked={answers.reminderOffset === days}
                  disabled={!valid}
                  onChange={() => setAnswers({ reminderOffset: days })}
                />
                <label className="govbb-radio-item__label" htmlFor={id}>
                  {label}
                  <span className="govbb-hint" style={{ display: 'block' }}>
                    {valid
                      ? formatLongDate(reminderDate)
                      : 'Already passed — your document expires too soon for this reminder'}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      {!anyOffsetValid && (
        <div className="app-disclaimer app-mt-m" role="note">
          <p className="app-disclaimer__title">Your document expires too soon to set a useful reminder</p>
          <p>
            Every reminder we offer would land in the past for an expiry of{' '}
            {formatLongDate(expiry)}. You should renew your{' '}
            <strong>{itemLabel}</strong> as soon as possible.
          </p>
        </div>
      )}

      <h2 className="govbb-text-h3 app-mt-m app-mb-xs">Now set your reminder</h2>
      <div className="app-prose app-mb-xm">
        <p>
          When you're ready, select <strong>Set reminder</strong> to prepare the
          calendar event. On the next page you'll save it to your own calendar.
        </p>
        <p>
          We do not send you any messages and we do not keep a copy of your
          reminder.
        </p>
      </div>

      <div className="govbb-btn-group">
        <button type="button" className="govbb-btn--secondary" onClick={() => navigate('/expiry-date')}>
          Previous
        </button>
        <button
          type="button"
          className="govbb-btn"
          onClick={handleConfirm}
          disabled={!anyOffsetValid}
        >
          Set reminder
        </button>
      </div>
    </>
  );
}
