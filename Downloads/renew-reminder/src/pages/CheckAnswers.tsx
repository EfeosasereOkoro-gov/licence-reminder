import { useEffect } from 'react';
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

export function CheckAnswers() {
  const { answers, saveReminder } = useJourney();
  usePageTitle('Check your answers');

  useEffect(() => {
    // Guard against landing here without enough data.
    if (
      !answers.itemType ||
      !answers.expiryDay ||
      !answers.expiryMonth ||
      !answers.expiryYear ||
      !answers.email
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

  const handleConfirm = () => {
    const reminderDates = computeReminderDates(expiry);
    const retainUntil = computeRetainUntil(expiry);
    saveReminder({
      id: generateReminderId(),
      itemLabel,
      expiryISO: expiry.toISOString(),
      channel: 'email',
      reminderDates: reminderDates.map(d => d.toISOString()),
      createdAtISO: new Date().toISOString(),
      retainUntilISO: retainUntil.toISOString(),
    });
    navigate('/confirmation');
  };

  return (
    <>
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

        <div className="app-summary-row">
          <dt className="app-summary-row__key">Email address</dt>
          <dd className="app-summary-row__value">{answers.email}</dd>
          <dd className="app-summary-row__action">
            <a className="govbb-link" href="#/contact">
              Change<span className="govbb-visually-hidden"> email address</span>
            </a>
          </dd>
        </div>
      </dl>

      <h2 className="govbb-text-h3 app-mt-m app-mb-xs">Now set your reminder</h2>
      <div className="app-prose app-mb-xm">
        <p>
          By selecting "Set reminder" you agree we can send you reminder messages and
          store the minimum data needed to do so. We will delete it 30 days after the
          expiry date.
        </p>
      </div>

      <div className="govbb-btn-group">
        <button type="button" className="govbb-btn--secondary" onClick={() => navigate('/contact')}>
          Previous
        </button>
        <button type="button" className="govbb-btn" onClick={handleConfirm}>
          Set reminder
        </button>
      </div>
    </>
  );
}
