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
          Renew Reminder is a privacy-first service. We collect the minimum information
          needed to send your reminders, and nothing more.
        </p>

        <h2 className="govbb-text-h3 app-mt-m">What we collect</h2>
        <ul>
          <li>your email address or mobile number, so we can send reminders</li>
          <li>the expiry date you give us</li>
          <li>a reminder reference we generate for you</li>
        </ul>

        <h2 className="govbb-text-h3 app-mt-m">What we do not collect</h2>
        <ul>
          <li>your name, address, or date of birth</li>
          <li>any document numbers (for example, licence numbers)</li>
          <li>copies or scans of any document</li>
        </ul>

        <h2 className="govbb-text-h3 app-mt-m">How long we keep it</h2>
        <ul>
          <li>reminder data is kept until your last reminder is sent, plus 30 days</li>
          <li>delivery logs are kept for 90 days</li>
          <li>analytics are anonymised and kept only in aggregated form</li>
        </ul>
        <p>
          After these periods, your information is automatically deleted from our
          systems.
        </p>

        <h2 className="govbb-text-h3 app-mt-m">Your rights</h2>
        <p>
          You can ask us to delete a reminder at any time by replying STOP to any text
          message, or by contacting us.
        </p>

        <p className="app-mt-m">
          <strong>Note:</strong> This alpha service does not send real messages yet. Reminder
          data is stored only on this device.
        </p>
      </div>
    </>
  );
}
