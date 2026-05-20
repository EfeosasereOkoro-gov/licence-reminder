import { useEffect, useRef } from 'react';
import type { StoredReminder } from '../types';

interface MessagePreviewProps {
  open: boolean;
  reminder: StoredReminder;
  contact: string;
  onClose: () => void;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const OFFSETS = [90, 30, 7] as const;

export function MessagePreview({ open, reminder, contact, onClose }: MessagePreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close on backdrop click.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const expiry = new Date(reminder.expiryISO);
  const reminderDates = reminder.reminderDates.map(d => new Date(d));

  return (
    <dialog
      ref={dialogRef}
      className="message-preview"
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby="preview-title"
    >
      <div className="message-preview__inner">
        <header className="message-preview__header">
          <div>
            <h2 id="preview-title" className="govbb-text-h3 app-mb-0">
              {reminder.channel === 'email' ? 'Email preview' : 'Text message preview'}
            </h2>
            <p className="message-preview__sub">
              This is what your {reminder.channel === 'email' ? 'reminders' : 'text messages'} will look like.
            </p>
          </div>
          <button
            type="button"
            className="message-preview__close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="message-preview__list">
          {reminderDates.map((sendDate, i) => {
            const offset = OFFSETS[i];
            if (reminder.channel === 'email') {
              return (
                <EmailCard
                  key={sendDate.toISOString()}
                  sendDate={sendDate}
                  offset={offset}
                  expiry={expiry}
                  contact={contact}
                  itemLabel={reminder.itemLabel}
                  reminderId={reminder.id}
                />
              );
            }
            return (
              <SmsCard
                key={sendDate.toISOString()}
                sendDate={sendDate}
                offset={offset}
                expiry={expiry}
                contact={contact}
                itemLabel={reminder.itemLabel}
                reminderId={reminder.id}
              />
            );
          })}
        </div>

        <footer className="message-preview__footer">
          <button type="button" className="govbb-btn" onClick={onClose}>
            Close preview
          </button>
        </footer>
      </div>
    </dialog>
  );
}

interface CardProps {
  sendDate: Date;
  offset: number;
  expiry: Date;
  contact: string;
  itemLabel: string;
  reminderId: string;
}

function EmailCard({ sendDate, offset, expiry, contact, itemLabel, reminderId }: CardProps) {
  const subject = `Reminder: your ${itemLabel} expires in ${offset} days`;
  return (
    <article className="email-card" aria-label={`Email ${offset} days before expiry`}>
      <header className="email-card__chrome">
        <span className="email-card__pill">Will be sent {formatShortDate(sendDate)}</span>
        <span className="email-card__pill email-card__pill--muted">{offset} days before expiry</span>
      </header>

      <dl className="email-card__meta">
        <div className="email-card__meta-row">
          <dt>From</dt>
          <dd>Renew Reminder &lt;reminders@gov.bb&gt;</dd>
        </div>
        <div className="email-card__meta-row">
          <dt>To</dt>
          <dd>{contact}</dd>
        </div>
        <div className="email-card__meta-row">
          <dt>Subject</dt>
          <dd className="email-card__subject">{subject}</dd>
        </div>
      </dl>

      <div className="email-card__body">
        <p>Hello,</p>
        <p>
          Your <strong>{itemLabel}</strong> expires on{' '}
          <strong>{formatLongDate(expiry)}</strong>.
        </p>
        <p>
          {offset === 90 && 'You have about 3 months to renew it.'}
          {offset === 30 && 'You have about a month left. If you haven\'t already, please renew it soon to avoid any disruption.'}
          {offset === 7 && 'This is your final reminder — your document expires in one week. Please renew it now.'}
        </p>

        <hr className="email-card__divider" />

        <p className="email-card__small">
          <strong>Reference:</strong> {reminderId}
        </p>
        <p className="email-card__small">
          You're getting this because you set a reminder with Renew Reminder.
          {offset !== 7 && ' We\'ll send you another reminder ' + (offset === 90 ? '60 days from now.' : 'one week before your expiry date.')}
        </p>
        <p className="email-card__small">
          To stop these reminders, reply STOP to this email.
          <br />
          — Renew Reminder, Government of Barbados
        </p>
      </div>
    </article>
  );
}

function SmsCard({ sendDate, offset, expiry, contact, itemLabel, reminderId }: CardProps) {
  const body =
    `GOV.BB: Your ${itemLabel} expires in ${offset} days, on ${formatShortDate(expiry)}. ` +
    `Renew at gov.bb. Ref: ${reminderId}. Reply STOP to opt out.`;
  return (
    <article className="sms-card" aria-label={`Text message ${offset} days before expiry`}>
      <header className="email-card__chrome">
        <span className="email-card__pill">Will be sent {formatShortDate(sendDate)}</span>
        <span className="email-card__pill email-card__pill--muted">{offset} days before expiry</span>
      </header>
      <div className="sms-card__phone">
        <div className="sms-card__meta">
          <span className="sms-card__from">GOV.BB</span>
          <span className="sms-card__to">to {contact}</span>
        </div>
        <div className="sms-card__bubble">{body}</div>
      </div>
    </article>
  );
}
