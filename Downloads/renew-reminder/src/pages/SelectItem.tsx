import { useState, type FormEvent } from 'react';
import { BackLink } from '../components/BackLink';
import { ErrorSummary, type ErrorItem } from '../components/ErrorSummary';
import { navigate } from '../router';
import { useJourney } from '../store';
import { ITEM_HINTS, ITEM_LABELS, type ItemKey } from '../types';

const ITEMS: ItemKey[] = ['drivers-licence', 'vehicle-registration', 'passport', 'permit', 'custom'];

export function SelectItem() {
  const { answers, setAnswers } = useJourney();
  const [errors, setErrors] = useState<ErrorItem[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: ErrorItem[] = [];
    if (!answers.itemType) {
      next.push({ field: 'item-type-drivers-licence', message: 'Select what you want to be reminded about' });
    }
    if (answers.itemType === 'custom' && !answers.customName.trim()) {
      next.push({ field: 'item-custom-name', message: 'Enter a name for the reminder' });
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
      <BackLink to="/" />
      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit} noValidate className="app-stack-xm">
        <fieldset className="govbb-fieldset">
          <legend className="govbb-fieldset__legend">
            <span className="app-caption">Step 1 of 4</span>
            <h1 className="govbb-text-h2 app-mb-xs">What do you want a reminder for?</h1>
          </legend>
          <p className="govbb-hint">Choose one option.</p>
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
                    onChange={() => setAnswers({ itemType: key })}
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
                      <span className="govbb-hint">For example, "Boat licence" or "Pharmacy permit"</span>
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
                          onChange={e => setAnswers({ customName: e.target.value })}
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
          <button type="submit" className="govbb-btn">Continue</button>
        </div>
      </form>
    </>
  );
}
