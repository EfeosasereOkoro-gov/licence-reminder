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
  AlertCircle
} from 'lucide-react';
import { PARTICIPANTS } from './constants';
import { Participant, SelectionState, Role, Gender } from './types';

const STORAGE_KEY = 'voicebox_selection_state';

const getInitialState = (): SelectionState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return {
    counts: {},
    history: [],
  };
};

export default function App() {
  const [state, setState] = useState<SelectionState>(getInitialState);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<Participant[]>([]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectSpeakers = useCallback(() => {
    setIsRandomizing(true);
    
    // Artificial delay for animation effect
    setTimeout(() => {
      let finalSelection: Participant[] = [];
      let attempts = 0;
      const MAX_ATTEMPTS = 50;

      while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const selectedIds: string[] = [];
        const selectedRoles = new Set<Role>();
        const currentSelectionAttempt: Participant[] = [];

        // Try to pick 4 distinct people from 4 distinct roles
        for (let i = 0; i < 4; i++) {
          const pool = PARTICIPANTS.filter(p => 
            !selectedIds.includes(p.id) && !selectedRoles.has(p.role)
          );

          if (pool.length === 0) break;

          const weightedPool = pool.map(p => {
            const count = state.counts[p.id] || 0;
            return {
              participant: p,
              weight: Math.pow(0.05, count)
            };
          });

          const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
          let random = Math.random() * totalWeight;
          
          let selected: Participant | null = null;
          for (const item of weightedPool) {
            random -= item.weight;
            if (random <= 0) {
              selected = item.participant;
              break;
            }
          }

          if (!selected) selected = weightedPool[weightedPool.length - 1].participant;

          currentSelectionAttempt.push(selected);
          selectedIds.push(selected.id);
          selectedRoles.add(selected.role);
        }

        // Validate gender balance: must have at least 1 Male and 1 Female
        const hasMale = currentSelectionAttempt.some(p => p.gender === Gender.Male);
        const hasFemale = currentSelectionAttempt.some(p => p.gender === Gender.Female);

        if (currentSelectionAttempt.length === 4 && hasMale && hasFemale) {
          finalSelection = currentSelectionAttempt;
          break;
        }
      }

      if (finalSelection.length === 4) {
        const selectionCountCopy = { ...state.counts };
        finalSelection.forEach(p => {
          selectionCountCopy[p.id] = (selectionCountCopy[p.id] || 0) + 1;
        });

        setCurrentSelection(finalSelection);
        setState(prev => ({
          counts: selectionCountCopy,
          history: [finalSelection.map(p => p.id), ...prev.history].slice(0, 10)
        }));
      }
      setIsRandomizing(false);
    }, 800);
  }, [state.counts]);

  const resetHistory = () => {
    if (confirm('Are you sure you want to reset all selection stats and history?')) {
      setState({ counts: {}, history: [] });
      setCurrentSelection([]);
    }
  };

  const sortedParticipants = useMemo(() => {
    return [...PARTICIPANTS].sort((a, b) => {
      const countA = state.counts[a.id] || 0;
      const countB = state.counts[b.id] || 0;
      if (countA !== countB) return countA - countB;
      return a.name.localeCompare(b.name);
    });
  }, [state.counts]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#00FF00] selection:text-black">
      {/* Top Bar */}
      <nav className="border-b-2 border-black sticky top-0 bg-white z-20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-lg">
            <Users className="text-[#00FF00] w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">VoiceBox</h1>
        </div>
        <button 
          onClick={resetHistory}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Stats
        </button>
      </nav>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] min-h-[calc(100vh-76px)]">
        {/* Selection Area */}
        <div className="p-4 md:p-8 lg:p-16 border-r-2 border-black flex flex-col justify-center">
          <div className="mb-4 md:mb-8 overflow-hidden">
            <span className="bg-[#00FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-2 inline-block transform -rotate-1">
              Active Session
            </span>
            <h2 className="text-3xl lg:text-7xl font-black leading-[0.9] tracking-tighter uppercase mb-2">
              Who is speaking <br />
              <span className="text-[#00FF00] bg-black px-3 py-1 mt-1 inline-block">next?</span>
            </h2>
            <p className="text-[10px] md:text-lg max-w-xl text-gray-500 font-medium leading-relaxed">
              Ensuring every role has a voice.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:gap-4 mb-4">
            <button
              onClick={selectSpeakers}
              disabled={isRandomizing}
              className="group relative inline-flex items-center justify-center bg-black text-white px-6 py-3 md:px-8 md:py-5 text-base md:text-xl font-black uppercase tracking-wider overflow-hidden transition-all hover:bg-[#00FF00] hover:text-black disabled:opacity-50"
            >
              <AnimatePresence mode="wait">
                {isRandomizing ? (
                  <motion.div
                    key="shuffling"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <RotateCcw className="w-6 h-6 animate-spin" />
                    Shuffling...
                  </motion.div>
                ) : (
                  <motion.div
                    key="randomize"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Sparkles className="w-6 h-6" />
                    Randomize
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <AnimatePresence mode="popLayout">
                {currentSelection.length > 0 ? (
                  currentSelection.map((p, idx) => (
                    <motion.div
                      key={`${p.id}-${idx}`}
                      initial={{ scale: 0.8, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ 
                        type: "spring", 
                        damping: 15, 
                        stiffness: 150,
                        delay: idx * 0.05 
                      }}
                      className="bg-white border-2 border-black p-3 md:p-4 flex flex-col justify-between min-h-[140px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-end mb-2">
                        <div className="w-8 h-8 bg-black rounded-full grid place-items-center">
                          <Users className="text-[#00FF00] w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-black leading-tight uppercase group-hover:text-[#00FF00] transition-colors line-clamp-2">
                          {p.name}
                        </h3>
                      </div>
                      {/* Decorative corner accent */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-black group-hover:border-[#00FF00] transition-colors" />
                    </motion.div>
                  ))
                ) : (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={`ghost-${i}`} className="border-2 border-dashed border-gray-200 p-4 min-h-[140px] flex items-center justify-center bg-gray-50/30">
                      <Users className="text-gray-200 w-8 h-8 opacity-20" />
                    </div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="bg-white overflow-y-auto max-h-[calc(100vh-76px)] border-l-2 lg:border-l-0">
          <div className="p-6 border-b-2 border-black bg-black text-white flex items-center justify-between">
            <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-[#00FF00]" />
              Team Roster
            </h3>
            <span className="text-xs font-bold bg-[#00FF00] text-black px-2 py-0.5 rounded">
              {PARTICIPANTS.length} Members
            </span>
          </div>

          <div className="p-4 bg-gray-50 border-b-2 border-black">
            <div className="flex items-start gap-3 bg-white border-2 border-black p-4 text-xs font-medium italic leading-snug">
              <Info className="w-5 h-5 shrink-0 text-gray-400" />
              People with fewer selections sorted to top. Each selection reduces future probability by 50%.
            </div>
          </div>

          <div className="divide-y-2 divide-black">
            {sortedParticipants.map(p => {
              const count = state.counts[p.id] || 0;
              const isSelected = currentSelection.some(s => s.id === p.id);
              
              return (
                <div 
                  key={p.id} 
                  className={`p-4 group transition-colors ${isSelected ? 'bg-[#00FF00]/10' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`font-black uppercase text-sm ${isSelected ? 'text-black' : 'text-gray-800'}`}>
                        {p.name}
                      </h4>
                    </div>
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
      </main>

      {/* Footer Info */}
      <footer className="border-t-2 border-black p-6 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
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
