import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { extractDocument, prewarmExtractor } from '../extractDocument';
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

type PhotoStatus = 'idle' | 'working' | 'done' | 'error';

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

  // Load the barcode reader chunk as soon as the user opens the panel,
  // so by the time they tap Choose a photo it's already in memory.
  useEffect(() => {
    if (!photoOpen) return;
    prewarmExtractor().catch(() => {});
  }, [photoOpen]);

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
    setPhotoStatus('working');

    try {
      const result = await extractDocument(file);

      if (!result.date && !result.itemType) {
        setPhotoStatus('error');
        return;
      }

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
      console.error('Barcode decode failed:', err);
      setPhotoStatus('error');
    }
  };

  const handleContinueAfterPhoto = () => {
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
          {photoOpen ? 'Hide barcode option' : 'Scan the barcode on your document'}
        </button>
      </div>

      {/* Barcode-scan shortcut — fills Steps 1 + 2 in one go. */}
      {photoOpen && (
        <section id="photo-shortcut" className="app-photo-shortcut" aria-labelledby="photo-shortcut-title">
          <h2 id="photo-shortcut-title" className="govbb-text-h3 app-mb-xs">
            Scan the barcode on the back of your document
          </h2>

          <div className="app-disclaimer" role="note" aria-labelledby="photo-disclaimer-title">
            <p id="photo-disclaimer-title" className="app-disclaimer__title">
              We only read the barcode
            </p>
            <p>
              The barcode encodes the document type and expiry date — that's
              everything we use. Your photo stays on this device. We do not upload,
              store, or share the image. You can check and change either field
              before continuing.
            </p>
          </div>

          <p className="govbb-hint">
            On a driver's licence, the barcode is the wide striped block on the
            back. Make sure the whole barcode is in the frame and the photo is
            sharp.
          </p>

          {photoStatus !== 'done' && (
            <>
              <label htmlFor="document-photo" className="app-photo-button">
                {photoStatus === 'working' ? 'Reading barcode…' : 'Choose a photo'}
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
                disabled={photoStatus === 'working'}
              />
            </>
          )}

          {photoStatus === 'working' && (
            <p className="app-photo-status" role="status" aria-live="polite">
              Reading the barcode from <strong>{photoFileName}</strong>…
            </p>
          )}

          {photoStatus === 'error' && (
            <p className="app-photo-status" role="status" aria-live="polite">
              We could not find a readable barcode in that photo. Try a closer or
              sharper photo of the barcode, or use <strong>Start now</strong> to
              enter the details manually.
            </p>
          )}

          {photoStatus === 'done' && extracted && (
            <div className="app-photo-result" aria-labelledby="photo-result-title">
              <p id="photo-result-title" className="app-photo-result__title">
                We read these details from the barcode
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
          <li>the expiry date shown on your document (or the barcode from the back)</li>
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
