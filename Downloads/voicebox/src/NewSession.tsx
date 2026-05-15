/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Sparkles, RotateCcw, Plus, Trash2,
  ChevronLeft, Upload, Info, CheckCircle2, AlertTriangle,
  Settings, Play,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person {
  id: string;
  name: string;
  group: string; // empty string = no group
}

interface Rules {
  pickCount: number;          // how many to select each draw
  reselectionChance: number;  // 0–100 — % weight vs a fresh person
  groupUniqueness: boolean;   // no two people from the same group in one draw
  groupBalance: boolean;      // at least 1 from every group (requires groupCount ≤ pickCount)
}

type Phase = 'setup' | 'running';

const DEFAULT_RULES: Rules = {
  pickCount: 4,
  reselectionChance: 5,
  groupUniqueness: false,
  groupBalance: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2); }

function gridCols(n: number) {
  if (n <= 2) return 'grid-cols-1';
  if (n <= 6) return 'grid-cols-2';
  return 'grid-cols-3';
}

function gridRows(n: number, cols: number) {
  return `grid-rows-${Math.ceil(n / cols)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewSession() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [people, setPeople] = useState<Person[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);

  // ── Setup form state ───────────────────────────────────────────────────────
  const [nameInput, setNameInput] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Run state ──────────────────────────────────────────────────────────────
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selection, setSelection] = useState<Person[]>([]);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [constraintWarning, setConstraintWarning] = useState('');

  // ── Derived ────────────────────────────────────────────────────────────────
  const uniqueGroups = [...new Set(people.filter(p => p.group).map(p => p.group))];
  const hasGroups = uniqueGroups.length > 0;
  const balanceFeasible = hasGroups && uniqueGroups.length <= rules.pickCount;
  const canStart = people.length >= rules.pickCount;

  // ── Participant management ─────────────────────────────────────────────────

  const addPerson = () => {
    const name = nameInput.trim();
    if (!name) { setNameError('Name is required'); return; }
    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setNameError('Already in the list'); return;
    }
    setNameError('');
    setPeople(prev => [...prev, { id: uid(), name, group: groupInput.trim() }]);
    setNameInput('');
    setGroupInput('');
    nameRef.current?.focus();
  };

  const removePerson = (id: string) => setPeople(prev => prev.filter(p => p.id !== id));

  const importBulk = () => {
    const existing = new Set(people.map(p => p.name.toLowerCase()));
    const newPeople = bulkText
      .split('\n')
      .map(l => l.trim()).filter(Boolean)
      .map(line => {
        const [name, group = ''] = line.split(',').map(s => s.trim());
        return { id: uid(), name, group };
      })
      .filter(p => p.name && !existing.has(p.name.toLowerCase()));
    setPeople(prev => [...prev, ...newPeople]);
    setBulkText('');
    setShowBulk(false);
  };

  // ── Session control ────────────────────────────────────────────────────────

  const startSession = () => {
    if (!canStart) return;
    setCounts({});
    setSelection([]);
    setConstraintWarning('');
    setPhase('running');
  };

  const resetCounts = () => {
    if (confirm('Reset all selection history for this session?')) {
      setCounts({});
      setSelection([]);
      setConstraintWarning('');
    }
  };

  // ── Randomise ──────────────────────────────────────────────────────────────

  const randomize = useCallback(() => {
    setIsRandomizing(true);
    setConstraintWarning('');

    setTimeout(() => {
      const weight = rules.reselectionChance / 100;
      let final: Person[] = [];
      const MAX = 1000;

      for (let attempt = 0; attempt < MAX; attempt++) {
        const usedIds = new Set<string>();
        const usedGroups = new Set<string>();
        const pick: Person[] = [];

        for (let i = 0; i < rules.pickCount; i++) {
          let pool = people.filter(p => !usedIds.has(p.id));

          if (rules.groupUniqueness && hasGroups) {
            pool = pool.filter(p => !p.group || !usedGroups.has(p.group));
          }

          if (pool.length === 0) break;

          // Weighted selection: fresh → weight 1, already picked → weight
          const weighted = pool.map(p => ({
            p,
            w: (counts[p.id] || 0) === 0 ? 1 : weight,
          }));
          const total = weighted.reduce((s, x) => s + x.w, 0);
          let rnd = Math.random() * total;
          let chosen = weighted[weighted.length - 1].p;
          for (const item of weighted) {
            rnd -= item.w;
            if (rnd <= 0) { chosen = item.p; break; }
          }

          pick.push(chosen);
          usedIds.add(chosen.id);
          if (chosen.group) usedGroups.add(chosen.group);
        }

        if (pick.length < rules.pickCount) continue;

        // Group balance check
        if (rules.groupBalance && balanceFeasible) {
          const covered = new Set(pick.filter(p => p.group).map(p => p.group));
          if (!uniqueGroups.every(g => covered.has(g))) continue;
        }

        final = pick;
        break;
      }

      if (final.length === rules.pickCount) {
        const newCounts = { ...counts };
        final.forEach(p => { newCounts[p.id] = (newCounts[p.id] || 0) + 1; });
        setCounts(newCounts);
        setSelection(final);
      } else if (final.length > 0) {
        // Constraints couldn't be fully satisfied — show best effort with warning
        setSelection(final);
        setConstraintWarning('Could not satisfy all constraints — showing best result.');
      } else {
        setConstraintWarning('No valid selection possible. Try relaxing the rules.');
      }

      setIsRandomizing(false);
    }, 700);
  }, [people, rules, counts, hasGroups, uniqueGroups, balanceFeasible]);

  // ── Render: setup ──────────────────────────────────────────────────────────

  const sortedPeople = [...people].sort((a, b) => {
    const ca = counts[a.id] || 0;
    const cb = counts[b.id] || 0;
    return ca !== cb ? ca - cb : a.name.localeCompare(b.name);
  });

  const cols = gridCols(rules.pickCount);
  const colsNum = rules.pickCount <= 2 ? 1 : rules.pickCount <= 6 ? 2 : 3;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#00FF00] selection:text-black">

      {/* ── Nav ── */}
      <nav className="border-b-2 border-black bg-white z-20 px-4 py-3 flex justify-between items-center flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-lg">
            <Users className="text-[#00FF00] w-5 h-5" />
          </div>
          <div className="leading-none">
            <p className="text-lg font-black uppercase tracking-tighter italic">VoiceBox</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#00FF00]">Custom Session</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'running' && (
            <button
              onClick={() => { if (confirm('Return to setup? Selection history will be preserved.')) setPhase('setup'); }}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              <Settings className="w-3 h-3" /> Edit Setup
            </button>
          )}
          <a href="#/" className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Team View
          </a>
        </div>
      </nav>

      {phase === 'setup' ? (
        /* ══════════════════════════════════════════════════════════════════════
           SETUP PHASE
        ══════════════════════════════════════════════════════════════════════ */
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 lg:p-12">

          {/* Page title */}
          <div className="mb-8">
            <span className="bg-[#00FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest inline-block transform -rotate-1 mb-2">
              Build Your Session
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">
              Who's in the room?
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Add participants, set your rules, and let the algorithm do the talking.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 items-start">

            {/* ── Left: Participants ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants
                  {people.length > 0 && (
                    <span className="bg-black text-[#00FF00] text-[10px] font-black px-2 py-0.5 rounded">
                      {people.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowBulk(v => !v)}
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <Upload className="w-3 h-3" />
                  {showBulk ? 'Cancel import' : 'Bulk import'}
                </button>
              </div>

              {/* Bulk import panel */}
              <AnimatePresence>
                {showBulk && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="border-2 border-black p-4 bg-gray-50">
                      <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        One per line — optionally <code className="bg-black text-[#00FF00] px-1">Name, Group</code>
                      </p>
                      <textarea
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder={"Alice, Marketing\nBob, Dev\nCarol"}
                        rows={6}
                        className="w-full border-2 border-black p-3 text-sm font-mono resize-none focus:outline-none focus:border-[#00FF00] bg-white"
                      />
                      <button
                        onClick={importBulk}
                        disabled={!bulkText.trim()}
                        className="mt-2 w-full bg-black text-white py-2 text-xs font-black uppercase tracking-widest hover:bg-[#00FF00] hover:text-black disabled:opacity-30 transition-colors"
                      >
                        Import
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add one person */}
              <div className="flex gap-2 mb-1">
                <div className="flex-1">
                  <input
                    ref={nameRef}
                    value={nameInput}
                    onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                    onKeyDown={e => e.key === 'Enter' && addPerson()}
                    placeholder="Name *"
                    className={`w-full border-2 px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#00FF00] bg-white transition-colors ${nameError ? 'border-red-500' : 'border-black'}`}
                  />
                </div>
                <input
                  value={groupInput}
                  onChange={e => setGroupInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPerson()}
                  placeholder="Group (optional)"
                  className="w-36 border-2 border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-[#00FF00] bg-white transition-colors"
                />
                <button
                  onClick={addPerson}
                  className="bg-black text-[#00FF00] px-4 py-2.5 hover:bg-[#00FF00] hover:text-black transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {nameError && <p className="text-red-500 text-xs font-bold mb-2">{nameError}</p>}

              {/* People list */}
              <div className="mt-3 border-2 border-black divide-y-2 divide-black max-h-[400px] overflow-y-auto">
                {people.length === 0 ? (
                  <div className="p-8 text-center text-gray-300">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">No participants yet</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {people.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 group"
                      >
                        <div>
                          <span className="font-black text-sm uppercase">{p.name}</span>
                          {p.group && (
                            <span className="ml-2 bg-black text-[#00FF00] text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wide">
                              {p.group}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removePerson(p.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>

            {/* ── Right: Rules ── */}
            <section className="border-2 border-black p-6 bg-white">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2 mb-6">
                <Settings className="w-4 h-4" />
                Rules
              </h3>

              {/* Pick count */}
              <div className="mb-6">
                <label className="block text-[11px] font-black uppercase tracking-widest mb-2 text-gray-500">
                  How many to pick per draw
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1} max={20}
                    value={rules.pickCount}
                    onChange={e => setRules(r => ({ ...r, pickCount: Number(e.target.value) }))}
                    className="flex-1 accent-black"
                  />
                  <span className="w-10 text-center font-black text-xl border-2 border-black py-0.5">
                    {rules.pickCount}
                  </span>
                </div>
              </div>

              {/* Reselection chance */}
              <div className="mb-6">
                <label className="block text-[11px] font-black uppercase tracking-widest mb-1 text-gray-500">
                  Reselection weight
                </label>
                <p className="text-[10px] text-gray-400 mb-2">
                  Once picked, a person has this % weight compared to fresh participants.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={100}
                    value={rules.reselectionChance}
                    onChange={e => setRules(r => ({ ...r, reselectionChance: Number(e.target.value) }))}
                    className="flex-1 accent-black"
                  />
                  <span className="w-14 text-center font-black text-xl border-2 border-black py-0.5">
                    {rules.reselectionChance}%
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-bold uppercase">
                  <span>Never again</span>
                  <span>Equal chance</span>
                </div>
              </div>

              {/* Group uniqueness */}
              <div className="mb-4 border-t-2 border-black pt-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => setRules(r => ({ ...r, groupUniqueness: !r.groupUniqueness, groupBalance: !r.groupUniqueness ? r.groupBalance : false }))}
                    className={`mt-0.5 w-5 h-5 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${rules.groupUniqueness ? 'bg-black' : 'bg-white group-hover:bg-gray-100'}`}
                  >
                    {rules.groupUniqueness && <CheckCircle2 className="w-3 h-3 text-[#00FF00]" />}
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-wide">No two from the same group</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Each draw will include at most one person per group.</p>
                    {!hasGroups && (
                      <p className="text-[10px] text-amber-500 font-bold mt-1">↑ Assign groups to participants first</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Group balance */}
              <div className="mb-6">
                <label className={`flex items-start gap-3 ${!rules.groupUniqueness ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
                  <div
                    onClick={() => rules.groupUniqueness && setRules(r => ({ ...r, groupBalance: !r.groupBalance }))}
                    className={`mt-0.5 w-5 h-5 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${rules.groupBalance ? 'bg-black' : 'bg-white group-hover:bg-gray-100'} ${!rules.groupUniqueness ? 'pointer-events-none' : ''}`}
                  >
                    {rules.groupBalance && <CheckCircle2 className="w-3 h-3 text-[#00FF00]" />}
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-wide">Represent every group</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Ensure at least one person from each group is selected.</p>
                    {rules.groupUniqueness && !balanceFeasible && hasGroups && (
                      <p className="text-[10px] text-amber-500 font-bold mt-1">
                        ↑ {uniqueGroups.length} groups but only picking {rules.pickCount} — increase pick count
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* CTA */}
              {!canStart && people.length > 0 && (
                <p className="text-[11px] text-amber-600 font-bold mb-3 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Need at least {rules.pickCount} participants to start
                </p>
              )}
              <button
                onClick={startSession}
                disabled={!canStart}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-4 font-black uppercase tracking-widest text-sm hover:bg-[#00FF00] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>

              {people.length > 0 && (
                <p className="text-center text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest">
                  {people.length} participant{people.length !== 1 ? 's' : ''} · picking {rules.pickCount}
                </p>
              )}
            </section>
          </div>
        </main>

      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           RUNNING PHASE
        ══════════════════════════════════════════════════════════════════════ */
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Main panel */}
          <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-12 min-h-0 overflow-y-auto border-r-2 border-black">

            <div className="flex-shrink-0 mb-4">
              <span className="bg-[#00FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest inline-block transform -rotate-1 mb-2">
                Session Active
              </span>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tighter uppercase">
                Who speaks{' '}
                <span className="text-[#00FF00] bg-black px-2 py-0.5 inline-block">next?</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {people.length} participants · picking {rules.pickCount} · {rules.reselectionChance}% reselection weight
                {rules.groupUniqueness && ' · group-unique'}
              </p>
            </div>

            {/* Constraint warning */}
            <AnimatePresence>
              {constraintWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-amber-50 border-2 border-amber-400 px-4 py-3 mb-4 text-xs font-bold text-amber-700"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {constraintWarning}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Randomise button */}
            <button
              onClick={randomize}
              disabled={isRandomizing}
              className="flex-shrink-0 inline-flex items-center justify-center bg-black text-white px-6 py-3 md:py-4 text-sm md:text-base font-black uppercase tracking-wider hover:bg-[#00FF00] hover:text-black disabled:opacity-50 transition-colors mb-4"
            >
              <AnimatePresence mode="wait">
                {isRandomizing ? (
                  <motion.span key="s" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 animate-spin" /> Shuffling...
                  </motion.span>
                ) : (
                  <motion.span key="r" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Randomize
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Cards */}
            <div className={`grid ${cols} gap-2`}>
              <AnimatePresence mode="popLayout">
                {selection.length > 0
                  ? selection.map((p, idx) => (
                      <motion.div
                        key={`${p.id}-${idx}`}
                        initial={{ scale: 0.85, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 150, delay: idx * 0.05 }}
                        className="bg-white border-2 border-black p-4 min-h-[120px] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          {p.group ? (
                            <span className="text-[10px] font-black uppercase tracking-wide bg-black text-[#00FF00] px-1.5 py-0.5">
                              {p.group}
                            </span>
                          ) : <span />}
                          <div className="w-7 h-7 bg-black rounded-full grid place-items-center flex-shrink-0">
                            <Users className="text-[#00FF00] w-3.5 h-3.5" />
                          </div>
                        </div>
                        <h3 className="text-base md:text-lg font-black leading-tight uppercase group-hover:text-[#00FF00] transition-colors mt-2">
                          {p.name}
                        </h3>
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-black group-hover:border-[#00FF00] transition-colors" />
                      </motion.div>
                    ))
                  : Array.from({ length: rules.pickCount }).map((_, i) => (
                      <div key={`ghost-${i}`} className="border-2 border-dashed border-gray-200 min-h-[120px] flex items-center justify-center bg-gray-50/30">
                        <Users className="text-gray-200 w-7 h-7 opacity-20" />
                      </div>
                    ))}
              </AnimatePresence>
            </div>
          </main>

          {/* Sidebar — desktop only */}
          <aside className="hidden lg:flex flex-col w-[300px] xl:w-[340px] overflow-y-auto border-l-2 border-black bg-white">
            <div className="p-5 border-b-2 border-black bg-black text-white flex items-center justify-between flex-shrink-0">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00FF00]" />
                Roster
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-[#00FF00] text-black px-2 py-0.5 rounded">
                  {people.length}
                </span>
                <button onClick={resetCounts} title="Reset history" className="opacity-40 hover:opacity-100 transition-opacity">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 border-b-2 border-black bg-gray-50 flex-shrink-0">
              <div className="flex items-start gap-2 bg-white border-2 border-black p-3 text-[11px] font-medium italic leading-snug">
                <Info className="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                Least-selected sorted to top. Once picked, a person has {rules.reselectionChance}% weight vs fresh participants.
              </div>
            </div>

            <div className="divide-y-2 divide-black overflow-y-auto">
              {sortedPeople.map(p => {
                const count = counts[p.id] || 0;
                const isSelected = selection.some(s => s.id === p.id);
                return (
                  <div key={p.id} className={`px-4 py-3 transition-colors ${isSelected ? 'bg-[#00FF00]/10' : 'hover:bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="font-black uppercase text-sm">{p.name}</span>
                        {p.group && (
                          <span className="ml-1.5 text-[9px] font-black uppercase bg-black text-[#00FF00] px-1 py-0.5">
                            {p.group}
                          </span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00FF00] fill-black flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-200 overflow-hidden border border-black/10">
                        <div className="h-full bg-black transition-all duration-500" style={{ width: `${Math.min(count * 25, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400 w-12 text-right">
                        {count}× picked
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

        </div>
      )}
    </div>
  );
}
