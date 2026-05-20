import { useEffect, useRef, useState } from 'react';
import { MessagePreview } from '../components/MessagePreview';
import { googleCalendarURL } from '../ics';
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
  const { answers, lastReminder, resetAnswers } = useJourney();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  usePageTitle('Your reminder has been set');

  useEffect(() => {
    if (!lastReminder) {
      navigate('/');
    } else {
      titleRef.current?.focus();
    }
  }, [lastReminder]);

  if (!lastReminder) return null;

  const expiry = new Date(lastReminder.expiryISO);
  const contact = lastReminder.channel === 'email' ? answers.email : answers.phone;

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
          Your reminder has been set
        </h1>
        <p className="app-success__body">
          We will notify you by {lastReminder.channel === 'email' ? 'email' : 'text message'} before
          your <strong>{lastReminder.itemLabel}</strong> expires on {formatLongDate(expiry)}.
        </p>
      </section>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">Add to Google Calendar</h2>
      <div className="app-prose">
        <p>
          Open this reminder in Google Calendar. The event will be pre-filled
          with the expiry date — review it and tap Save in Google Calendar to
          add it to your account.
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
      </div>

      <h2 className="govbb-text-h3 app-mt-m app-mb-s">What happens next</h2>
      <div className="app-prose">
        <p>
          You don't need to do anything else. We'll send each reminder automatically.
        </p>
        <p>
          We'll delete your reminder details 30 days after the expiry date, in line with
          our <a className="govbb-link" href="#/privacy">privacy notice</a>.
        </p>
      </div>

      <div className="govbb-btn-group app-mt-m">
        <button type="button" className="govbb-btn--tertiary" onClick={handleStartAnother}>
          Set another reminder
        </button>
        <button
          type="button"
          className="govbb-btn--secondary"
          onClick={() => setPreviewOpen(true)}
        >
          Preview the reminder {lastReminder.channel === 'email' ? 'emails' : 'text messages'}
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

      <MessagePreview
        open={previewOpen}
        reminder={lastReminder}
        contact={contact}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
