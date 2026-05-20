import { useEffect } from 'react';

const SERVICE_AND_SITE = 'Renew Reminder — GOV.BB';

/**
 * Set the document title to "[pageTitle] — Renew Reminder — GOV.BB".
 *
 * GDS guidance: each step in a service must have a unique, descriptive
 * <title>. Screen readers announce it on load; users with several tabs
 * open rely on it to keep their bearings.
 *
 * Pass hasErrors=true to prefix "Error: " (GOV.UK convention when an
 * error summary is shown on the page).
 */
export function usePageTitle(pageTitle: string | null, hasErrors = false): void {
  useEffect(() => {
    const prefix = hasErrors ? 'Error: ' : '';
    document.title = pageTitle
      ? `${prefix}${pageTitle} — ${SERVICE_AND_SITE}`
      : SERVICE_AND_SITE;
  }, [pageTitle, hasErrors]);
}
