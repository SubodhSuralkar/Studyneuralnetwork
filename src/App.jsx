import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap, Target, Shield, Sword, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Plus, Trash2, Play, Pause, RotateCcw,
  Award, TrendingUp, AlertTriangle, BookOpen, Atom, FlaskConical,
  Calculator, X, Volume2, VolumeX, Bell
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SYLLABUS = {
  Physics: [
    { name: "Rotational Dynamics", diff: "H" },
    { name: "Kinetic Theory of Gases", diff: "M" },
    { name: "Wave Optics", diff: "H" },
    { name: "Dual Nature of Radiation", diff: "M" },
    { name: "Structure of Atom", diff: "E" },
    { name: "Semiconductors", diff: "E" },
  ],
  Chemistry: [
    { name: "Solutions", diff: "H" },
    { name: "Electrochemistry", diff: "H" },
    { name: "Halogen Derivatives", diff: "E" },
    { name: "Alcohols, Phenols and Ethers", diff: "M" },
    { name: "Ionic Equilibrium", diff: "H" },
    { name: "Amines", diff: "M" },
    { name: "Transition Elements", diff: "E" },
    { name: "Basic Concepts of Chemistry", diff: "E" },
    { name: "Atomic Structure", diff: "E" },
    { name: "Chemical Thermodynamics", diff: "M" },
  ],
  Mathematics: [
    { name: "Pair of Lines", diff: "M" },
    { name: "Line & Plane", diff: "M" },
    { name: "Differentiation", diff: "H" },
    { name: "Applications of Derivatives", diff: "H" },
    { name: "Differential Equations", diff: "H" },
  ],
};

const TOTAL_CHAPTERS = Object.values(SYLLABUS).flat().length; // 21

const XP_MAP = { H: 500, M: 300, E: 150 };
const HOURS_MAP = { H: 5, M: 3, E: 1.5 };
const POMODORO_WORK = 25 * 60; // 25 min
const POMODORO_BREAK = 5 * 60; // 5 min

const DIFF_CONFIG = {
  H: { label: "BOSS BATTLE", color: "#ff00ff", bg: "rgba(255,0,255,0.1)", border: "border-[#ff00ff]", icon: Sword, tag: "text-[#ff00ff]" },
  M: { label: "ELITE ENEMY", color: "#ff6b00", bg: "rgba(255,107,0,0.1)", border: "border-[#ff6b00]", icon: Shield, tag: "text-[#ff6b00]" },
  E: { label: "MINION", color: "#00ff41", bg: "rgba(0,255,65,0.1)", border: "border-[#00ff41]", icon: Target, tag: "text-[#00ff41]" },
};

const SUBJECT_CONFIG = {
  Physics: { color: "#00f5ff", icon: Atom, label: "PHYSICS" },
  Chemistry: { color: "#ff00ff", icon: FlaskConical, label: "CHEMISTRY" },
  Mathematics: { color: "#00ff41", icon: Calculator, label: "MATHEMATICS" },
};

const RANK_THRESHOLDS = [
  { rank: "CADET", min: 0, max: 500 },
  { rank: "RECRUIT", min: 500, max: 1200 },
  { rank: "SPECIALIST", min: 1200, max: 2500 },
  { rank: "OPERATIVE", min: 2500, max: 4500 },
  { rank: "COMMANDER", min: 4500, max: 7000 },
  { rank: "WARLORD", min: 7000, max: 10000 },
  { rank: "NEXUS ELITE", min: 10000, max: 99999 },
];

function getRank(xp) {
  return RANK_THRESHOLDS.findLast(r => xp >= r.min) || RANK_THRESHOLDS[0];
}

// ─────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────
const LS = {
  get: (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
};

// ─────────────────────────────────────────────
// FIRE CONFETTI
// ─────────────────────────────────────────────
function fireConfetti(diff) {
  const colors = diff === 'H'
    ? ['#ff00ff', '#ff69b4', '#ffffff']
    : diff === 'M'
    ? ['#ff6b00', '#ffff00', '#ffffff']
    : ['#00ff41', '#00f5ff', '#ffffff'];

  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors, scalar: 1.2 });
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 0 }, colors }), 300);
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 1 }, colors }), 450);
}

