import { useRef, useState, type ChangeEvent } from 'react';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';
import { ITEM_LABELS, type ItemKey } from '../types';

/**
 * Simulate reading both the document type and the expiry date from a
 * photo. A future server-side implementation would run OCR / a vision
 * model and return only these two fields. The disclaimer on the page
 * describes that intended behaviour.
 *
 * For the prototype we wait a moment, pick a random recognised document
 * type, and a plausible future expiry date.
 */
function simulateExtractDocument(): Promise<{
  itemType: ItemKey;
  day: number;
  month: number;
  year: number;
}> {
  return new Promise(resolve => {
    setTimeout(() => {
      const types: ItemKey[] = ['drivers-licence', 'vehicle-registration', 'passport', 'permit'];
      const itemType = types[Math.floor(Math.random() * types.length)];
      const monthsAhead = 12 + Math.floor(Math.random() * 18);
      const d = new Date();
      d.setMonth(d.getMonth() + monthsAhead);
      resolve({
        itemType,
        day: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      });
    }, 1500);
  });
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type PhotoStatus = 'idle' | 'reading' | 'done' | 'error';

export function Start() {
  usePageTitle(null);

  const { resetAnswers, setAnswers } = useJourney();

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [extracted, setExtracted] = useState<{
    itemType: ItemKey;
    expiry: Date;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartManual = () => {
    resetAnswers();
    navigate('/select-item');
  };

  const handleTogglePhoto = () => {
    setPhotoOpen(open => !open);
  };

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setPhotoFileName(file.name);
    setPhotoStatus('reading');
    setExtracted(null);

    try {
      const result = await simulateExtractDocument();
      // Reset any prior answers, then fill the two fields from the photo.
      resetAnswers();
      setAnswers({
        itemType: result.itemType,
        expiryDay: String(result.day),
        expiryMonth: String(result.month),
        expiryYear: String(result.year),
      });
      setExtracted({
        itemType: result.itemType,
        expiry: new Date(result.year, result.month - 1, result.day),
      });
      setPhotoStatus('done');
    } catch {
      setPhotoStatus('error');
    }
  };

  const handleContinueAfterPhoto = () => {
    navigate('/contact');
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

      <div className="govbb-btn-group">
        <button type="button" className="govbb-btn" onClick={handleStartManual}>
          Start now
        </button>
        <button
          type="button"
          className="govbb-btn--secondary"
          onClick={handleTogglePhoto}
          aria-expanded={photoOpen}
          aria-controls="photo-shortcut"
        >
          {photoOpen ? 'Hide photo option' : 'Use a photo of your document'}
        </button>
      </div>

      {/* Photo-extract shortcut — fills Steps 1 + 2 in one go. */}
      {photoOpen && (
        <section id="photo-shortcut" className="app-photo-shortcut" aria-labelledby="photo-shortcut-title">
          <h2 id="photo-shortcut-title" className="govbb-text-h3 app-mb-xs">
            Use a photo of your document
          </h2>

          <div className="app-disclaimer" role="note" aria-labelledby="photo-disclaimer-title">
            <p id="photo-disclaimer-title" className="app-disclaimer__title">
              We will only read the document type and the expiry date
            </p>
            <p>
              Your photo stays on this device. We do not upload, store, or share the
              image. We only read what type of document it is (for example, a
              driver's licence) and the expiry date. You can check and change either
              before continuing.
            </p>
          </div>

          {photoStatus !== 'done' && (
            <>
              <label htmlFor="document-photo" className="app-photo-button">
                {photoStatus === 'reading' ? 'Reading your document…' : 'Choose a photo'}
              </label>
              <input
                ref={fileInputRef}
                id="document-photo"
                name="document-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="govbb-visually-hidden"
                onChange={handlePhoto}
                disabled={photoStatus === 'reading'}
              />
            </>
          )}

          <p className="app-photo-status" role="status" aria-live="polite">
            {photoStatus === 'reading' && (
              <>Reading <strong>{photoFileName}</strong>…</>
            )}
            {photoStatus === 'error' && (
              <>We could not read your document. Please try a clearer photo, or use the manual steps.</>
            )}
          </p>

          {photoStatus === 'done' && extracted && (
            <div className="app-photo-result" aria-labelledby="photo-result-title">
              <p id="photo-result-title" className="app-photo-result__title">
                We read these details from <strong>{photoFileName}</strong>
              </p>
              <dl className="app-photo-result__list">
                <div className="app-photo-result__row">
                  <dt>Document type</dt>
                  <dd>{ITEM_LABELS[extracted.itemType]}</dd>
                </div>
                <div className="app-photo-result__row">
                  <dt>Expiry date</dt>
                  <dd>{formatLongDate(extracted.expiry)}</dd>
                </div>
              </dl>
              <p className="govbb-hint">
                If anything is wrong, you can change it on the check-answers page
                before setting the reminder.
              </p>
              <div className="govbb-btn-group">
                <button
                  type="button"
                  className="govbb-btn--secondary"
                  onClick={() => {
                    setPhotoStatus('idle');
                    setExtracted(null);
                    setPhotoFileName('');
                  }}
                >
                  Try another photo
                </button>
                <button
                  type="button"
                  className="govbb-btn"
                  onClick={handleContinueAfterPhoto}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <h2 className="govbb-text-h3">Before you start</h2>
      <div className="app-prose">
        <p>You will need:</p>
        <ul>
          <li>the expiry date shown on your document (or a clear photo of it)</li>
          <li>an email address</li>
        </ul>
      </div>

      <details className="govbb-show-hide">
        <summary className="govbb-show-hide__summary">What we ask for</summary>
        <div className="govbb-show-hide__content app-prose">
          <p>
            To set up a reminder we only ask for the type of document, its
            expiry date, and your email address.
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
