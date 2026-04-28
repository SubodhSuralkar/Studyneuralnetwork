import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap, Target, Shield, Sword, Clock, CheckCircle,
  ChevronDown, Plus, Trash2, Play, Pause, RotateCcw,
  Award, AlertTriangle, BookOpen, Atom, FlaskConical,
  Calculator, X, Brain, Activity, Flame, Timer,
  Radio, Crosshair, Skull, Eye, EyeOff
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

const TOTAL_CHAPTERS = Object.values(SYLLABUS).flat().length;

const XP_MAP = { H: 500, M: 300, E: 150 };
const HOURS_MAP = { H: 5, M: 3, E: 1.5 };
const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;
const COMBO_WINDOW_MS = 4 * 60 * 1000; // 4 minutes
const VIGILANCE_IDLE_MS = 10 * 60 * 1000; // 10 minutes idle = warning
const VIGILANCE_ABORT_MS = 60 * 1000; // 60 seconds to re-sync

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

const TIMER_PRESETS = [
  { label: '25m', seconds: 25 * 60 },
  { label: '50m', seconds: 50 * 60 },
  { label: '120m', seconds: 120 * 60 },
];

const COMBO_MULTIPLIERS = [1, 2, 5, 10, 20, 50];

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
// CONFETTI HELPERS
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

function fireNeuralConfetti() {
  const colors = ['#00f5ff', '#00ff41', '#ffffff', '#7fff00'];
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors, scalar: 1.5 });
  setTimeout(() => confetti({ particleCount: 80, angle: 110, spread: 70, origin: { x: 0 }, colors }), 200);
  setTimeout(() => confetti({ particleCount: 80, angle: 70, spread: 70, origin: { x: 1 }, colors }), 350);
}

// ─────────────────────────────────────────────
// WEB AUDIO — synthetic "lock-in" sound
// ─────────────────────────────────────────────
function playNeuralSync() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur, type = 'sine') => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0.3, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur);
    };
    play(220, 0, 0.12); play(440, 0.1, 0.12); play(880, 0.2, 0.15);
    play(1760, 0.32, 0.25, 'square'); play(880, 0.5, 0.4);
  } catch {}
}

function playComboShatter() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const noise = ctx.createOscillator();
    const g = ctx.createGain();
    noise.connect(g); g.connect(ctx.destination);
    noise.type = 'sawtooth'; noise.frequency.setValueAtTime(200, ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.start(); noise.stop(ctx.currentTime + 0.4);
  } catch {}
}

