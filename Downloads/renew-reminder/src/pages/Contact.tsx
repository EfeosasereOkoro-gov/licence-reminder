import { useState, type FormEvent } from 'react';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle("What's your email address?", errors.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];
    const trimmed = answers.email.trim();
    if (!trimmed) {
      next.push({ field: 'contact-email', message: 'Enter your email address' });
    } else if (!EMAIL_RE.test(trimmed)) {
      next.push({
        field: 'contact-email',
        message: 'Enter a valid email address, like name@example.com',
      });
    }
    setErrors(next);
    if (next.length === 0) {
      navigate('/check-answers');
    }
  };

  const emailError = errors.find(e => e.field === 'contact-email');

  return (
    <>
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <span className="app-caption">Step 3 of 3</span>
        <h1 className="govbb-text-h2 app-mb-xs">What's your email address?</h1>

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
