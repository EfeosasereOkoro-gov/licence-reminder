import { useState, type FormEvent } from 'react';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';
import { ITEM_HINTS, ITEM_LABELS, type ItemKey } from '../types';
import { usePageTitle } from '../usePageTitle';

// Ordered by likely frequency in Barbados: the National ID Card is held
// by virtually every adult and renews on a known cycle, followed by
// driver's licence and passport.
const ITEMS: ItemKey[] = ['id-card', 'drivers-licence', 'passport', 'vehicle-registration', 'permit', 'custom'];

export function SelectItem() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  usePageTitle('What do you want a reminder for?', errors.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];
    if (!answers.itemType) {
      next.push({ field: 'item-type-id-card', message: 'Select what you want to be reminded about' });
    }
    if (answers.itemType === 'custom') {
      const name = answers.customName.trim();
      if (!name) {
        next.push({ field: 'item-custom-name', message: 'Enter a name for the reminder' });
      } else if (name.length > 60) {
        next.push({ field: 'item-custom-name', message: 'Name must be 60 characters or less' });
      }
    }
    setErrors(next);
    if (next.length === 0) {
      navigate('/expiry-date');
    }
  };

  const showCustom = answers.itemType === 'custom';
  const customError = errors.find(e => e.field === 'item-custom-name');
  const radioError = errors.find(e => e.field.startsWith('item-type-'));

  return (
    <>
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <fieldset className="govbb-fieldset">
          <legend className="govbb-fieldset__legend">
            <span className="app-caption">Step 1 of 2</span>
            <h1 className="govbb-text-h2 app-mb-xs">What do you want a reminder for?</h1>
          </legend>
          <p className="govbb-hint">
            If you have more than one document to track, you can add another
            reminder at the end.
          </p>
          {radioError && (
            <p className="govbb-error-message app-mt-xs" id="item-type-error">
              <span className="govbb-visually-hidden">Error: </span>
              {radioError.message}
            </p>
          )}

          <div className="app-stack-s app-mt-s" role="radiogroup" aria-describedby={radioError ? 'item-type-error' : undefined}>
            {ITEMS.map(key => (
              <div key={key}>
                <div className="govbb-radio-item">
                  <input
                    id={`item-type-${key}`}
                    name="item-type"
                    type="radio"
                    className="govbb-radio"
                    value={key}
                    checked={answers.itemType === key}
                    aria-invalid={!!radioError}
                    onChange={() => {
                      setAnswers({ itemType: key });
                      // Clear the stale radio-group error as soon as the
                      // user makes a selection; the summary box stays.
                      if (radioError) setErrors(prev => prev.filter(e => !e.field.startsWith('item-type-')));
                    }}
                  />
                  <label className="govbb-radio-item__label" htmlFor={`item-type-${key}`}>
                    {ITEM_LABELS[key]}
                    <span className="govbb-hint" style={{ display: 'block' }}>
                      {ITEM_HINTS[key]}
                    </span>
                  </label>
                </div>
                {key === 'custom' && showCustom && (
                  <div className="govbb-radio-item__conditional">
                    <div className="govbb-form-group">
                      <label className="govbb-label" htmlFor="item-custom-name">
                        Name your reminder
                      </label>
                      <span className="govbb-hint">Up to 60 characters. Use the name on the document, like "Pharmacy permit" or "Fishing licence".</span>
                      {customError && (
                        <span className="govbb-error-message" id="item-custom-name-error">
                          <span className="govbb-visually-hidden">Error: </span>
                          {customError.message}
                        </span>
                      )}
                      <div className="govbb-input-wrapper">
                        <input
                          id="item-custom-name"
                          name="custom-name"
                          type="text"
                          className="govbb-input"
                          value={answers.customName}
                          maxLength={60}
                          autoComplete="off"
                          aria-invalid={!!customError}
                          aria-describedby={customError ? 'item-custom-name-error' : undefined}
                          onChange={e => {
                            setAnswers({ customName: e.target.value });
                            if (customError && e.target.value.trim()) {
                              setErrors(prev => prev.filter(err => err.field !== 'item-custom-name'));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        <div className="govbb-btn-group">
          <button type="button" className="govbb-btn--secondary" onClick={() => navigate('/')}>
            Previous
          </button>
          <button type="submit" className="govbb-btn">Continue</button>
        </div>
      </form>
    </>
  );
}
