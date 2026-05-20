import { useEffect, useState, type FormEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accept local Bajan formats and international with +.
const PHONE_RE = /^\+?[0-9]{7,15}$/;

export function Contact() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);

  useEffect(() => {
    if (!answers.channel) {
      navigate('/notification-method');
    }
  }, [answers.channel]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];

    if (answers.channel === 'email') {
      const trimmed = answers.email.trim();
      if (!trimmed) {
        next.push({ field: 'contact-email', message: 'Enter your email address' });
      } else if (!EMAIL_RE.test(trimmed)) {
        next.push({ field: 'contact-email', message: 'Enter a valid email address, like name@example.com' });
      }
    }
    if (answers.channel === 'sms') {
      const stripped = answers.phone.replace(/[\s-()]/g, '');
      if (!stripped) {
        next.push({ field: 'contact-phone', message: 'Enter your mobile number' });
      } else if (!PHONE_RE.test(stripped)) {
        next.push({ field: 'contact-phone', message: 'Enter a valid mobile number, like 246 123 4567' });
      }
    }

    setErrors(next);
    if (next.length === 0) {
      navigate('/check-answers');
    }
  };

  const emailError = errors.find(e => e.field === 'contact-email');
  const phoneError = errors.find(e => e.field === 'contact-phone');

  return (
    <>
      <BackLink to="/notification-method" />
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <span className="app-caption">Step 4 of 4</span>
        <h1 className="govbb-text-h2 app-mb-xs">
          {answers.channel === 'email' ? "What's your email address?" : "What's your mobile number?"}
        </h1>

        {answers.channel === 'email' ? (
          <div className="govbb-form-group">
            <label className="govbb-label" htmlFor="contact-email">Email address</label>
            <span className="govbb-hint">We'll only use this to send your reminders.</span>
            {emailError && (
              <span className="govbb-error-message" id="contact-email-error">
                <span className="govbb-visually-hidden">Error: </span>
                {emailError.message}
              </span>
            )}
            <div className="govbb-input-wrapper">
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className="govbb-input"
                value={answers.email}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'contact-email-error' : undefined}
                onChange={e => setAnswers({ email: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="govbb-form-group">
            <label className="govbb-label" htmlFor="contact-phone">Mobile number</label>
            <span className="govbb-hint">
              Include the country code if outside Barbados. For example, +1 246 123 4567.
            </span>
            {phoneError && (
              <span className="govbb-error-message" id="contact-phone-error">
                <span className="govbb-visually-hidden">Error: </span>
                {phoneError.message}
              </span>
            )}
            <div className="govbb-input-wrapper">
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="govbb-input"
                value={answers.phone}
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? 'contact-phone-error' : undefined}
                onChange={e => setAnswers({ phone: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="govbb-btn-group">
          <button type="submit" className="govbb-btn">Continue</button>
        </div>
      </form>
    </>
  );
}
