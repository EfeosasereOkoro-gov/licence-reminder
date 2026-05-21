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

export function Confirmation() {
  const { lastReminder, resetAnswers } = useJourney();
  const titleRef = useRef<HTMLHeadingElement>(null);
  usePageTitle('Almost done — save it to your calendar');

  useEffect(() => {
    if (!lastReminder) {
      navigate('/');
    } else {
      titleRef.current?.focus();
    }
  }, [lastReminder]);

  if (!lastReminder) return null;

  const expiry = new Date(lastReminder.expiryISO);
  // The reminder lands 30 days BEFORE the actual expiry date so the
  // user has lead-time. We show this on the page so the copy doesn't
  // mislead about what the saved event will look like in their calendar.
  const reminderDate = new Date(expiry);
  reminderDate.setDate(reminderDate.getDate() - 30);

  const handleStartAnother = () => {
    resetAnswers({ keepContact: true });
    navigate('/select-item');
  };

  return (
    <>
      <section className="app-success app-success--action" aria-labelledby="confirmation-title">
        <h1 id="confirmation-title" ref={titleRef} tabIndex={-1} className="app-success__title">
          Almost done — save it to your calendar
        </h1>
        <p className="app-success__body">
          Your <strong>{lastReminder.itemLabel}</strong> expires on {formatLongDate(expiry)}.
          We've prepared a reminder event for you. You're not finished until you save
          it to your calendar.
        </p>
      </section>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Save it to your calendar</h2>
      <div className="app-prose">
        <p>
          The event will be added to your calendar on{' '}
          <strong>{formatLongDate(reminderDate)}</strong> (30 days before your
          document expires) so you have time to renew. Select whichever calendar
          you use:
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

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">What happens next</h2>
      <div className="app-prose">
        <p>
          Select one of the buttons above to save the event to your calendar. Your
          calendar app will show the reminder on{' '}
          <strong>{formatLongDate(reminderDate)}</strong>. You can add earlier
          reminders inside your calendar app if you want more notice.
        </p>
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

      <p className="app-mt-m">
        <a
          className="govbb-link"
          href="https://forms.gle/example"
          target="_blank"
          rel="noopener noreferrer"
        >
          What did you think of this service?
        </a>{' '}
        <span className="govbb-hint" style={{ display: 'inline' }}>
          (takes 30 seconds)
        </span>
      </p>
    </>
  );
}
