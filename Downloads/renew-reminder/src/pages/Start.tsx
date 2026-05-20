import { useRef, useState, type ChangeEvent } from 'react';
import { extractDocument, type ExtractProgress } from '../extractDocument';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';
import { ITEM_LABELS, type ItemKey } from '../types';

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type PhotoStatus = 'idle' | 'loading' | 'reading' | 'parsing' | 'done' | 'error';

function statusMessage(status: PhotoStatus, fileName: string): string {
  switch (status) {
    case 'loading':
      return 'Getting the recognition engine ready — this only happens the first time.';
    case 'reading':
      return `Reading ${fileName}…`;
    case 'parsing':
      return 'Looking for the document type and expiry date…';
    default:
      return '';
  }
}

export function Start() {
  usePageTitle(null);

  const { resetAnswers, setAnswers } = useJourney();

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [extracted, setExtracted] = useState<{
    itemType: ItemKey | null;
    expiry: Date | null;
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
    setExtracted(null);
    setPhotoStatus('loading');

    try {
      const result = await extractDocument(file, (p: ExtractProgress) => {
        setPhotoStatus(p.stage);
      });

      // If we couldn't extract anything useful, ask the user to try
      // again or fall back to the manual path. The disclaimer promises
      // we only read these two fields, so we mustn't invent them.
      if (!result.date && !result.itemType) {
        setPhotoStatus('error');
        return;
      }

      // Reset prior answers, then fill what we actually extracted.
      resetAnswers();
      setAnswers({
        itemType: result.itemType ?? null,
        expiryDay: result.date ? String(result.date.day) : '',
        expiryMonth: result.date ? String(result.date.month) : '',
        expiryYear: result.date ? String(result.date.year) : '',
      });

      setExtracted({
        itemType: result.itemType,
        expiry: result.date
          ? new Date(result.date.year, result.date.month - 1, result.date.day)
          : null,
      });
      setPhotoStatus('done');
    } catch (err) {
      console.error('OCR failed:', err);
      setPhotoStatus('error');
    }
  };

  const handleContinueAfterPhoto = () => {
    // If only the date was extracted, hop to the select-item step so the
    // user can pick the document type; otherwise jump straight to email.
    if (extracted?.itemType) {
      navigate('/contact');
    } else {
      navigate('/select-item');
    }
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
                {photoStatus === 'loading' || photoStatus === 'reading' || photoStatus === 'parsing'
                  ? 'Reading your document…'
                  : 'Choose a photo'}
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
                disabled={photoStatus === 'loading' || photoStatus === 'reading' || photoStatus === 'parsing'}
              />
            </>
          )}

          <p className="app-photo-status" role="status" aria-live="polite">
            {(photoStatus === 'loading' || photoStatus === 'reading' || photoStatus === 'parsing') && (
              <>{statusMessage(photoStatus, photoFileName)}</>
            )}
            {photoStatus === 'error' && (
              <>
                We could not read your document. Please try a clearer photo, or use{' '}
                <strong>Start now</strong> to enter the details manually.
              </>
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
                  <dd>
                    {extracted.itemType
                      ? ITEM_LABELS[extracted.itemType]
                      : <em>Not detected — you'll pick it on the next step</em>}
                  </dd>
                </div>
                <div className="app-photo-result__row">
                  <dt>Expiry date</dt>
                  <dd>
                    {extracted.expiry
                      ? formatLongDate(extracted.expiry)
                      : <em>Not detected — you'll enter it on the next step</em>}
                  </dd>
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
