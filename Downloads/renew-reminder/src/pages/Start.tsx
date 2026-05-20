import { navigate } from '../router';
import { useJourney } from '../store';

export function Start() {
  const { resetAnswers } = useJourney();

  const handleStart = () => {
    resetAnswers();
    navigate('/select-item');
  };

  return (
    <div className="app-stack-xm">
      <h1 className="govbb-text-h1">Never miss an important renewal</h1>
      <div className="app-prose">
        <p>
          Get a free reminder before your driver's licence, vehicle registration,
          passport, or other permit expires.
        </p>
      </div>

      <div>
        <button type="button" className="govbb-btn" onClick={handleStart}>
          Start now
        </button>
      </div>

      <details className="govbb-show-hide">
        <summary className="govbb-show-hide__summary">Who can use this service</summary>
        <div className="govbb-show-hide__content app-prose">
          <p>
            Anyone with an email address or mobile phone in Barbados. You don't need an
            account.
          </p>
          <p>It takes about 2 minutes.</p>
        </div>
      </details>

      <details className="govbb-show-hide">
        <summary className="govbb-show-hide__summary">What we ask for</summary>
        <div className="govbb-show-hide__content app-prose">
          <p>To set a reminder we only ask for:</p>
          <ul>
            <li>the type of document or service</li>
            <li>its expiry date</li>
            <li>how you'd like to be reminded — email or text message</li>
          </ul>
          <p>
            We do not collect your name, address, date of birth, or any document numbers.
            Read our <a className="govbb-link" href="#/privacy">privacy notice</a>.
          </p>
        </div>
      </details>
    </div>
  );
}
