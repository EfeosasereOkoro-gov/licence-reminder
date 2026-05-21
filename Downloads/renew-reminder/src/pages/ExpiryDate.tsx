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

/**
 * Look at each of the three fields and decide which one(s) are at
 * fault. Returns an array of { field, message } that the error summary
 * and the per-field aria-invalid use.
 */
function validateExpiryDate(d: string, m: string, y: string): ErrorItem[] {
  const out: ErrorItem[] = [];

  const allBlank = !d && !m && !y;
  if (allBlank) {
    return [{ field: 'expiry-day', message: 'Enter the expiry date' }];
  }

  // Missing fields
  if (!d) out.push({ field: 'expiry-day', message: 'Enter the day' });
  if (!m) out.push({ field: 'expiry-month', message: 'Enter the month' });
  if (!y) out.push({ field: 'expiry-year', message: 'Enter the year' });

  // Parse what we have
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);

  // Per-field range / non-numeric checks
  if (d && (!/^\d+$/.test(d) || day < 1 || day > 31)) {
    out.push({ field: 'expiry-day', message: 'Day must be a number between 1 and 31' });
  }
  if (m && (!/^\d+$/.test(m) || month < 1 || month > 12)) {
    out.push({ field: 'expiry-month', message: 'Month must be a number between 1 and 12' });
  }
  if (y && (!/^\d+$/.test(y) || year < 1900 || year > 2100)) {
    out.push({ field: 'expiry-year', message: 'Year must be a 4-digit number, like 2027' });
  }

  // Deduplicate to one error per field (keep the first we found).
  const seen = new Set<string>();
  const dedup = out.filter(e => seen.has(e.field) ? false : (seen.add(e.field), true));
  if (dedup.length > 0) return dedup;

  // All three are present and individually plausible — check the date
  // exists on the calendar (e.g., 30 Feb 2027 fails here).
  if (!isValidDate(day, month, year)) {
    return [{ field: 'expiry-day', message: 'Enter a real date — for example, 15 06 2027' }];
  }

  // Past dates
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry.getTime() < today.getTime()) {
    return [{ field: 'expiry-day', message: 'The expiry date must be today or in the future' }];
  }

  return [];
}

export function ExpiryDate() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('When does it expire?', errors.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validateExpiryDate(answers.expiryDay, answers.expiryMonth, answers.expiryYear);
    setErrors(next);
    if (next.length === 0) {
      navigate('/check-answers');
    }
  };

  const dayError = errors.find(e => e.field === 'expiry-day');
  const monthError = errors.find(e => e.field === 'expiry-month');
  const yearError = errors.find(e => e.field === 'expiry-year');
  const anyError = dayError || monthError || yearError;

  // Clear field-specific errors as the user re-edits the field. Keeps
  // the summary box honest until the next submit.
  const handleFieldChange = (
    field: 'expiry-day' | 'expiry-month' | 'expiry-year',
    nextValue: string,
  ) => {
    if (field === 'expiry-day') setAnswers({ expiryDay: nextValue });
    if (field === 'expiry-month') setAnswers({ expiryMonth: nextValue });
    if (field === 'expiry-year') setAnswers({ expiryYear: nextValue });
    if (errors.length) {
      setErrors(prev => prev.filter(e => e.field !== field));
    }
  };

  return (
    <>
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <fieldset className="govbb-fieldset" role="group" aria-describedby={anyError ? 'expiry-error' : 'expiry-hint'}>
          <legend className="govbb-fieldset__legend">
            <span className="app-caption">Step 2 of 2</span>
            <h1 className="govbb-text-h2 app-mb-xs">When does it expire?</h1>
          </legend>
          <p className="govbb-hint" id="expiry-hint">
            You can find the expiry date on your document. For example, 15 06 2027.
          </p>
          {anyError && (
            <div className="app-mt-xs" id="expiry-error">
              {[dayError, monthError, yearError]
                .filter((e): e is NonNullable<typeof e> => !!e)
                .map(err => (
                  <p key={err.field} className="govbb-error-message">
                    <span className="govbb-visually-hidden">Error: </span>
                    {err.message}
                  </p>
                ))}
            </div>
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
                  aria-invalid={!!dayError}
                  onChange={e => handleFieldChange('expiry-day', e.target.value)}
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
                  aria-invalid={!!monthError}
                  onChange={e => handleFieldChange('expiry-month', e.target.value)}
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
                  aria-invalid={!!yearError}
                  onChange={e => handleFieldChange('expiry-year', e.target.value)}
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
