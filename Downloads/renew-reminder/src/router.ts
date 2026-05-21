import { useEffect, useState } from 'react';

export type Route =
  | '/'
  | '/select-item'
  | '/expiry-date'
  | '/check-answers'
  | '/save-to-calendar'
  | '/privacy'
  | '/accessibility';

const ROUTES: Route[] = [
  '/',
  '/select-item',
  '/expiry-date',
  '/check-answers',
  '/save-to-calendar',
  '/privacy',
  '/accessibility',
];

function parseHash(hash: string): Route {
  const stripped = hash.replace(/^#/, '') || '/';
  return (ROUTES.includes(stripped as Route) ? stripped : '/') as Route;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const update = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

export function navigate(to: Route): void {
  window.location.hash = to;
}
