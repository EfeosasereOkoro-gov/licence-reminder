import { useEffect, useState } from 'react';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import {
  computeRetainUntil,
  computeReminderDates,
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
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('Check your answers', errors.length > 0);

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

  const toggleOffset = (days: number, checked: boolean) => {
    const next = checked
      ? [...new Set([...answers.reminderOffsets, days])].sort((a, b) => b - a)
      : answers.reminderOffsets.filter(o => o !== days);
    setAnswers({ reminderOffsets: next });
    if (errors.length && next.length > 0) {
      setErrors(prev => prev.filter(e => e.field !== 'reminder-offsets'));
    }
  };

  const handleConfirm = () => {
    if (answers.reminderOffsets.length === 0) {
      setErrors([{ field: 'reminder-offsets-90', message: 'Choose at least one reminder' }]);
      return;
    }
    setErrors([]);

    const reminderDates = computeReminderDates(expiry, answers.reminderOffsets);
    const retainUntil = computeRetainUntil(expiry);
    saveReminder({
      id: generateReminderId(),
      itemLabel,
      expiryISO: expiry.toISOString(),
      channel: 'email',
      reminderOffsets: answers.reminderOffsets,
      reminderDates: reminderDates.map(d => d.toISOString()),
      createdAtISO: new Date().toISOString(),
      retainUntilISO: retainUntil.toISOString(),
    });
    navigate('/save-to-calendar');
  };

  const offsetsError = errors.find(e => e.field.startsWith('reminder-offsets'));

  return (
    <>
      <ErrorSummary errors={errors} />

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

      <fieldset className="govbb-fieldset app-mt-m" aria-describedby={offsetsError ? 'reminder-offsets-error' : 'reminder-offsets-hint'}>
        <legend className="govbb-fieldset__legend">
          <h2 className="govbb-text-h3 app-mb-xs">When should we remind you?</h2>
        </legend>
        <p className="govbb-hint" id="reminder-offsets-hint">
          Choose one or more. We'll create a calendar event for each.
        </p>
        {offsetsError && (
          <p className="govbb-error-message app-mt-xs" id="reminder-offsets-error">
            <span className="govbb-visually-hidden">Error: </span>
            {offsetsError.message}
          </p>
        )}

        <div className="app-stack-s app-mt-s">
          {OFFSET_CHOICES.map(({ days, label }) => {
            const id = `reminder-offsets-${days}`;
            const checked = answers.reminderOffsets.includes(days);
            const reminderDate = new Date(expiry);
            reminderDate.setDate(reminderDate.getDate() - days);
            return (
              <div className="govbb-checkbox-item" key={days}>
                <input
                  id={id}
                  name="reminder-offset"
                  type="checkbox"
                  className="govbb-checkbox"
                  checked={checked}
                  aria-invalid={!!offsetsError}
                  onChange={e => toggleOffset(days, e.target.checked)}
                />
                <label className="govbb-checkbox-item__label" htmlFor={id}>
                  {label}
                  <span className="govbb-hint" style={{ display: 'block' }}>
                    {formatLongDate(reminderDate)}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <h2 className="govbb-text-h3 app-mt-m app-mb-xs">Now set your reminder</h2>
      <div className="app-prose app-mb-xm">
        <p>
          When you're ready, select <strong>Set reminder</strong> to prepare the
          calendar event{answers.reminderOffsets.length > 1 ? 's' : ''}. On the next
          page you'll save{answers.reminderOffsets.length > 1 ? ' them' : ' it'} to
          your own calendar.
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
        <button type="button" className="govbb-btn" onClick={handleConfirm}>
          Set reminder
        </button>
      </div>
    </>
  );
}
