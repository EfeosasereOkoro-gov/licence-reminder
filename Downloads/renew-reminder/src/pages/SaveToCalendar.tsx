import { useEffect, useRef } from 'react';
import { downloadICS, googleCalendarURL, outlookCalendarURL } from '../ics';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Stand-alone page whose entire purpose is for the user to save the
 * reminder to their own calendar. Deliberately *not* framed as a
 * success / confirmation page — the user hasn't done anything yet.
 * The page IS the action.
 */
export function SaveToCalendar() {
  const { lastReminder, resetAnswers } = useJourney();
  const titleRef = useRef<HTMLHeadingElement>(null);
  usePageTitle('Save your reminder to your calendar');

  useEffect(() => {
    if (!lastReminder) {
      navigate('/');
    } else {
      titleRef.current?.focus();
    }
  }, [lastReminder]);

  if (!lastReminder) return null;

  const expiry = new Date(lastReminder.expiryISO);
  const reminderDate = new Date(lastReminder.reminderDate);

  const handleStartAnother = () => {
    resetAnswers({ keepContact: true });
    navigate('/select-item');
  };

  return (
    <>
      <h1 ref={titleRef} tabIndex={-1} className="govbb-text-h2 app-mb-xs">
        Save your reminder to your calendar
      </h1>
      <div className="app-prose">
        <p className="govbb-text-body-lg">
          Your <strong>{lastReminder.itemLabel}</strong> expires on{' '}
          {formatLongDate(expiry)}.
        </p>
        <p>
          We've prepared a reminder event for{' '}
          <strong>{formatLongDate(reminderDate)}</strong>{' '}
          <span className="govbb-hint" style={{ display: 'inline' }}>
            ({lastReminder.reminderOffset} days before expiry)
          </span>.
        </p>
      </div>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Choose your calendar</h2>
      <div className="govbb-btn-group">
        <a
          className="govbb-btn"
          href={googleCalendarURL(lastReminder)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Add to Google Calendar
        </a>
        <a
          className="govbb-btn--secondary"
          href={outlookCalendarURL(lastReminder)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Add to Microsoft Outlook
        </a>
        <button
          type="button"
          className="govbb-btn--secondary"
          onClick={() => downloadICS(lastReminder)}
        >
          Add to Apple Calendar
        </button>
      </div>
      <p className="govbb-hint app-mt-xs">
        Apple Calendar downloads a small file; opening it on your phone or laptop
        adds the event.
      </p>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">After you've saved it</h2>
      <div className="app-prose">
        <p>
          We do not send you any messages and we do not keep a copy of your
          reminder. Read our{' '}
          <a className="govbb-link" href="#/privacy">privacy notice</a>.
        </p>
      </div>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Have another reminder to set?</h2>
      <div className="app-prose">
        <p>
          Set a reminder for another document — for example, a passport or a
          vehicle registration. It takes less than a minute.
        </p>
      </div>
      <div className="govbb-btn-group app-mt-s">
        <button type="button" className="govbb-btn" onClick={handleStartAnother}>
          Set another reminder
        </button>
      </div>

    </>
  );
}
