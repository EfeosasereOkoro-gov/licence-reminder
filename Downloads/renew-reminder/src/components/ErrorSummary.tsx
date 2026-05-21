import { useEffect, useRef } from 'react';

export interface ErrorItem {
  field: string;
  message: string;
}

interface ErrorSummaryProps {
  errors: ErrorItem[];
}

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) {
      ref.current?.focus();
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [errors]);

  if (errors.length === 0) return null;

  // Dedupe by message — a whole-form error (e.g. "date must be in the
  // future") may apply to multiple fields, but the user only needs to
  // see one summary entry for it. The link still points at the first
  // field with that message so focus management still works.
  const seen = new Set<string>();
  const unique = errors.filter(err => {
    if (seen.has(err.message)) return false;
    seen.add(err.message);
    return true;
  });

  return (
    <div
      ref={ref}
      className="govbb-error-summary"
      role="alert"
      aria-labelledby="error-summary-title"
      tabIndex={-1}
    >
      <h2 id="error-summary-title" className="govbb-error-summary__title">
        There is a problem
      </h2>
      <ul className="govbb-error-summary__list app-mt-xs">
        {unique.map(err => (
          <li key={err.field}>
            <a className="govbb-error-summary__link" href={`#${err.field}`}>
              {err.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
