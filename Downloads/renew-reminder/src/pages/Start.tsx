import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { extractDocument, prewarmExtractor } from '../extractDocument';
import { navigate } from '../router';
import { useJourney } from '../store';
import { usePageTitle } from '../usePageTitle';
import { ITEM_HINTS, ITEM_LABELS, type ItemKey } from '../types';

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const ITEM_KEYS: ItemKey[] = ['drivers-licence', 'vehicle-registration', 'passport', 'permit', 'custom'];

type PhotoStatus = 'idle' | 'working' | 'verifying' | 'error';
type Verdict = 'pending' | 'confirmed' | 'editing';

interface Extracted {
  itemType: ItemKey | null;
  expiry: Date | null;
}

export function Start() {
  usePageTitle(null);

  const { resetAnswers, setAnswers } = useJourney();

  // Photo flow state
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verification flow state — once OCR completes we ask two Yes/No
  // questions in sequence: is this the document type, then is this
  // the expiry date. Each can be corrected inline before continuing.
  const [typeVerdict, setTypeVerdict] = useState<Verdict>('pending');
  const [dateVerdict, setDateVerdict] = useState<Verdict>('pending');

  // Inline edit-form values used when the user says "No".
  const [editType, setEditType] = useState<ItemKey | ''>('');
  const [editCustomName, setEditCustomName] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editError, setEditError] = useState<string>('');

  // Pre-warm the OCR engine when the panel opens so the language data
  // downloads in the background while the user reads the disclaimer.
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

  const resetPhotoState = () => {
    setPhotoStatus('idle');
    setExtracted(null);
    setPhotoFileName('');
    setTypeVerdict('pending');
    setDateVerdict('pending');
    setEditType('');
    setEditCustomName('');
    setEditDay('');
    setEditMonth('');
    setEditYear('');
    setEditError('');
  };

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    resetPhotoState();
    setPhotoFileName(file.name);
    setPhotoStatus('working');

    // Speed budget: if OCR doesn't return useful data inside 2.5 seconds,
    // we move on without it. The Yes/No verification screen makes this
    // safe — the user can fill in or correct any field.
    const TIMEOUT_MS = 2500;
    const TIMEOUT = Symbol('timeout');

    const ocr = extractDocument(file).catch(err => {
      console.error('OCR failed:', err);
      return null;
    });

    const timeout = new Promise<typeof TIMEOUT>(resolve =>
      setTimeout(() => resolve(TIMEOUT), TIMEOUT_MS),
    );

    const winner = await Promise.race([ocr, timeout]);

    const result = winner === TIMEOUT ? null : winner;
    const ex: Extracted = {
      itemType: result?.itemType ?? null,
      expiry: result?.date
        ? new Date(result.date.year, result.date.month - 1, result.date.day)
        : null,
    };

    setExtracted(ex);

    // Pre-fill the edit-form fields so "No" jumps to the OCR'd value
    // (when we have one) rather than an empty form.
    setEditType(ex.itemType ?? '');
    if (ex.expiry) {
      setEditDay(String(ex.expiry.getDate()));
      setEditMonth(String(ex.expiry.getMonth() + 1));
      setEditYear(String(ex.expiry.getFullYear()));
    }

    // If OCR didn't read the type (timeout or genuine no-match), drop
    // straight into editing mode for it — there's nothing to confirm.
    setTypeVerdict(ex.itemType ? 'pending' : 'editing');

    setPhotoStatus('verifying');

    // Note: the ocr promise may still be running in the background.
    // We deliberately ignore its eventual result — the user is already
    // on the verification screen and changing values under them would
    // be jarring.
    void ocr;
  };

  // ── Confirm / edit the document type ──────────────────────────────────

  const confirmType = () => setTypeVerdict('confirmed');
  const editTypeNo = () => { setEditError(''); setTypeVerdict('editing'); };
  const saveTypeEdit = () => {
    if (!editType) {
      setEditError('Choose the type of document');
      return;
    }
    if (editType === 'custom' && !editCustomName.trim()) {
      setEditError('Enter a name for the reminder');
      return;
    }
    setEditError('');
    setExtracted(prev => prev && { ...prev, itemType: editType as ItemKey });
    setTypeVerdict('confirmed');
  };

  // ── Confirm / edit the expiry date ────────────────────────────────────

  const confirmDate = () => setDateVerdict('confirmed');
  const editDateNo = () => { setEditError(''); setDateVerdict('editing'); };
  const saveDateEdit = () => {
    const day = Number(editDay);
    const month = Number(editMonth);
    const year = Number(editYear);
    if (!editDay || !editMonth || !editYear) {
      setEditError('Enter the expiry date');
      return;
    }
    if (
      !Number.isInteger(day) || day < 1 || day > 31 ||
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 1900 || year > 2100
    ) {
      setEditError('Enter a real date — for example, 15 06 2027');
      return;
    }
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      setEditError('Enter a real date — for example, 15 06 2027');
      return;
    }
    setEditError('');
    setExtracted(prev => prev && { ...prev, expiry: d });
    setDateVerdict('confirmed');
  };

  const bothConfirmed =
    typeVerdict === 'confirmed' &&
    dateVerdict === 'confirmed' &&
    extracted?.itemType &&
    extracted?.expiry;

  const handleContinue = () => {
    if (!extracted?.itemType || !extracted.expiry) return;
    resetAnswers();
    setAnswers({
      itemType: extracted.itemType,
      customName: editType === 'custom' ? editCustomName.trim() : '',
      expiryDay: String(extracted.expiry.getDate()),
      expiryMonth: String(extracted.expiry.getMonth() + 1),
      expiryYear: String(extracted.expiry.getFullYear()),
    });
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
              image. We only read what type of document it is and the expiry date,
              and we'll ask you to confirm each before continuing.
            </p>
          </div>

          {photoStatus !== 'verifying' && (
            <>
              <label htmlFor="document-photo" className="app-photo-button">
                {photoStatus === 'working' ? 'Reading your document…' : 'Choose a photo'}
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
              Reading <strong>{photoFileName}</strong>…
            </p>
          )}

          {photoStatus === 'error' && (
            <p className="app-photo-status" role="status" aria-live="polite">
              We could not read your document. Please try a clearer photo, or use{' '}
              <strong>Start now</strong> to enter the details manually.
            </p>
          )}

          {photoStatus === 'verifying' && extracted && (
            <div className="app-verify" aria-labelledby="verify-title">
              <p id="verify-title" className="app-verify__intro">
                We read these details from <strong>{photoFileName}</strong>. Please
                confirm them.
              </p>

              {/* ── Question 1: document type ─────────────────────────── */}
              <section className="app-verify__q" aria-labelledby="verify-type-q">
                <p id="verify-type-q" className="app-verify__question">
                  Is this the type of document?
                </p>
                <p className="app-verify__answer">
                  {extracted.itemType
                    ? ITEM_LABELS[extracted.itemType]
                    : <em>We could not detect a document type</em>}
                </p>

                {typeVerdict === 'pending' && extracted.itemType && (
                  <div className="govbb-btn-group app-mt-s">
                    <button type="button" className="govbb-btn" onClick={confirmType}>
                      Yes
                    </button>
                    <button type="button" className="govbb-btn--secondary" onClick={editTypeNo}>
                      No, choose another
                    </button>
                  </div>
                )}

                {typeVerdict === 'editing' && (
                  <fieldset className="govbb-fieldset app-mt-s">
                    <legend className="govbb-fieldset__legend">
                      What type of document is it?
                    </legend>
                    <p className="govbb-hint">Choose one option.</p>
                    {editError && (
                      <p className="govbb-error-message app-mt-xs">
                        <span className="govbb-visually-hidden">Error: </span>
                        {editError}
                      </p>
                    )}
                    <div className="app-stack-s app-mt-s" role="radiogroup">
                      {ITEM_KEYS.map(key => (
                        <div key={key}>
                          <div className="govbb-radio-item">
                            <input
                              id={`edit-item-${key}`}
                              name="edit-item"
                              type="radio"
                              className="govbb-radio"
                              value={key}
                              checked={editType === key}
                              onChange={() => setEditType(key)}
                            />
                            <label className="govbb-radio-item__label" htmlFor={`edit-item-${key}`}>
                              {ITEM_LABELS[key]}
                              <span className="govbb-hint" style={{ display: 'block' }}>
                                {ITEM_HINTS[key]}
                              </span>
                            </label>
                          </div>
                          {key === 'custom' && editType === 'custom' && (
                            <div className="govbb-radio-item__conditional">
                              <div className="govbb-form-group">
                                <label className="govbb-label" htmlFor="edit-custom-name">
                                  Name your reminder
                                </label>
                                <div className="govbb-input-wrapper">
                                  <input
                                    id="edit-custom-name"
                                    type="text"
                                    className="govbb-input"
                                    value={editCustomName}
                                    maxLength={60}
                                    onChange={e => setEditCustomName(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="govbb-btn-group app-mt-s">
                      <button type="button" className="govbb-btn" onClick={saveTypeEdit}>
                        Save and continue
                      </button>
                    </div>
                  </fieldset>
                )}

                {typeVerdict === 'confirmed' && extracted.itemType && (
                  <p className="app-verify__confirmed">
                    Confirmed: {ITEM_LABELS[extracted.itemType]}
                  </p>
                )}
              </section>

              {/* ── Question 2: expiry date — only after type is confirmed ── */}
              {typeVerdict === 'confirmed' && (
                <section className="app-verify__q" aria-labelledby="verify-date-q">
                  <p id="verify-date-q" className="app-verify__question">
                    Is this the expiry date?
                  </p>
                  <p className="app-verify__answer">
                    {extracted.expiry
                      ? formatLongDate(extracted.expiry)
                      : <em>We could not detect an expiry date</em>}
                  </p>

                  {dateVerdict === 'pending' && extracted.expiry && (
                    <div className="govbb-btn-group app-mt-s">
                      <button type="button" className="govbb-btn" onClick={confirmDate}>
                        Yes
                      </button>
                      <button type="button" className="govbb-btn--secondary" onClick={editDateNo}>
                        No, enter the date
                      </button>
                    </div>
                  )}

                  {dateVerdict === 'pending' && !extracted.expiry && (
                    <div className="govbb-btn-group app-mt-s">
                      <button type="button" className="govbb-btn" onClick={editDateNo}>
                        Enter the date
                      </button>
                    </div>
                  )}

                  {dateVerdict === 'editing' && (
                    <fieldset className="govbb-fieldset app-mt-s" role="group">
                      <legend className="govbb-fieldset__legend">
                        When does it expire?
                      </legend>
                      <p className="govbb-hint">For example, 15 06 2027.</p>
                      {editError && (
                        <p className="govbb-error-message app-mt-xs">
                          <span className="govbb-visually-hidden">Error: </span>
                          {editError}
                        </p>
                      )}
                      <div className="govbb-date-input app-mt-s">
                        <div className="govbb-date-input__part">
                          <label className="govbb-date-input__label" htmlFor="edit-day">Day</label>
                          <div className="govbb-date-input-wrapper">
                            <input
                              id="edit-day"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              autoComplete="off"
                              className="govbb-date-input__field"
                              value={editDay}
                              onChange={e => setEditDay(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                          </div>
                        </div>
                        <div className="govbb-date-input__part">
                          <label className="govbb-date-input__label" htmlFor="edit-month">Month</label>
                          <div className="govbb-date-input-wrapper">
                            <input
                              id="edit-month"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              autoComplete="off"
                              className="govbb-date-input__field"
                              value={editMonth}
                              onChange={e => setEditMonth(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                          </div>
                        </div>
                        <div className="govbb-date-input__part">
                          <label className="govbb-date-input__label" htmlFor="edit-year">Year</label>
                          <div className="govbb-date-input-wrapper govbb-date-input-wrapper--year">
                            <input
                              id="edit-year"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={4}
                              autoComplete="off"
                              className="govbb-date-input__field"
                              value={editYear}
                              onChange={e => setEditYear(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="govbb-btn-group app-mt-s">
                        <button type="button" className="govbb-btn" onClick={saveDateEdit}>
                          Save and continue
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {dateVerdict === 'confirmed' && extracted.expiry && (
                    <p className="app-verify__confirmed">
                      Confirmed: {formatLongDate(extracted.expiry)}
                    </p>
                  )}
                </section>
              )}

              {/* ── Final continue ─────────────────────────────────────── */}
              {bothConfirmed && (
                <div className="govbb-btn-group app-mt-m">
                  <button type="button" className="govbb-btn--secondary" onClick={resetPhotoState}>
                    Try another photo
                  </button>
                  <button type="button" className="govbb-btn" onClick={handleContinue}>
                    Continue
                  </button>
                </div>
              )}
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

      <h2 className="govbb-text-h3">What we ask for</h2>
      <div className="app-prose">
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
    </div>
  );
}