// ─────────────────────────────────────────────
// XP FLOATING TEXT
// ─────────────────────────────────────────────
function XPFloat({ xp, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -80, scale: 1.4 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onDone}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-[9998]"
      style={{ fontFamily: 'Orbitron, sans-serif', color: '#00ff41', textShadow: '0 0 20px #00ff41', fontSize: 32, fontWeight: 900 }}
    >
      +{xp} XP
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// POMODORO MODAL
// ─────────────────────────────────────────────
function PomodoroModal({ task, onClose }) {
  const storageKey = `pomo_${task.id}`;
  const initState = LS.get(storageKey, { seconds: POMODORO_WORK, running: false, isBreak: false, sessions: 0 });

  const [seconds, setSeconds] = useState(initState.seconds);
  const [running, setRunning] = useState(false); // always start paused on open
  const [isBreak, setIsBreak] = useState(initState.isBreak);
  const [sessions, setSessions] = useState(initState.sessions);
  const intervalRef = useRef(null);

  const total = isBreak ? POMODORO_BREAK : POMODORO_WORK;
  const pct = ((total - seconds) / total) * 100;

  const save = useCallback((s, r, b, sess) => {
    LS.set(storageKey, { seconds: s, running: r, isBreak: b, sessions: sess });
  }, [storageKey]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const nextBreak = !isBreak;
            const nextSec = nextBreak ? POMODORO_BREAK : POMODORO_WORK;
            const nextSess = !isBreak ? sessions + 1 : sessions;
            setIsBreak(nextBreak);
            setSessions(nextSess);
            save(nextSec, false, nextBreak, nextSess);
            return nextSec;
          }
          const nv = prev - 1;
          save(nv, true, isBreak, sessions);
          return nv;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isBreak, sessions, save]);

  // Save on close
  useEffect(() => {
    return () => { save(seconds, false, isBreak, sessions); };
  }, [seconds, isBreak, sessions, save]);

  const toggle = () => setRunning(r => !r);
  const reset = () => {
    setRunning(false);
    setSeconds(POMODORO_WORK);
    setIsBreak(false);
    setSessions(0);
    save(POMODORO_WORK, false, false, 0);
  };

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const cfg = DIFF_CONFIG[task.diff];
  const circumference = 2 * Math.PI * 90;
  const strokeDash = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: 'rgba(2, 5, 8, 0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative clip-corner"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #060d1a 100%)', border: `1px solid ${cfg.color}`, boxShadow: `0 0 30px ${cfg.color}40, 0 0 80px ${cfg.color}20`, padding: 40, minWidth: 380 }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-display text-xs tracking-widest mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="font-body font-bold text-lg text-white truncate max-w-xs mx-auto">{task.name}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">{task.subject} • {isBreak ? '☕ BREAK' : '⚡ FOCUS'}</div>
        </div>

        {/* Ring timer */}
        <div className="flex justify-center mb-6 relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="rotate-[-90deg]">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#1a2f4a" strokeWidth="6" />
            <motion.circle
              cx="100" cy="100" r="90" fill="none"
              stroke={cfg.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: strokeDash }}
              transition={{ duration: 0.5 }}
              style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-5xl font-black text-white" style={{ textShadow: `0 0 20px ${cfg.color}` }}>
              {mins}:{secs}
            </div>
            <div className="font-mono text-xs mt-1" style={{ color: cfg.color }}>SESSION {sessions + 1}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={toggle}
            className="clip-corner-sm flex items-center gap-2 px-6 py-3 font-display text-sm font-bold transition-all"
            style={{ background: running ? 'rgba(255,0,255,0.15)' : `${cfg.color}20`, border: `1px solid ${running ? '#ff00ff' : cfg.color}`, color: running ? '#ff00ff' : cfg.color, boxShadow: running ? '0 0 15px rgba(255,0,255,0.3)' : `0 0 15px ${cfg.color}40` }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'PAUSE' : 'ENGAGE'}
          </button>
          <button
            onClick={reset}
            className="clip-corner-sm px-4 py-3 text-gray-500 hover:text-white transition-colors border border-gray-700 hover:border-gray-500"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Sessions completed */}
        {sessions > 0 && (
          <div className="mt-4 text-center font-mono text-xs text-gray-500">
            {sessions} POMODORO{sessions !== 1 ? 'S' : ''} COMPLETE
          </div>
        )}

        {/* PYQ target */}
        {task.pyqs > 0 && (
          <div className="mt-3 text-center font-mono text-xs" style={{ color: cfg.color }}>
            TARGET: {task.pyqs} PYQs
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MISSION CARD
// ─────────────────────────────────────────────
function MissionCard({ task, onAnnihilate, onOpenTimer, onDelete }) {
  const cfg = DIFF_CONFIG[task.diff];
  const SubjectIcon = SUBJECT_CONFIG[task.subject]?.icon || BookOpen;
  const subjectColor = SUBJECT_CONFIG[task.subject]?.color || '#00f5ff';
  const hours = HOURS_MAP[task.diff];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className="clip-corner relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${cfg.bg}, rgba(10,22,40,0.95))`, border: `1px solid ${cfg.color}40`, boxShadow: `0 0 10px ${cfg.color}15` }}
    >
      {/* Accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Diff badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-display text-[9px] tracking-widest px-2 py-0.5 border" style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
              <span className="font-mono text-[9px] text-gray-600">{hours}H ESTIMATED</span>
            </div>
            <h3 className="font-body font-bold text-base text-white leading-tight">{task.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <SubjectIcon size={11} style={{ color: subjectColor }} />
              <span className="font-mono text-[10px]" style={{ color: subjectColor }}>{task.subject}</span>
              {task.pyqs > 0 && (
                <span className="font-mono text-[10px] text-gray-500">• {task.pyqs} PYQs</span>
              )}
            </div>
          </div>

          {/* XP badge */}
          <div className="flex-shrink-0 text-center">
            <div className="font-display text-xl font-black" style={{ color: cfg.color, textShadow: `0 0 10px ${cfg.color}` }}>
              {XP_MAP[task.diff]}
            </div>
            <div className="font-mono text-[9px] text-gray-600">XP</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onOpenTimer(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display tracking-wider transition-all clip-corner-sm"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}
          >
            <Clock size={12} /> POMODORO
          </button>
          <button
            onClick={() => onAnnihilate(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display tracking-wider transition-all clip-corner-sm flex-1"
            style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}80`, color: cfg.color, boxShadow: `0 0 8px ${cfg.color}20` }}
          >
            <Zap size={12} /> ANNIHILATE
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center px-2 py-1.5 text-gray-600 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-900 clip-corner-sm"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// REVISION NODE CARD
// ─────────────────────────────────────────────
function RevisionCard({ rev }) {
  const daysLeft = Math.ceil((rev.dueDate - Date.now()) / 86400000);
  const overdue = daysLeft < 0;
  const today = daysLeft <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="clip-corner-sm p-3"
      style={{ background: 'rgba(255,255,0,0.05)', border: `1px solid ${today || overdue ? '#ffff00' : '#2a3f5a'}40` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-yellow-400">⟳ MEMORY NODE</div>
          <div className="font-body text-sm text-white font-semibold truncate max-w-[160px]">{rev.chapterName}</div>
          <div className="font-mono text-[10px] text-gray-500">{rev.subject}</div>
        </div>
        <div className="text-right">
          {overdue ? (
            <div className="font-display text-xs text-red-400">OVERDUE!</div>
          ) : today ? (
            <div className="font-display text-xs text-yellow-400 animate-pulse">TODAY!</div>
          ) : (
            <div className="font-display text-xs text-gray-500">+{daysLeft}d</div>
          )}
          <div className="font-mono text-[9px] text-gray-600">Rev #{rev.revNum}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// SYLLABUS VAULT CHAPTER ITEM
// ─────────────────────────────────────────────
function ChapterItem({ chapter, isCompleted, delay }) {
  const cfg = DIFF_CONFIG[chapter.diff];

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: isCompleted ? 0.35 : 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-2 py-1.5 px-2 rounded relative group"
      style={{ background: isCompleted ? 'rgba(0,0,0,0.2)' : 'transparent' }}
    >
      {isCompleted ? (
        <CheckCircle size={12} className="flex-shrink-0" style={{ color: '#00ff41' }} />
      ) : (
        <div className="w-3 h-3 flex-shrink-0 border rounded-full" style={{ borderColor: cfg.color }} />
      )}
      <span
        className="font-body text-sm flex-1 relative"
        style={{
          color: isCompleted ? '#4a6080' : '#c0d8f0',
          textDecoration: isCompleted ? 'line-through' : 'none',
          textDecorationColor: '#ff00ff',
        }}
      >
        {chapter.name}
      </span>
      <span className="font-display text-[9px] px-1.5 py-0.5 border" style={{ color: cfg.color, borderColor: `${cfg.color}60`, background: cfg.bg, fontSize: 8 }}>
        {chapter.diff}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  // Persist state
  const [completedChapters, setCompletedChapters] = useState(() => LS.get('completed_chapters', []));
  const [totalXP, setTotalXP] = useState(() => LS.get('total_xp', 0));
  const [missions, setMissions] = useState(() => LS.get('missions', []));
  const [revisions, setRevisions] = useState(() => LS.get('revisions', []));

  // UI state
  const [activeTimer, setActiveTimer] = useState(null);
  const [xpFloat, setXpFloat] = useState(null);

  // Mission builder form
  const [form, setForm] = useState({ name: '', subject: 'Physics', diff: 'M', pyqs: 0 });

  // Persist to LS on change
  useEffect(() => { LS.set('completed_chapters', completedChapters); }, [completedChapters]);
  useEffect(() => { LS.set('total_xp', totalXP); }, [totalXP]);
  useEffect(() => { LS.set('missions', missions); }, [missions]);
  useEffect(() => { LS.set('revisions', revisions); }, [revisions]);

  const progressPct = (completedChapters.length / TOTAL_CHAPTERS) * 100;
  const rank = getRank(totalXP);
  const nextRank = RANK_THRESHOLDS.find(r => r.min > totalXP) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  const rankPct = Math.min(100, ((totalXP - rank.min) / (nextRank.min - rank.min)) * 100);

  // ── Add mission
  const addMission = () => {
    if (!form.name.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      ...form,
      pyqs: Number(form.pyqs) || 0,
      createdAt: Date.now(),
    };
    setMissions(prev => [newTask, ...prev]);
    setForm({ name: '', subject: 'Physics', diff: 'M', pyqs: 0 });
  };

  // ── Annihilate mission
  const annihilate = (task) => {
    const key = `${task.subject}::${task.name}`;
    if (completedChapters.includes(key)) return;

    // Remove from missions
    setMissions(prev => prev.filter(m => m.id !== task.id));

    // Mark complete
    setCompletedChapters(prev => [...prev, key]);

    // Award XP
    const xp = XP_MAP[task.diff] || 150;
    setTotalXP(prev => prev + xp);
    setXpFloat({ xp, id: Date.now() });

    // Schedule revisions
    const now = Date.now();
    const newRevs = [
      { id: `${task.id}_r1`, chapterName: task.name, subject: task.subject, dueDate: now + 1 * 86400000, revNum: 1 },
      { id: `${task.id}_r3`, chapterName: task.name, subject: task.subject, dueDate: now + 3 * 86400000, revNum: 2 },
      { id: `${task.id}_r7`, chapterName: task.name, subject: task.subject, dueDate: now + 7 * 86400000, revNum: 3 },
    ];
    setRevisions(prev => [...prev, ...newRevs]);

    // Clear timer state for this task
    localStorage.removeItem(`pomo_${task.id}`);

    // Fireworks!
    fireConfetti(task.diff);
  };

  const deleteTask = (id) => setMissions(prev => prev.filter(m => m.id !== id));

  // Sort chapters: completed go to bottom
  const getSortedChapters = (subject) => {
    const chapters = SYLLABUS[subject];
    const completed = chapters.filter(c => completedChapters.includes(`${subject}::${c.name}`));
    const pending = chapters.filter(c => !completedChapters.includes(`${subject}::${c.name}`));
    return [...pending, ...completed];
  };

  const upcomingRevisions = revisions
    .filter(r => !r.done)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 6);

  return (
    <div className="min-h-screen relative z-10 pb-20">
      {/* XP Float */}
      <AnimatePresence>
        {xpFloat && (
          <XPFloat key={xpFloat.id} xp={xpFloat.xp} onDone={() => setXpFloat(null)} />
        )}
      </AnimatePresence>

      {/* Timer Modal */}
      <AnimatePresence>
        {activeTimer && (
          <PomodoroModal task={activeTimer} onClose={() => setActiveTimer(null)} />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-[#1a2f4a]" style={{ background: 'rgba(5,10,14,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 clip-corner-sm flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.5)' }}>
              <Atom size={16} className="text-[#00f5ff]" />
            </div>
            <div>
              <div className="font-display text-sm font-black tracking-widest neon-text-cyan glitch">MHT-CET NEXUS</div>
              <div className="font-mono text-[9px] text-gray-600 tracking-widest">STUDY PROTOCOL v2.0</div>
            </div>
          </div>

          {/* XP + Rank */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-display text-[10px] tracking-widest text-gray-500">RANK</div>
              <div className="font-display text-sm font-black neon-text-magenta">{rank.rank}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-[10px] tracking-widest text-gray-500">TOTAL XP</div>
              <div className="font-display text-sm font-black neon-text-green">{totalXP.toLocaleString()}</div>
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] text-gray-600 mb-1">{completedChapters.length}/{TOTAL_CHAPTERS} CHAPTERS</div>
              <div className="w-24 h-1.5 rounded-full bg-[#1a2f4a] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: '#00ff41', boxShadow: '0 0 6px #00ff41' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* ══════════════════════════════════════════
            SECTION 1: TODAY'S MISSION BUILDER
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00f5ff, transparent)' }} />
            <span className="font-display text-xs tracking-widest neon-text-cyan">◈ TODAY&apos;S MISSION BUILDER</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00f5ff, transparent)' }} />
          </div>

          {/* Builder Panel */}
          <div className="clip-corner p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 20px rgba(0,245,255,0.05)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Chapter Name */}
              <div className="lg:col-span-2">
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">CHAPTER NAME</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMission()}
                  placeholder="e.g. Rotational Dynamics"
                  className="w-full px-3 py-2 font-mono text-sm text-white clip-corner-sm focus:outline-none"
                  style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', color: '#e0f0ff' }}
                />
              </div>

              {/* Subject */}
              <div>
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">SUBJECT</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 font-mono text-sm clip-corner-sm focus:outline-none"
                  style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', color: '#e0f0ff' }}
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">DIFFICULTY</label>
                <div className="flex gap-1.5">
                  {['E', 'M', 'H'].map(d => {
                    const dc = DIFF_CONFIG[d];
                    return (
                      <button
                        key={d}
                        onClick={() => setForm(f => ({ ...f, diff: d }))}
                        className="flex-1 py-2 font-display text-xs font-black clip-corner-sm transition-all"
                        style={{
                          background: form.diff === d ? `${dc.color}20` : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${form.diff === d ? dc.color : '#1a2f4a'}`,
                          color: form.diff === d ? dc.color : '#4a6080',
                          boxShadow: form.diff === d ? `0 0 8px ${dc.color}40` : 'none',
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PYQs + Add */}
              <div>
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">TARGET PYQs</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.pyqs}
                    onChange={e => setForm(f => ({ ...f, pyqs: e.target.value }))}
                    min="0"
                    className="w-16 px-2 py-2 font-mono text-sm text-center clip-corner-sm focus:outline-none"
                    style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', color: '#e0f0ff' }}
                  />
                  <button
                    onClick={addMission}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 font-display text-xs font-black tracking-wider clip-corner-sm transition-all"
                    style={{ background: 'rgba(0,245,255,0.15)', border: '1px solid rgba(0,245,255,0.6)', color: '#00f5ff', boxShadow: '0 0 12px rgba(0,245,255,0.2)' }}
                  >
                    <Plus size={14} /> DEPLOY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Cards */}
          <AnimatePresence mode="popLayout">
            {missions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 border border-dashed border-[#1a2f4a] rounded"
              >
                <Target size={32} className="mx-auto mb-3 text-gray-700" />
                <p className="font-mono text-sm text-gray-600">NO ACTIVE MISSIONS — DEPLOY YOUR FIRST TARGET</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {missions.map(task => (
                  <MissionCard
                    key={task.id}
                    task={task}
                    onAnnihilate={annihilate}
                    onOpenTimer={setActiveTimer}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 2: GLOBAL PROGRESS + RANK
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00ff41, transparent)' }} />
            <span className="font-display text-xs tracking-widest neon-text-green">◈ NEXUS CORE — GLOBAL PROGRESS</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00ff41, transparent)' }} />
          </div>

          <div className="clip-corner p-6" style={{ background: 'linear-gradient(135deg, #061a0f, #050a0e)', border: '1px solid rgba(0,255,65,0.25)', boxShadow: '0 0 30px rgba(0,255,65,0.08)' }}>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="font-display text-3xl font-black neon-text-green">{completedChapters.length}</div>
                <div className="font-mono text-[10px] text-gray-500 tracking-widest">ELIMINATED</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-black text-white">{TOTAL_CHAPTERS - completedChapters.length}</div>
                <div className="font-mono text-[10px] text-gray-500 tracking-widest">REMAINING</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-black neon-text-cyan">{Math.round(progressPct)}%</div>
                <div className="font-mono text-[10px] text-gray-500 tracking-widest">ANNIHILATED</div>
              </div>
            </div>

            {/* MAIN PROGRESS BAR */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display text-[10px] tracking-widest text-gray-500">SYLLABUS DOMINATION</span>
                <span className="font-mono text-xs neon-text-green">{completedChapters.length} / {TOTAL_CHAPTERS}</span>
              </div>
              <div className="relative h-8 rounded overflow-hidden" style={{ background: '#050f08', border: '1px solid rgba(0,255,65,0.2)' }}>
                {/* Segments */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: TOTAL_CHAPTERS }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-[#0a1e10]" />
                  ))}
                </div>
                {/* Fill */}
                <motion.div
                  className="absolute left-0 top-0 h-full rounded"
                  style={{ background: 'linear-gradient(90deg, #00ff41, #00f5ff)', boxShadow: '0 0 15px rgba(0,255,65,0.8), 0 0 40px rgba(0,255,65,0.4)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                {/* Sweep effect */}
                <motion.div
                  className="absolute top-0 h-full w-8"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
                  animate={{ left: [`${progressPct - 5}%`, `${progressPct + 2}%`] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-xs font-black text-white mix-blend-difference" style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
                    {Math.round(progressPct)}% DOMINANCE
                  </span>
                </div>
              </div>
            </div>

            {/* RANK PROGRESS BAR */}
            <div className="mt-4 pt-4 border-t border-[#1a2f4a]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-[#ff00ff]" />
                  <span className="font-display text-xs font-black neon-text-magenta">{rank.rank}</span>
                </div>
                <span className="font-mono text-xs text-gray-500">{totalXP} / {nextRank.min} XP → {nextRank.rank}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0a0810', border: '1px solid rgba(255,0,255,0.2)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #ff00ff, #ff69b4)', boxShadow: '0 0 10px rgba(255,0,255,0.8)' }}
                  animate={{ width: `${rankPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 2.5: REVISION NODES (if any)
        ══════════════════════════════════════════ */}
        {upcomingRevisions.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ffff00, transparent)' }} />
              <span className="font-display text-xs tracking-widest" style={{ color: '#ffff00', textShadow: '0 0 10px #ffff00' }}>◈ MEMORY HACK NODES</span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ffff00, transparent)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcomingRevisions.map(rev => <RevisionCard key={rev.id} rev={rev} />)}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════
            SECTION 3: SYLLABUS VAULT
        ══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ff00ff, transparent)' }} />
            <span className="font-display text-xs tracking-widest neon-text-magenta">◈ THE SYLLABUS VAULT</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ff00ff, transparent)' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(SYLLABUS).map(([subject]) => {
              const scfg = SUBJECT_CONFIG[subject];
              const SubIcon = scfg.icon;
              const sorted = getSortedChapters(subject);
              const subjectCompleted = sorted.filter(c => completedChapters.includes(`${subject}::${c.name}`)).length;
              const subjectTotal = sorted.length;
              const subjectPct = (subjectCompleted / subjectTotal) * 100;

              return (
                <motion.div
                  key={subject}
                  layout
                  className="clip-corner overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: `1px solid ${scfg.color}25`, boxShadow: `0 0 15px ${scfg.color}08` }}
                >
                  {/* Subject Header */}
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${scfg.color}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <SubIcon size={18} style={{ color: scfg.color, filter: `drop-shadow(0 0 6px ${scfg.color})` }} />
                      <span className="font-display text-sm font-black tracking-widest" style={{ color: scfg.color, textShadow: `0 0 10px ${scfg.color}` }}>
                        {scfg.label}
                      </span>
                    </div>
                    {/* Subject mini bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: scfg.color, boxShadow: `0 0 6px ${scfg.color}` }}
                          animate={{ width: `${subjectPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: scfg.color }}>{subjectCompleted}/{subjectTotal}</span>
                    </div>
                  </div>

                  {/* Chapters */}
                  <div className="px-2 py-2 space-y-0.5">
                    <AnimatePresence>
                      {sorted.map((chapter, i) => {
                        const isCompleted = completedChapters.includes(`${subject}::${chapter.name}`);
                        return (
                          <ChapterItem
                            key={chapter.name}
                            chapter={chapter}
                            isCompleted={isCompleted}
                            delay={i * 0.03}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center py-6">
          <div className="font-mono text-[10px] text-gray-700 tracking-widest">
            MHT-CET NEXUS • {TOTAL_CHAPTERS} CHAPTERS • 10-DAY PROTOCOL • ALL SYSTEMS OPERATIONAL
          </div>
          <div className="font-mono text-[9px] text-gray-800 mt-1">
            PERSISTENCE: localStorage • TIMER: Ironclad • XP: Real-time
          </div>
        </footer>
      </div>
    </div>
  );
}
