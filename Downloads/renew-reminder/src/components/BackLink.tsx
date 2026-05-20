import type { Route } from '../router';

interface BackLinkProps {
  to: Route;
  label?: string;
}

export function BackLink({ to, label = 'Back' }: BackLinkProps) {
  return (
    <a href={`#${to}`} className="app-back-link">
      {label}
    </a>
  );
}
