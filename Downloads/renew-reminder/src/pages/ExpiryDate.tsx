import { useState, type FormEvent } from 'react';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';

function isValidDate(day: number, month: number, year: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export function ExpiryDate() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('When does it expire?', errors.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];
    const day = Number(answers.expiryDay);
    const month = Number(answers.expiryMonth);
    const year = Number(answers.expiryYear);

    if (!answers.expiryDay || !answers.expiryMonth || !answers.expiryYear) {
      next.push({ field: 'expiry-day', message: 'Enter the expiry date' });
    } else if (
      !Number.isInteger(day) || day < 1 || day > 31 ||
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 1900 || year > 2100 ||
      !isValidDate(day, month, year)
    ) {
      next.push({ field: 'expiry-day', message: 'Enter a real date — for example, 15 06 2027' });
    } else {
      const expiry = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry.getTime() < today.getTime()) {
        next.push({ field: 'expiry-day', message: 'The expiry date must be today or in the future' });
      }
    }

    setErrors(next);
    if (next.length === 0) {
      navigate('/contact');
    }
  };

  const dateError = errors.find(e => e.field === 'expiry-day');

  return (
    <>
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <fieldset className="govbb-fieldset" role="group" aria-describedby={dateError ? 'expiry-error' : 'expiry-hint'}>
          <legend className="govbb-fieldset__legend">
            <span className="app-caption">Step 2 of 3</span>
            <h1 className="govbb-text-h2 app-mb-xs">When does it expire?</h1>
          </legend>
          <p className="govbb-hint" id="expiry-hint">
            You can find the expiry date on your document. For example, 15 06 2027.
          </p>
          {dateError && (
            <p className="govbb-error-message app-mt-xs" id="expiry-error">
              <span className="govbb-visually-hidden">Error: </span>
              {dateError.message}
            </p>
          )}

          <div className="govbb-date-input app-mt-s">
            <div className="govbb-date-input__part">
              <label className="govbb-date-input__label" htmlFor="expiry-day">Day</label>
              <div className="govbb-date-input-wrapper">
                <input
                  id="expiry-day"
                  name="expiry-day"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  autoComplete="off"
                  className="govbb-date-input__field"
                  value={answers.expiryDay}
                  aria-invalid={!!dateError}
                  onChange={e => setAnswers({ expiryDay: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            </div>
            <div className="govbb-date-input__part">
              <label className="govbb-date-input__label" htmlFor="expiry-month">Month</label>
              <div className="govbb-date-input-wrapper">
                <input
                  id="expiry-month"
                  name="expiry-month"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  autoComplete="off"
                  className="govbb-date-input__field"
                  value={answers.expiryMonth}
                  aria-invalid={!!dateError}
                  onChange={e => setAnswers({ expiryMonth: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            </div>
            <div className="govbb-date-input__part">
              <label className="govbb-date-input__label" htmlFor="expiry-year">Year</label>
              <div className="govbb-date-input-wrapper govbb-date-input-wrapper--year">
                <input
                  id="expiry-year"
                  name="expiry-year"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="off"
                  className="govbb-date-input__field"
                  value={answers.expiryYear}
                  aria-invalid={!!dateError}
                  onChange={e => setAnswers({ expiryYear: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            </div>
          </div>
        </fieldset>

        <div className="govbb-btn-group">
          <button type="button" className="govbb-btn--secondary" onClick={() => navigate('/select-item')}>
            Previous
          </button>
          <button type="submit" className="govbb-btn">Continue</button>
        </div>
      </form>
    </>
  );
}
