import { useCallback, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { useRoute } from './router';
import {
  EMPTY_ANSWERS,
  JourneyContext,
  persistReminder,
  type JourneyContextValue,
} from './store';
import type { Answers, StoredReminder } from './types';

import { Start } from './pages/Start';
import { SelectItem } from './pages/SelectItem';
import { ExpiryDate } from './pages/ExpiryDate';
import { NotificationMethod } from './pages/NotificationMethod';
import { Contact } from './pages/Contact';
import { CheckAnswers } from './pages/CheckAnswers';
import { Confirmation } from './pages/Confirmation';
import { Privacy } from './pages/Privacy';
import { Accessibility } from './pages/Accessibility';

export default function App() {
  const route = useRoute();
  const [answers, setAnswersState] = useState<Answers>(EMPTY_ANSWERS);
  const [lastReminder, setLastReminder] = useState<StoredReminder | null>(null);

  const setAnswers = useCallback((next: Partial<Answers>) => {
    setAnswersState(prev => ({ ...prev, ...next }));
  }, []);

  const resetAnswers = useCallback(() => {
    setAnswersState(EMPTY_ANSWERS);
  }, []);

  const saveReminder = useCallback((r: StoredReminder) => {
    persistReminder(r);
    setLastReminder(r);
  }, []);

  const value = useMemo<JourneyContextValue>(
    () => ({ answers, setAnswers, resetAnswers, saveReminder, lastReminder }),
    [answers, setAnswers, resetAnswers, saveReminder, lastReminder],
  );

  const page = (() => {
    switch (route) {
      case '/': return <Start />;
      case '/select-item': return <SelectItem />;
      case '/expiry-date': return <ExpiryDate />;
      case '/notification-method': return <NotificationMethod />;
      case '/contact': return <Contact />;
      case '/check-answers': return <CheckAnswers />;
      case '/confirmation': return <Confirmation />;
      case '/privacy': return <Privacy />;
      case '/accessibility': return <Accessibility />;
      default: return <Start />;
    }
  })();

  return (
    <JourneyContext.Provider value={value}>
      <Layout>{page}</Layout>
    </JourneyContext.Provider>
  );
}
