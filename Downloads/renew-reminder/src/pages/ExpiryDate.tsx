import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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
 * Simulate reading an expiry date from a document photo.
 *
 * This is a front-end-only prototype. A future server-side implementation
 * would run OCR on the image, locate the expiry-date field, return only
 * that field, and discard the image without storing it. The disclaimer
 * shown on the page describes that intended behaviour.
 *
 * For the prototype, we wait a moment and return a plausible date — far
 * enough in the future that the date validation passes.
 */
function simulateExtractExpiryDate(): Promise<{ day: number; month: number; year: number }> {
  return new Promise(resolve => {
    setTimeout(() => {
      // 12–30 months in the future, so different demo runs vary a bit.
      const monthsAhead = 12 + Math.floor(Math.random() * 18);
      const d = new Date();
      d.setMonth(d.getMonth() + monthsAhead);
      resolve({ day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
    }, 1400);
  });
}

type PhotoStatus = 'idle' | 'reading' | 'done' | 'error';

export function ExpiryDate() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('When does it expire?', errors.length > 0);

  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input value so picking the same file again still fires
    // onChange — useful if the user wants to retry.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setPhotoFileName(file.name);
    setPhotoStatus('reading');

    try {
      const { day, month, year } = await simulateExtractExpiryDate();
      setAnswers({
        expiryDay: String(day),
        expiryMonth: String(month),
        expiryYear: String(year),
      });
      setPhotoStatus('done');
    } catch {
      setPhotoStatus('error');
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

        {/* Optional: read the expiry date from a photo of the document. */}
        <details className="govbb-show-hide app-photo-extract">
          <summary className="govbb-show-hide__summary">
            Or use a photo of your document
          </summary>
          <div className="govbb-show-hide__content">
            <div className="app-disclaimer" role="note" aria-labelledby="photo-disclaimer-title">
              <p id="photo-disclaimer-title" className="app-disclaimer__title">
                We will only read the expiry date
              </p>
              <p>
                Your photo stays on this device. We do not upload, store, or share the
                image. We only read the expiry date and fill it in for you. You can
                check and change it before continuing.
              </p>
            </div>

            <label htmlFor="expiry-photo" className="govbb-btn--secondary app-photo-button">
              {photoStatus === 'reading' ? 'Reading your document…' : 'Choose a photo'}
            </label>
            <input
              ref={fileInputRef}
              id="expiry-photo"
              name="expiry-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="govbb-visually-hidden"
              onChange={handlePhoto}
              disabled={photoStatus === 'reading'}
            />

            <p
              className="app-photo-status"
              role="status"
              aria-live="polite"
            >
              {photoStatus === 'reading' && (
                <>Reading the expiry date from <strong>{photoFileName}</strong>…</>
              )}
              {photoStatus === 'done' && (
                <>
                  We read this expiry date from <strong>{photoFileName}</strong>. Please
                  check it is correct before continuing.
                </>
              )}
              {photoStatus === 'error' && (
                <>We could not read an expiry date from that photo. Please enter it manually.</>
              )}
            </p>
          </div>
        </details>

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
