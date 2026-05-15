/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  RotateCcw,
  Sparkles,
  History,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PARTICIPANTS } from './constants';
import { Participant, SelectionState, Role, Gender } from './types';

const STORAGE_KEY = 'voicebox_selection_state';

const getInitialState = (): SelectionState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return { counts: {}, history: [] };
};

export default function App() {
  const [state, setState] = useState<SelectionState>(getInitialState);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<Participant[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectSpeakers = useCallback(() => {
    setIsRandomizing(true);

    setTimeout(() => {
      let finalSelection: Participant[] = [];
      const MAX_ATTEMPTS = 200;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const selectedIds: string[] = [];
        const selectedRoles = new Set<Role>();
        const pick: Participant[] = [];

        for (let i = 0; i < 4; i++) {
          const pool = PARTICIPANTS.filter(
            (p) => !selectedIds.includes(p.id) && !selectedRoles.has(p.role)
          );
          if (pool.length === 0) break;

          // Flat weight: 1 if never selected, 0.05 if selected at least once
          const weighted = pool.map((p) => ({
            p,
            w: (state.counts[p.id] || 0) === 0 ? 1 : 0.05,
          }));

          const total = weighted.reduce((s, x) => s + x.w, 0);
          let rnd = Math.random() * total;
          let chosen = weighted[weighted.length - 1].p;
          for (const item of weighted) {
            rnd -= item.w;
            if (rnd <= 0) { chosen = item.p; break; }
          }

          pick.push(chosen);
          selectedIds.push(chosen.id);
          selectedRoles.add(chosen.role);
        }

        if (pick.length < 4) continue;

        const maleCount = pick.filter((p) => p.gender === Gender.Male).length;
        const femaleCount = pick.filter((p) => p.gender === Gender.Female).length;
        if (maleCount < 1 || femaleCount < 1) continue;

        finalSelection = pick;
        break;
      }

      if (finalSelection.length === 4) {
        const newCounts = { ...state.counts };
        finalSelection.forEach((p) => {
          newCounts[p.id] = (newCounts[p.id] || 0) + 1;
        });
        setCurrentSelection(finalSelection);
        setState((prev) => ({
          counts: newCounts,
          history: [finalSelection.map((p) => p.id), ...prev.history].slice(0, 10),
        }));
      }

      setIsRandomizing(false);
    }, 800);
  }, [state.counts]);

  const resetHistory = () => {
    if (confirm('Reset all selection stats and history?')) {
      setState({ counts: {}, history: [] });
      setCurrentSelection([]);
    }
  };

  const sortedParticipants = useMemo(
    () =>
      [...PARTICIPANTS].sort((a, b) => {
        const ca = state.counts[a.id] || 0;
        const cb = state.counts[b.id] || 0;
        return ca !== cb ? ca - cb : a.name.localeCompare(b.name);
      }),
    [state.counts]
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#00FF00] selection:text-black overflow-hidden">
      {/* Nav */}
      <nav className="border-b-2 border-black bg-white z-20 px-4 py-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-lg">
            <Users className="text-[#00FF00] w-5 h-5" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">VoiceBox</h1>
        </div>
        <button
          onClick={resetHistory}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Stats
        </button>
      </nav>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main panel — fills 100% of remaining viewport, no scroll on mobile */}
        <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-14 min-h-0 overflow-hidden border-r-2 border-black">
          {/* Header */}
          <div className="flex-shrink-0 mb-3 md:mb-6">
            <span className="bg-[#00FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-2 inline-block transform -rotate-1">
              Active Session
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black leading-[0.9] tracking-tighter uppercase mb-1">
              Who is speaking{' '}
              <span className="text-[#00FF00] bg-black px-2 py-0.5 inline-block">next?</span>
            </h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              Ensuring every role has a voice.
            </p>
          </div>

          {/* Randomize button */}
          <button
            onClick={selectSpeakers}
            disabled={isRandomizing}
            className="flex-shrink-0 inline-flex items-center justify-center bg-black text-white px-6 py-3 md:py-4 text-sm md:text-base font-black uppercase tracking-wider hover:bg-[#00FF00] hover:text-black disabled:opacity-50 transition-colors"
          >
            <AnimatePresence mode="wait">
              {isRandomizing ? (
                <motion.span
                  key="shuffling"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5 animate-spin" />
                  Shuffling...
                </motion.span>
              ) : (
                <motion.span
                  key="randomize"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Randomize
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Cards — flex-1 so they fill the remaining space */}
          <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 mt-3">
            <AnimatePresence mode="popLayout">
              {currentSelection.length > 0
                ? currentSelection.map((p, idx) => (
                    <motion.div
                      key={`${p.id}-${idx}`}
                      initial={{ scale: 0.85, opacity: 0, y: 16 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 150, delay: idx * 0.05 }}
                      className="bg-white border-2 border-black p-3 flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-end">
                        <div className="w-7 h-7 bg-black rounded-full grid place-items-center">
                          <Users className="text-[#00FF00] w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-black leading-tight uppercase group-hover:text-[#00FF00] transition-colors">
                        {p.name}
                      </h3>
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-black group-hover:border-[#00FF00] transition-colors" />
                    </motion.div>
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`ghost-${i}`}
                      className="border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50/30"
                    >
                      <Users className="text-gray-200 w-7 h-7 opacity-20" />
                    </div>
                  ))}
            </AnimatePresence>
          </div>
        </main>

        {/* Sidebar — hidden on mobile */}
        <aside className="hidden lg:flex flex-col w-[320px] xl:w-[360px] overflow-y-auto border-l-2 border-black bg-white">
          <div className="p-5 border-b-2 border-black bg-black text-white flex items-center justify-between flex-shrink-0">
            <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-[#00FF00]" />
              Team Roster
            </h3>
            <span className="text-xs font-bold bg-[#00FF00] text-black px-2 py-0.5 rounded">
              {PARTICIPANTS.length} Members
            </span>
          </div>

          <div className="p-4 bg-gray-50 border-b-2 border-black flex-shrink-0">
            <div className="flex items-start gap-3 bg-white border-2 border-black p-3 text-xs font-medium italic leading-snug">
              <Info className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
              Least-selected members sorted to top. Once selected, a person is only 5% as likely to be picked again.
            </div>
          </div>

          <div className="divide-y-2 divide-black overflow-y-auto">
            {sortedParticipants.map((p) => {
              const count = state.counts[p.id] || 0;
              const isSelected = currentSelection.some((s) => s.id === p.id);
              return (
                <div
                  key={p.id}
                  className={`p-4 transition-colors ${isSelected ? 'bg-[#00FF00]/10' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-black uppercase text-sm">{p.name}</h4>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00FF00] fill-black" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden border border-black/10">
                      <div
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${Math.min(count * 20, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {count} {count === 1 ? 'call' : 'calls'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-black px-6 py-3 bg-white flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Fairness Algorithm Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Role Guard Enabled</span>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">
          Built for high-engagement collaboration © 2026
        </p>
      </footer>
    </div>
  );
}
