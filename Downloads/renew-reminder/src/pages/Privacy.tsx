import { BackLink } from '../components/BackLink';
import { usePageTitle } from '../usePageTitle';

export function Privacy() {
  usePageTitle('Privacy notice');
  return (
    <>
      <BackLink to="/" />
      <h1 className="govbb-text-h2 app-mb-m">Privacy notice</h1>
      <div className="app-prose app-stack-s">
        <p>
          Renew Reminder is part of the Government of Barbados alpha service
          programme and follows the privacy and data-handling principles set
          out for it.
        </p>
        <p>
          To set a reminder we only ask for the type of document and its
          expiry date. We do not collect your name, address, date of birth,
          email address, phone number, or any document numbers. We do not
          send you any messages and we do not keep a copy of your reminder —
          the calendar event you save is held only inside your own
          calendar account.
        </p>
        <p>
          For the full Government of Barbados privacy and terms, see{' '}
          <a
            className="govbb-link"
            href="https://alpha.gov.bb/terms-conditions"
            target="_blank"
            rel="noopener noreferrer"
          >
            alpha.gov.bb/terms-conditions
          </a>.
        </p>
      </div>
    </>
  );
}
