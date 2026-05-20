import { useState, type FormEvent } from 'react';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';

export function NotificationMethod() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('How should we remind you?', errors.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];
    if (!answers.channel) {
      next.push({ field: 'channel-email', message: 'Choose how you want to be reminded' });
    }
    setErrors(next);
    if (next.length === 0) {
      navigate('/contact');
    }
  };

  const radioError = errors.find(e => e.field.startsWith('channel-'));

  return (
    <>
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <fieldset className="govbb-fieldset">
          <legend className="govbb-fieldset__legend">
            <span className="app-caption">Step 3 of 4</span>
            <h1 className="govbb-text-h2 app-mb-xs">How should we remind you?</h1>
          </legend>
          <p className="govbb-hint">Choose one option.</p>
          {radioError && (
            <p className="govbb-error-message app-mt-xs" id="channel-error">
              <span className="govbb-visually-hidden">Error: </span>
              {radioError.message}
            </p>
          )}

          <div className="app-stack-s app-mt-s" role="radiogroup" aria-describedby={radioError ? 'channel-error' : undefined}>
            <div className="govbb-radio-item">
              <input
                id="channel-email"
                name="channel"
                type="radio"
                className="govbb-radio"
                value="email"
                checked={answers.channel === 'email'}
                aria-invalid={!!radioError}
                onChange={() => setAnswers({ channel: 'email' })}
              />
              <label className="govbb-radio-item__label" htmlFor="channel-email">Email</label>
            </div>
            <div className="govbb-radio-item">
              <input
                id="channel-sms"
                name="channel"
                type="radio"
                className="govbb-radio"
                value="sms"
                checked={answers.channel === 'sms'}
                aria-invalid={!!radioError}
                onChange={() => setAnswers({ channel: 'sms' })}
              />
              <label className="govbb-radio-item__label" htmlFor="channel-sms">
                Text message (SMS)
              </label>
            </div>
          </div>
        </fieldset>

        <div className="govbb-btn-group">
          <button type="button" className="govbb-btn--secondary" onClick={() => navigate('/expiry-date')}>
            Previous
          </button>
          <button type="submit" className="govbb-btn">Continue</button>
        </div>
      </form>
    </>
  );
}
