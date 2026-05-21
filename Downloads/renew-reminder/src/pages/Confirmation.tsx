import { useEffect, useRef } from 'react';
import { googleCalendarURL, outlookCalendarURL } from '../ics';
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

export function Confirmation() {
  const { lastReminder, resetAnswers } = useJourney();
  const titleRef = useRef<HTMLHeadingElement>(null);
  usePageTitle('Your reminder is ready');

  useEffect(() => {
    if (!lastReminder) {
      navigate('/');
    } else {
      titleRef.current?.focus();
    }
  }, [lastReminder]);

  if (!lastReminder) return null;

  const expiry = new Date(lastReminder.expiryISO);

  const handleStartAnother = () => {
    // Carry the notification channel and contact field forward so a returning
    // user doesn't re-enter their email or phone to set a second reminder.
    resetAnswers({ keepContact: true });
    navigate('/select-item');
  };

  return (
    <>
      <section className="app-success" aria-labelledby="confirmation-title">
        <h1 id="confirmation-title" ref={titleRef} tabIndex={-1} className="app-success__title">
          Your reminder is ready
        </h1>
        <p className="app-success__body">
          Your <strong>{lastReminder.itemLabel}</strong> expires on {formatLongDate(expiry)}.
          Save it to your calendar below.
        </p>
      </section>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Add to your calendar</h2>
      <div className="app-prose">
        <p>
          Open this reminder in your calendar. The event will be pre-filled
          with the expiry date — review it and save it to your account.
        </p>
      </div>
      <div className="govbb-btn-group app-mt-s">
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
      </div>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">What happens next</h2>
      <div className="app-prose">
        <p>
          Tap one of the buttons above to save the event to your Google Calendar
          or Microsoft Outlook account. Add reminders inside your calendar app to
          be notified in advance.
        </p>
        <p>
          We do not keep a copy of your reminder. Read our{' '}
          <a className="govbb-link" href="#/privacy">privacy notice</a>.
        </p>
      </div>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Have another reminder to set?</h2>
      <div className="app-prose">
        <p>
          Set a reminder for another document — for example, a vehicle
          registration or a passport. It takes less than a minute.
        </p>
      </div>
      <div className="govbb-btn-group app-mt-s">
        <button type="button" className="govbb-btn" onClick={handleStartAnother}>
          Set another reminder
        </button>
      </div>

      <p className="app-mt-m">
        <a
          className="govbb-link"
          href="https://forms.gle/example"
          target="_blank"
          rel="noopener noreferrer"
        >
          What did you think of this service?
        </a>
        {' '}(takes 30 seconds)
      </p>
    </>
  );
}