// ─────────────────────────────────────────────
// XP FLOATING TEXT
// ─────────────────────────────────────────────
function XPFloat({ xp, bonus, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -100, scale: 1.6 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      onAnimationComplete={onDone}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-[9998] text-center"
    >
      <div style={{ fontFamily: 'Orbitron, sans-serif', color: bonus ? '#ffff00' : '#00ff41', textShadow: `0 0 20px ${bonus ? '#ffff00' : '#00ff41'}`, fontSize: 36, fontWeight: 900 }}>
        +{xp} XP
      </div>
      {bonus && (
        <div style={{ fontFamily: 'Orbitron, sans-serif', color: '#ff6b00', textShadow: '0 0 15px #ff6b00', fontSize: 18, fontWeight: 700 }}>
          ⚡ VELOCITY BONUS!
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// VIGILANCE WARNING OVERLAY
// ─────────────────────────────────────────────
function VigilanceOverlay({ countdown, onResync }) {
  const urgency = countdown < 20;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9995] flex items-center justify-center"
      style={{ background: 'rgba(10,0,0,0.88)', backdropFilter: 'blur(4px)' }}
    >
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.04) 2px, rgba(255,0,0,0.04) 4px)',
      }} />

      <motion.div
        animate={urgency ? { x: [-4, 4, -4, 4, 0], transition: { repeat: Infinity, duration: 0.15 } } : {}}
        className="relative text-center px-12 py-10 clip-corner"
        style={{ background: 'linear-gradient(135deg, #1a0000, #0a0000)', border: '2px solid #ff0000', boxShadow: '0 0 60px rgba(255,0,0,0.5), 0 0 120px rgba(255,0,0,0.2)' }}
      >
        <div className="flex justify-center mb-4">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
            <AlertTriangle size={48} color="#ff0000" />
          </motion.div>
        </div>
        <div className="font-display text-2xl font-black text-red-500 tracking-widest mb-2" style={{ textShadow: '0 0 20px #ff0000' }}>
          ⚠ SYSTEM FAILING
        </div>
        <div className="font-mono text-sm text-red-300 mb-2">NEURAL LINK DEGRADATION DETECTED</div>
        <div className="font-mono text-xs text-gray-500 mb-6">No activity detected — focus protocol compromised</div>

        <div className="font-display text-6xl font-black mb-6" style={{ color: countdown < 20 ? '#ff0000' : '#ff6b00', textShadow: `0 0 30px ${countdown < 20 ? '#ff0000' : '#ff6b00'}` }}>
          {countdown}s
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onResync}
          className="clip-corner px-8 py-4 font-display text-sm font-black tracking-widest"
          style={{ background: 'rgba(0,245,255,0.15)', border: '2px solid #00f5ff', color: '#00f5ff', boxShadow: '0 0 30px rgba(0,245,255,0.4)', animation: 'pulse 1s ease-in-out infinite' }}
        >
          <Radio size={16} className="inline mr-2" />
          RE-SYNC NEURAL LINK
        </motion.button>

        <div className="mt-4 font-mono text-[10px] text-red-900">
          FAILURE TO COMPLY → MISSION ABORTED
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// TIMER COMMAND CENTER MODAL
// ─────────────────────────────────────────────
function TimerModal({ task, onClose, onTimerStateChange, vigilanceMode }) {
  const storageKey = `timer_${task.id}`;
  const initState = LS.get(storageKey, { seconds: POMODORO_WORK, totalSeconds: POMODORO_WORK, running: false, isBreak: false, sessions: 0 });

  const [seconds, setSeconds] = useState(initState.seconds);
  const [totalSeconds, setTotalSeconds] = useState(initState.totalSeconds);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(initState.isBreak);
  const [sessions, setSessions] = useState(initState.sessions);
  const [customInput, setCustomInput] = useState('');

  // Vigilance state
  const [vigilanceWarning, setVigilanceWarning] = useState(false);
  const [vigilanceCountdown, setVigilanceCountdown] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const vigilanceIntervalRef = useRef(null);
  const vigilanceCountdownRef = useRef(null);
  const intervalRef = useRef(null);

  const pct = ((totalSeconds - seconds) / totalSeconds) * 100;

  const save = useCallback((s, ts, r, b, sess) => {
    LS.set(storageKey, { seconds: s, totalSeconds: ts, running: r, isBreak: b, sessions: sess });
  }, [storageKey]);

  // Notify parent about timer running state
  useEffect(() => {
    onTimerStateChange?.(running);
  }, [running, onTimerStateChange]);

  // Main countdown
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const nextBreak = !isBreak;
            const nextTotal = nextBreak ? POMODORO_BREAK : POMODORO_WORK;
            const nextSess = !isBreak ? sessions + 1 : sessions;
            setIsBreak(nextBreak);
            setTotalSeconds(nextTotal);
            setSessions(nextSess);
            save(nextTotal, nextTotal, false, nextBreak, nextSess);
            return nextTotal;
          }
          const nv = prev - 1;
          save(nv, totalSeconds, true, isBreak, sessions);
          return nv;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isBreak, sessions, totalSeconds, save]);

  // Vigilance monitor
  useEffect(() => {
    if (!vigilanceMode || !running) {
      clearInterval(vigilanceIntervalRef.current);
      clearInterval(vigilanceCountdownRef.current);
      return;
    }
    lastActivityRef.current = Date.now();
    vigilanceIntervalRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= VIGILANCE_IDLE_MS && !vigilanceWarning) {
        setVigilanceWarning(true);
        setVigilanceCountdown(60);
        // Start abort countdown
        vigilanceCountdownRef.current = setInterval(() => {
          setVigilanceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(vigilanceCountdownRef.current);
              // ABORT
              setRunning(false);
              setSeconds(totalSeconds);
              setVigilanceWarning(false);
              save(totalSeconds, totalSeconds, false, isBreak, sessions);
              return 60;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);
    return () => {
      clearInterval(vigilanceIntervalRef.current);
      clearInterval(vigilanceCountdownRef.current);
    };
  }, [vigilanceMode, running, vigilanceWarning, totalSeconds, isBreak, sessions, save]);

  const recordActivity = () => {
    lastActivityRef.current = Date.now();
  };

  const handleResync = () => {
    clearInterval(vigilanceCountdownRef.current);
    setVigilanceWarning(false);
    lastActivityRef.current = Date.now();
    fireNeuralConfetti();
    playNeuralSync();
  };

  useEffect(() => {
    return () => { save(seconds, totalSeconds, false, isBreak, sessions); };
  }, [seconds, totalSeconds, isBreak, sessions, save]);

  const toggle = () => {
    recordActivity();
    setRunning(r => !r);
  };

  const applyPreset = (presetSeconds) => {
    recordActivity();
    setRunning(false);
    setSeconds(presetSeconds);
    setTotalSeconds(presetSeconds);
    setIsBreak(false);
    save(presetSeconds, presetSeconds, false, false, sessions);
  };

  const applyCustom = () => {
    const mins = parseInt(customInput);
    if (!mins || mins < 1 || mins > 300) return;
    applyPreset(mins * 60);
    setCustomInput('');
  };

  const reset = () => {
    recordActivity();
    setRunning(false);
    setSeconds(POMODORO_WORK);
    setTotalSeconds(POMODORO_WORK);
    setIsBreak(false);
    setSessions(0);
    save(POMODORO_WORK, POMODORO_WORK, false, false, 0);
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
      <AnimatePresence>
        {vigilanceWarning && (
          <VigilanceOverlay countdown={vigilanceCountdown} onResync={handleResync} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative clip-corner"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #060d1a 100%)', border: `1px solid ${cfg.color}`, boxShadow: `0 0 30px ${cfg.color}40, 0 0 80px ${cfg.color}20`, padding: 40, minWidth: 400 }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="font-display text-[10px] tracking-widest mb-1" style={{ color: cfg.color }}>TIMER COMMAND CENTER</div>
          <div className="font-body font-bold text-lg text-white truncate max-w-xs mx-auto">{task.name}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">{task.subject} • {isBreak ? '☕ BREAK' : '⚡ FOCUS'}</div>
          {vigilanceMode && running && (
            <div className="mt-1 flex items-center justify-center gap-1">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Eye size={10} color="#00ff41" />
              </motion.div>
              <span className="font-mono text-[9px] text-green-500">VIGILANCE ACTIVE</span>
            </div>
          )}
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2 mb-4 justify-center">
          {TIMER_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.seconds)}
              className="clip-corner-sm px-4 py-1.5 font-display text-xs font-black tracking-wider transition-all"
              style={{ background: 'rgba(0,245,255,0.08)', border: `1px solid rgba(0,245,255,0.3)`, color: '#00f5ff' }}
            >
              {p.label}
            </button>
          ))}
          {/* Custom */}
          <div className="flex gap-1">
            <input
              type="number"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCustom()}
              placeholder="min"
              className="w-14 px-2 py-1.5 font-mono text-xs text-center clip-corner-sm focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,0,0.3)', color: '#ff6b00' }}
            />
            <button
              onClick={applyCustom}
              className="clip-corner-sm px-2 py-1.5 font-display text-xs"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.4)', color: '#ff6b00' }}
            >
              SET
            </button>
          </div>
        </div>

        {/* Ring timer */}
        <div className="flex justify-center mb-5 relative">
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            className="clip-corner-sm flex items-center gap-2 px-6 py-3 font-display text-sm font-bold transition-all"
            style={{ background: running ? 'rgba(255,0,255,0.15)' : `${cfg.color}20`, border: `1px solid ${running ? '#ff00ff' : cfg.color}`, color: running ? '#ff00ff' : cfg.color, boxShadow: running ? '0 0 15px rgba(255,0,255,0.3)' : `0 0 15px ${cfg.color}40` }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'PAUSE' : 'ENGAGE'}
          </motion.button>
          <button
            onClick={reset}
            className="clip-corner-sm px-4 py-3 text-gray-500 hover:text-white transition-colors border border-gray-700 hover:border-gray-500"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {sessions > 0 && (
          <div className="mt-4 text-center font-mono text-xs text-gray-500">
            {sessions} POMODORO{sessions !== 1 ? 'S' : ''} COMPLETE
          </div>
        )}
        {task.pyqs > 0 && (
          <div className="mt-2 text-center font-mono text-xs" style={{ color: cfg.color }}>
            TARGET: {task.pyqs} PYQs
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// COMBO COUNTER (per-mission)
// ─────────────────────────────────────────────
function useCombo(missionId) {
  const [combo, setCombo] = useState(0); // index into COMBO_MULTIPLIERS
  const [solved, setSolved] = useState(() => LS.get(`solved_${missionId}`, 0));
  const windowRef = useRef(null);
  const [comboExpired, setComboExpired] = useState(false);

  const currentMultiplier = COMBO_MULTIPLIERS[Math.min(combo, COMBO_MULTIPLIERS.length - 1)];

  const increment = useCallback(() => {
    setSolved(prev => {
      const nv = prev + 1;
      LS.set(`solved_${missionId}`, nv);
      return nv;
    });

    // If there's an active window, increment combo
    if (windowRef.current) {
      clearTimeout(windowRef.current);
      setCombo(prev => Math.min(prev + 1, COMBO_MULTIPLIERS.length - 1));
    } else {
      // First increment — no combo yet, just start window
      setCombo(0);
    }

    setComboExpired(false);
    // Start/reset the 4-minute window
    windowRef.current = setTimeout(() => {
      windowRef.current = null;
      // Combo shatters
      playComboShatter();
      setComboExpired(true);
      setTimeout(() => {
        setCombo(0);
        setComboExpired(false);
      }, 1200);
    }, COMBO_WINDOW_MS);
  }, [missionId]);

  return { combo, solved, currentMultiplier, increment, comboExpired };
}

// ─────────────────────────────────────────────
// MISSION CARD (with Velocity Streak)
// ─────────────────────────────────────────────
function MissionCard({ task, onAnnihilate, onOpenTimer, onDelete, timerRunning }) {
  const cfg = DIFF_CONFIG[task.diff];
  const SubjectIcon = SUBJECT_CONFIG[task.subject]?.icon || BookOpen;
  const subjectColor = SUBJECT_CONFIG[task.subject]?.color || '#00f5ff';
  const hours = HOURS_MAP[task.diff];
  const { combo, solved, currentMultiplier, increment, comboExpired } = useCombo(task.id);

  const targetPyqs = task.pyqs || 0;
  const canAnnihilate = targetPyqs === 0 || solved >= targetPyqs;
  const isOverheat = combo >= 4; // 5x or higher

  // Glow intensity based on combo
  const glowIntensity = combo === 0 ? 0.15 : Math.min(1, 0.15 + combo * 0.17);
  const borderGlow = combo === 0
    ? `${cfg.color}40`
    : `0 0 ${10 + combo * 8}px ${cfg.color}, 0 0 ${20 + combo * 15}px ${cfg.color}60`;

  const cardBorder = combo > 0
    ? `${cfg.color}`
    : `${cfg.color}40`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={comboExpired ? {
        x: [-6, 6, -6, 6, -4, 4, 0],
        transition: { duration: 0.5 }
      } : { opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className="clip-corner relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${cfg.bg}, rgba(10,22,40,0.95))`,
        border: `1px solid ${cardBorder}`,
        boxShadow: combo > 0 ? borderGlow : `0 0 10px ${cfg.color}15`,
        opacity: timerRunning ? 0.6 : 1,
        transition: 'opacity 0.4s, box-shadow 0.3s, border-color 0.3s',
      }}
    >
      {/* Accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cfg.color, boxShadow: `0 0 ${8 + combo * 4}px ${cfg.color}` }} />

      {/* Overheat flame pulse */}
      {isOverheat && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.08, 0.22, 0.08] }}
          transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(ellipse at center, ${cfg.color}44, transparent 70%)` }}
        />
      )}

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-display text-[9px] tracking-widest px-2 py-0.5 border" style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
              <span className="font-mono text-[9px] text-gray-600">{hours}H EST.</span>
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

          {/* XP + Combo column */}
          <div className="flex-shrink-0 text-center">
            <div className="font-display text-xl font-black" style={{ color: cfg.color, textShadow: `0 0 10px ${cfg.color}` }}>
              {XP_MAP[task.diff]}
            </div>
            <div className="font-mono text-[9px] text-gray-600">XP</div>

            {/* Combo badge */}
            {combo > 0 && (
              <motion.div
                key={combo}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-1"
              >
                <div className="font-display text-xs font-black" style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>
                  {currentMultiplier}x
                </div>
                <div className="font-mono text-[8px] text-yellow-600 flex items-center gap-0.5">
                  {isOverheat ? <><Flame size={8} className="text-orange-400" />HOT</> : 'COMBO'}
                </div>
              </motion.div>
            )}
            {comboExpired && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0, opacity: 0 }}
                className="font-display text-[10px] text-red-500 font-black"
              >
                SHATTER
              </motion.div>
            )}
          </div>
        </div>

        {/* PYQ progress + increment */}
        {targetPyqs > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
                animate={{ width: `${Math.min(100, (solved / targetPyqs) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="font-mono text-[10px]" style={{ color: cfg.color }}>{solved}/{targetPyqs}</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={increment}
              className="clip-corner-sm px-2 py-1 font-display text-[10px] font-black"
              style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}60`, color: cfg.color }}
            >
              +1
            </motion.button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onOpenTimer(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display tracking-wider transition-all clip-corner-sm"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}
          >
            <Clock size={12} /> TIMER
          </button>
          <motion.button
            whileTap={canAnnihilate ? { scale: 0.95 } : {}}
            onClick={() => canAnnihilate && onAnnihilate(task, combo, currentMultiplier)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-display tracking-wider transition-all clip-corner-sm flex-1"
            style={{
              background: canAnnihilate ? `${cfg.color}18` : 'rgba(30,30,30,0.4)',
              border: `1px solid ${canAnnihilate ? `${cfg.color}80` : '#2a3a2a'}`,
              color: canAnnihilate ? cfg.color : '#3a4a3a',
              boxShadow: canAnnihilate ? `0 0 8px ${cfg.color}20` : 'none',
              cursor: canAnnihilate ? 'pointer' : 'not-allowed',
            }}
          >
            <Zap size={12} />
            {canAnnihilate ? (combo > 0 ? '⚡ VELOCITY ANNIHILATE' : 'ANNIHILATE') : `LOCKED (${solved}/${targetPyqs})`}
          </motion.button>
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
// REVISION CARD
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
// CHAPTER ITEM (Syllabus Vault)
// ─────────────────────────────────────────────
function ChapterItem({ chapter, isCompleted, delay }) {
  const cfg = DIFF_CONFIG[chapter.diff];
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: isCompleted ? 0.35 : 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-2 py-1.5 px-2 rounded"
      style={{ background: isCompleted ? 'rgba(0,0,0,0.2)' : 'transparent' }}
    >
      {isCompleted ? (
        <CheckCircle size={12} className="flex-shrink-0" style={{ color: '#00ff41' }} />
      ) : (
        <div className="w-3 h-3 flex-shrink-0 border rounded-full" style={{ borderColor: cfg.color }} />
      )}
      <span
        className="font-body text-sm flex-1"
        style={{ color: isCompleted ? '#4a6080' : '#c0d8f0', textDecoration: isCompleted ? 'line-through' : 'none', textDecorationColor: '#ff00ff' }}
      >
        {chapter.name}
      </span>
      <span className="font-display px-1.5 py-0.5 border" style={{ color: cfg.color, borderColor: `${cfg.color}60`, background: cfg.bg, fontSize: 8 }}>
        {chapter.diff}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// IGNITION SWITCH (Emergency Override)
// ─────────────────────────────────────────────
function IgnitionSwitch({ onIgnite }) {
  const [armed, setArmed] = useState(false);
  return (
    <motion.div
      className="relative"
      animate={armed ? { x: [-2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      {!armed ? (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setArmed(true)}
          className="w-full clip-corner flex items-center justify-center gap-3 py-3 px-6 font-display text-sm font-black tracking-widest"
          style={{
            background: 'linear-gradient(135deg, rgba(255,0,0,0.15), rgba(139,0,0,0.2))',
            border: '1px solid #ff0000',
            color: '#ff4444',
            boxShadow: '0 0 20px rgba(255,0,0,0.3), 0 0 40px rgba(255,0,0,0.1)',
          }}
        >
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            <AlertTriangle size={18} />
          </motion.div>
          ⚠️ OVERRIDE: DISTRACTED — INITIATE MICRO-MISSION
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.6 }}>
            <AlertTriangle size={18} />
          </motion.div>
        </motion.button>
      ) : (
        <div className="clip-corner flex items-center gap-3 py-3 px-5" style={{ background: 'rgba(139,0,0,0.3)', border: '2px solid #ff0000', boxShadow: '0 0 30px rgba(255,0,0,0.5)' }}>
          <Skull size={16} color="#ff4444" />
          <span className="font-display text-xs text-red-400 flex-1">CONFIRM OVERRIDE?</span>
          <button
            onClick={() => { onIgnite(); setArmed(false); }}
            className="clip-corner-sm px-4 py-1.5 font-display text-xs font-black text-white"
            style={{ background: '#ff0000', boxShadow: '0 0 12px #ff000080' }}
          >
            INITIATE
          </button>
          <button
            onClick={() => setArmed(false)}
            className="clip-corner-sm px-3 py-1.5 font-display text-xs text-gray-400 border border-gray-700"
          >
            ABORT
          </button>
        </div>
      )}
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
  const [timerRunning, setTimerRunning] = useState(false);
  const [vigilanceMode, setVigilanceMode] = useState(() => LS.get('vigilance_mode', false));

  // Mission builder — chapter selected by dropdown, not free text
  const getDefaultChapter = (subject, completed) => {
    const available = SYLLABUS[subject].filter(c => !completed.includes(`${subject}::${c.name}`));
    return available[0] || null;
  };
  const [form, setForm] = useState(() => {
    const saved = LS.get('completed_chapters', []);
    const defaultChapter = getDefaultChapter('Physics', saved);
    return {
      subject: 'Physics',
      chapterName: defaultChapter?.name || '',
      diff: defaultChapter?.diff || 'M',
      pyqs: 0,
    };
  });

  // Persist
  useEffect(() => { LS.set('completed_chapters', completedChapters); }, [completedChapters]);
  useEffect(() => { LS.set('total_xp', totalXP); }, [totalXP]);
  useEffect(() => { LS.set('missions', missions); }, [missions]);
  useEffect(() => { LS.set('revisions', revisions); }, [revisions]);
  useEffect(() => { LS.set('vigilance_mode', vigilanceMode); }, [vigilanceMode]);

  const progressPct = (completedChapters.length / TOTAL_CHAPTERS) * 100;
  const rank = getRank(totalXP);
  const nextRank = RANK_THRESHOLDS.find(r => r.min > totalXP) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  const rankPct = Math.min(100, ((totalXP - rank.min) / (Math.max(nextRank.min, rank.min + 1) - rank.min)) * 100);

  // Add mission — uses exact chapterName from syllabus
  const addMission = () => {
    if (!form.chapterName) return;
    // Prevent duplicate active missions for same chapter
    const alreadyQueued = missions.some(m => m.subject === form.subject && m.name === form.chapterName);
    if (alreadyQueued) return;
    const newTask = {
      id: Date.now().toString(),
      name: form.chapterName,          // exact string from SYLLABUS
      subject: form.subject,
      diff: form.diff,
      pyqs: Number(form.pyqs) || 0,
      createdAt: Date.now(),
    };
    setMissions(prev => [newTask, ...prev]);
    // Reset: pick next available chapter in same subject
    const nextAvailable = SYLLABUS[form.subject].find(
      c => !completedChapters.includes(`${form.subject}::${c.name}`) && c.name !== form.chapterName
    );
    setForm(f => ({
      ...f,
      chapterName: nextAvailable?.name || '',
      diff: nextAvailable?.diff || 'M',
      pyqs: 0,
    }));
  };

  // Ignition — Emergency Micro-Mission
  const ignite = () => {
    const subjects = Object.keys(SYLLABUS);
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const microTask = {
      id: `micro_${Date.now()}`,
      name: `⚡ MICRO-MISSION: 1 PYQ NOW`,
      subject,
      diff: 'E',
      pyqs: 1,
      isMicro: true,
      createdAt: Date.now(),
    };
    setMissions(prev => [microTask, ...prev]);
    // Auto-open a 5-minute timer for this micro-mission
    const timerTask = { ...microTask, _customSeconds: 5 * 60 };
    setActiveTimer(timerTask);
  };

  // Annihilate mission (with combo bonus)
  const annihilate = (task, combo, multiplier) => {
    const key = `${task.subject}::${task.name}`;
    setMissions(prev => prev.filter(m => m.id !== task.id));

    // Mark complete only for real chapters (not micro-missions)
    if (!task.isMicro && !completedChapters.includes(key)) {
      setCompletedChapters(prev => [...prev, key]);
    }

    const baseXP = XP_MAP[task.diff] || 150;
    const bonusActive = combo > 0;
    const xpAwarded = bonusActive ? Math.round(baseXP * multiplier) : baseXP;
    setTotalXP(prev => prev + xpAwarded);
    setXpFloat({ xp: xpAwarded, bonus: bonusActive, id: Date.now() });

    // Revisions for real chapters
    if (!task.isMicro) {
      const now = Date.now();
      const newRevs = [
        { id: `${task.id}_r1`, chapterName: task.name, subject: task.subject, dueDate: now + 86400000, revNum: 1 },
        { id: `${task.id}_r3`, chapterName: task.name, subject: task.subject, dueDate: now + 3 * 86400000, revNum: 2 },
        { id: `${task.id}_r7`, chapterName: task.name, subject: task.subject, dueDate: now + 7 * 86400000, revNum: 3 },
      ];
      setRevisions(prev => [...prev, ...newRevs]);
    }

    localStorage.removeItem(`timer_${task.id}`);
    localStorage.removeItem(`solved_${task.id}`);
    fireConfetti(task.diff);
  };

  const deleteTask = (id) => {
    setMissions(prev => prev.filter(m => m.id !== id));
    localStorage.removeItem(`timer_${id}`);
    localStorage.removeItem(`solved_${id}`);
  };

  const getSortedChapters = (subject) => {
    const chapters = SYLLABUS[subject];
    const completed = chapters.filter(c => completedChapters.includes(`${subject}::${c.name}`));
    const pending = chapters.filter(c => !completedChapters.includes(`${subject}::${c.name}`));
    return [...pending, ...completed];
  };

  const upcomingRevisions = revisions.filter(r => !r.done).sort((a, b) => a.dueDate - b.dueDate).slice(0, 6);

  return (
    <div className="min-h-screen relative z-10 pb-20">
      {/* XP Float */}
      <AnimatePresence>
        {xpFloat && <XPFloat key={xpFloat.id} xp={xpFloat.xp} bonus={xpFloat.bonus} onDone={() => setXpFloat(null)} />}
      </AnimatePresence>

      {/* Timer Modal */}
      <AnimatePresence>
        {activeTimer && (
          <TimerModal
            task={activeTimer}
            onClose={() => { setActiveTimer(null); setTimerRunning(false); }}
            onTimerStateChange={setTimerRunning}
            vigilanceMode={vigilanceMode}
          />
        )}
      </AnimatePresence>

      {/* Focus Mode Overlay — dims background when timer is running */}
      <AnimatePresence>
        {timerRunning && !activeTimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'brightness(0.7)' }}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-[#1a2f4a]" style={{ background: 'rgba(5,10,14,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 clip-corner-sm flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.5)' }}>
              <Atom size={16} className="text-[#00f5ff]" />
            </div>
            <div>
              <div className="font-display text-sm font-black tracking-widest neon-text-cyan">MHT-CET NEXUS</div>
              <div className="font-mono text-[9px] text-gray-600 tracking-widest">NEURO-WARFARE v3.0</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Vigilance Toggle */}
            <button
              onClick={() => setVigilanceMode(v => !v)}
              className="clip-corner-sm flex items-center gap-1.5 px-3 py-1.5 font-display text-[10px] font-black tracking-wider transition-all"
              style={{
                background: vigilanceMode ? 'rgba(0,255,65,0.12)' : 'rgba(30,30,30,0.5)',
                border: `1px solid ${vigilanceMode ? '#00ff41' : '#2a3f2a'}`,
                color: vigilanceMode ? '#00ff41' : '#3a5a3a',
                boxShadow: vigilanceMode ? '0 0 10px rgba(0,255,65,0.3)' : 'none',
              }}
            >
              {vigilanceMode ? <Eye size={11} /> : <EyeOff size={11} />}
              VIGILANCE
            </button>

            <div className="text-right hidden sm:block">
              <div className="font-display text-[10px] tracking-widest text-gray-500">RANK</div>
              <div className="font-display text-sm font-black neon-text-magenta">{rank.rank}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-[10px] tracking-widest text-gray-500">TOTAL XP</div>
              <div className="font-display text-sm font-black neon-text-green">{totalXP.toLocaleString()}</div>
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] text-gray-600 mb-1">{completedChapters.length}/{TOTAL_CHAPTERS}</div>
              <div className="w-24 h-1.5 rounded-full bg-[#1a2f4a] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: '#00ff41', boxShadow: '0 0 6px #00ff41' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* ── IGNITION SWITCH ── */}
        <IgnitionSwitch onIgnite={ignite} />

        {/* ══════════════════════════════════════════
            SECTION 1: MISSION BUILDER
        ══════════════════════════════════════════ */}
        <section style={{ opacity: timerRunning ? 0.5 : 1, transition: 'opacity 0.4s', pointerEvents: timerRunning ? 'none' : 'auto' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00f5ff, transparent)' }} />
            <span className="font-display text-xs tracking-widest neon-text-cyan">◈ TODAY&apos;S MISSION BUILDER</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00f5ff, transparent)' }} />
          </div>

          <div className="clip-corner p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: '1px solid rgba(0,245,255,0.2)' }}>
            {/* Dropdown row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

              {/* ── Dropdown 1: Subject ── */}
              <div className="lg:col-span-1">
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">TARGET SUBJECT</label>
                <div className="relative">
                  <select
                    value={form.subject}
                    onChange={e => {
                      const subj = e.target.value;
                      const firstAvail = SYLLABUS[subj].find(
                        c => !completedChapters.includes(`${subj}::${c.name}`)
                      );
                      setForm(f => ({
                        ...f,
                        subject: subj,
                        chapterName: firstAvail?.name || '',
                        diff: firstAvail?.diff || 'M',
                      }));
                    }}
                    className="w-full px-3 py-2 font-mono text-sm clip-corner-sm focus:outline-none appearance-none pr-8"
                    style={{
                      background: 'rgba(0,245,255,0.06)',
                      border: `1px solid ${SUBJECT_CONFIG[form.subject]?.color || '#00f5ff'}60`,
                      color: SUBJECT_CONFIG[form.subject]?.color || '#00f5ff',
                      boxShadow: `0 0 8px ${SUBJECT_CONFIG[form.subject]?.color || '#00f5ff'}20`,
                    }}
                  >
                    {Object.keys(SYLLABUS).map(s => (
                      <option key={s} value={s} style={{ background: '#060d1a', color: '#e0f0ff' }}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SUBJECT_CONFIG[form.subject]?.color || '#00f5ff' }} />
                </div>
              </div>

              {/* ── Dropdown 2: Chapter (filtered, pending only) ── */}
              <div className="lg:col-span-2">
                {(() => {
                  const availableChapters = SYLLABUS[form.subject].filter(
                    c => !completedChapters.includes(`${form.subject}::${c.name}`)
                  );
                  const alreadyQueued = missions.filter(m => m.subject === form.subject && !m.isMicro).map(m => m.name);
                  return (
                    <>
                      <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">
                        TARGET CHAPTER
                        <span className="ml-2 text-gray-700">({availableChapters.length} remaining)</span>
                      </label>
                      <div className="relative">
                        {availableChapters.length === 0 ? (
                          <div
                            className="w-full px-3 py-2 font-mono text-xs clip-corner-sm"
                            style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.2)', color: '#00ff41' }}
                          >
                            ✓ ALL CHAPTERS ANNIHILATED
                          </div>
                        ) : (
                          <select
                            value={form.chapterName}
                            onChange={e => {
                              const ch = SYLLABUS[form.subject].find(c => c.name === e.target.value);
                              setForm(f => ({ ...f, chapterName: e.target.value, diff: ch?.diff || f.diff }));
                            }}
                            className="w-full px-3 py-2 font-mono text-sm clip-corner-sm focus:outline-none appearance-none pr-8"
                            style={{
                              background: 'rgba(0,245,255,0.05)',
                              border: '1px solid rgba(0,245,255,0.25)',
                              color: '#e0f0ff',
                            }}
                          >
                            {availableChapters.map(c => {
                              const queued = alreadyQueued.includes(c.name);
                              return (
                                <option
                                  key={c.name}
                                  value={c.name}
                                  style={{ background: '#060d1a', color: queued ? '#4a6080' : '#e0f0ff' }}
                                >
                                  {queued ? `⟳ ${c.name} (queued)` : `${c.name}`}
                                </option>
                              );
                            })}
                          </select>
                        )}
                        {availableChapters.length > 0 && (
                          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ── Difficulty (auto-set from syllabus, still manually overrideable) ── */}
              <div>
                <label className="font-mono text-[10px] text-gray-500 block mb-1 tracking-wider">
                  DIFFICULTY
                  {form.chapterName && SYLLABUS[form.subject]?.find(c => c.name === form.chapterName) && (
                    <span className="ml-1 text-gray-700">(auto)</span>
                  )}
                </label>
                <div className="flex gap-1.5">
                  {['E', 'M', 'H'].map(d => {
                    const dc = DIFF_CONFIG[d];
                    return (
                      <button
                        key={d}
                        onClick={() => setForm(f => ({ ...f, diff: d }))}
                        className="flex-1 py-2 font-display text-xs font-black clip-corner-sm transition-all"
                        style={{ background: form.diff === d ? `${dc.color}20` : 'rgba(0,0,0,0.3)', border: `1px solid ${form.diff === d ? dc.color : '#1a2f4a'}`, color: form.diff === d ? dc.color : '#4a6080', boxShadow: form.diff === d ? `0 0 8px ${dc.color}40` : 'none' }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                    disabled={!form.chapterName}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 font-display text-xs font-black tracking-wider clip-corner-sm transition-all"
                    style={{
                      background: form.chapterName ? 'rgba(0,245,255,0.15)' : 'rgba(20,30,40,0.4)',
                      border: `1px solid ${form.chapterName ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.1)'}`,
                      color: form.chapterName ? '#00f5ff' : '#2a4a5a',
                      boxShadow: form.chapterName ? '0 0 12px rgba(0,245,255,0.2)' : 'none',
                      cursor: form.chapterName ? 'pointer' : 'not-allowed',
                    }}
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
                    timerRunning={timerRunning}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 2: GLOBAL PROGRESS + RANK
        ══════════════════════════════════════════ */}
        <section style={{ opacity: timerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00ff41, transparent)' }} />
            <span className="font-display text-xs tracking-widest neon-text-green">◈ NEXUS CORE — GLOBAL PROGRESS</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00ff41, transparent)' }} />
          </div>

          <div className="clip-corner p-6" style={{ background: 'linear-gradient(135deg, #061a0f, #050a0e)', border: '1px solid rgba(0,255,65,0.25)' }}>
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

            <div className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-display text-[10px] tracking-widest text-gray-500">SYLLABUS DOMINATION</span>
                <span className="font-mono text-xs neon-text-green">{completedChapters.length} / {TOTAL_CHAPTERS}</span>
              </div>
              <div className="relative h-8 rounded overflow-hidden" style={{ background: '#050f08', border: '1px solid rgba(0,255,65,0.2)' }}>
                <div className="absolute inset-0 flex">
                  {Array.from({ length: TOTAL_CHAPTERS }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-[#0a1e10]" />
                  ))}
                </div>
                <motion.div
                  className="absolute left-0 top-0 h-full rounded"
                  style={{ background: 'linear-gradient(90deg, #00ff41, #00f5ff)', boxShadow: '0 0 15px rgba(0,255,65,0.8)' }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-xs font-black text-white mix-blend-difference">
                    {Math.round(progressPct)}% DOMINANCE
                  </span>
                </div>
              </div>
            </div>

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
            SECTION 2.5: REVISION NODES
        ══════════════════════════════════════════ */}
        {upcomingRevisions.length > 0 && (
          <section style={{ opacity: timerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
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
        <section style={{ opacity: timerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
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
                  style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: `1px solid ${scfg.color}25` }}
                >
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${scfg.color}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <SubIcon size={18} style={{ color: scfg.color, filter: `drop-shadow(0 0 6px ${scfg.color})` }} />
                      <span className="font-display text-sm font-black tracking-widest" style={{ color: scfg.color, textShadow: `0 0 10px ${scfg.color}` }}>
                        {scfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
                        <motion.div className="h-full rounded-full" style={{ background: scfg.color, boxShadow: `0 0 6px ${scfg.color}` }} animate={{ width: `${subjectPct}%` }} transition={{ duration: 0.8 }} />
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: scfg.color }}>{subjectCompleted}/{subjectTotal}</span>
                    </div>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    <AnimatePresence>
                      {sorted.map((chapter, i) => (
                        <ChapterItem
                          key={chapter.name}
                          chapter={chapter}
                          isCompleted={completedChapters.includes(`${subject}::${chapter.name}`)}
                          delay={i * 0.03}
                        />
                      ))}
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
            MHT-CET NEXUS • {TOTAL_CHAPTERS} CHAPTERS • NEURO-WARFARE PROTOCOL • ALL SYSTEMS OPERATIONAL
          </div>
          <div className="font-mono text-[9px] text-gray-800 mt-1">
            PERSISTENCE: localStorage • VIGILANCE: Active • VELOCITY STREAK: Enabled • XP: Real-time
          </div>
        </footer>
      </div>
    </div>
  );
}
