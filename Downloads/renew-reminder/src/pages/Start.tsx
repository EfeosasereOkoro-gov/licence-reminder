import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';

export function Start() {
  // The service start page is the "front door". GDS guidance says the
  // <title> should match the service name on this page — no extra prefix.
  usePageTitle(null);

  const { resetAnswers } = useJourney();

  const handleStart = () => {
    resetAnswers();
    navigate('/select-item');
  };

  return (
    <div className="app-stack-xm">
      <h1 className="govbb-text-h1">Get a reminder before a document expires</h1>
      <div className="app-prose">
        <p className="govbb-text-body-lg">
          Use this service to set a free reminder before your driver's licence,
          vehicle registration, passport, or other government permit runs out.
        </p>
        <p>It takes about 2 minutes.</p>
      </div>

      <div>
        <button type="button" className="govbb-btn" onClick={handleStart}>
          Start now
        </button>
      </div>

      <h2 className="govbb-text-h3">Before you start</h2>
      <div className="app-prose">
        <p>You will need:</p>
        <ul>
          <li>the expiry date shown on your document</li>
          <li>an email address or a mobile phone number</li>
        </ul>
      </div>

      <details className="govbb-show-hide">
        <summary className="govbb-show-hide__summary">What we ask for</summary>
        <div className="govbb-show-hide__content app-prose">
          <p>
            To set up a reminder we only ask for the type of document, its
            expiry date, and how you would like to be reminded.
          </p>
          <p>
            We do not ask for your name, address, date of birth, or any
            document numbers. Read our{' '}
            <a className="govbb-link" href="#/privacy">privacy notice</a>.
          </p>
        </div>
      </details>
    </div>
  );
}
