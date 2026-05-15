/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import VoiceBox from './VoiceBox';
import NewSession from './NewSession';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return hash;
}

export function navigate(to: string) {
  window.location.hash = to;
}

export default function App() {
  const hash = useHash();
  if (hash === '#/new') return <NewSession />;
  return <VoiceBox />;
}
