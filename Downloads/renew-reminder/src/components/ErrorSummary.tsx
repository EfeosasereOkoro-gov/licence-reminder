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
        {errors.map(err => (
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
