import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap, Target, Shield, Sword, Clock, CheckCircle,
  ChevronDown, Plus, Trash2, Play, Pause, RotateCcw,
  Award, AlertTriangle, BookOpen, Atom, FlaskConical,
  Calculator, X, Flame,
  Radio, Skull, Eye, EyeOff,
  FolderOpen, Download, Archive,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — CONSTANTS
// Declared at module scope — no hoisting issues, accessible by every component.
// ─────────────────────────────────────────────────────────────────────────────

const SYLLABUS = {
  Physics: [
    { name: 'Rotational Dynamics',        diff: 'H' },
    { name: 'Kinetic Theory of Gases',    diff: 'M' },
    { name: 'Wave Optics',                diff: 'H' },
    { name: 'Dual Nature of Radiation',   diff: 'M' },
    { name: 'Structure of Atom',          diff: 'E' },
    { name: 'Semiconductors',             diff: 'E' },
  ],
  Chemistry: [
    { name: 'Solutions',                    diff: 'H' },
    { name: 'Electrochemistry',             diff: 'H' },
    { name: 'Halogen Derivatives',          diff: 'E' },
    { name: 'Alcohols, Phenols and Ethers', diff: 'M' },
    { name: 'Ionic Equilibrium',            diff: 'H' },
    { name: 'Amines',                       diff: 'M' },
    { name: 'Transition Elements',          diff: 'E' },
    { name: 'Basic Concepts of Chemistry',  diff: 'E' },
    { name: 'Atomic Structure',             diff: 'E' },
    { name: 'Chemical Thermodynamics',      diff: 'M' },
  ],
  Mathematics: [
    { name: 'Pair of Lines',               diff: 'M' },
    { name: 'Line & Plane',                diff: 'M' },
    { name: 'Differentiation',             diff: 'H' },
    { name: 'Applications of Derivatives', diff: 'H' },
    { name: 'Differential Equations',      diff: 'H' },
  ],
};

const TOTAL_CHAPTERS    = Object.values(SYLLABUS).flat().length;
const XP_MAP            = { H: 500, M: 300, E: 150 };
const HOURS_MAP         = { H: 5,   M: 3,   E: 1.5 };
const POMODORO_WORK     = 25 * 60;          // 25 minutes in seconds
const POMODORO_BREAK    = 5  * 60;          //  5 minutes in seconds
const COMBO_WINDOW_MS   = 4  * 60 * 1000;  // 4-minute velocity window
const VIGILANCE_IDLE_MS = 10 * 60 * 1000;  // 10-minute idle threshold
const COMBO_MULTIPLIERS = [1, 2, 5, 10, 20, 50];

const DIFF_CONFIG = {
  H: { label: 'BOSS BATTLE', color: '#ff00ff', bg: 'rgba(255,0,255,0.1)',  icon: Sword  },
  M: { label: 'ELITE ENEMY', color: '#ff6b00', bg: 'rgba(255,107,0,0.1)', icon: Shield },
  E: { label: 'MINION',      color: '#00ff41', bg: 'rgba(0,255,65,0.1)',   icon: Target },
};

const DIFF_LABELS_PRINT = { H: 'BOSS', M: 'ELITE', E: 'MINION' };

const SUBJECT_CONFIG = {
  Physics:     { color: '#00f5ff', icon: Atom,         label: 'PHYSICS'     },
  Chemistry:   { color: '#ff00ff', icon: FlaskConical,  label: 'CHEMISTRY'   },
  Mathematics: { color: '#00ff41', icon: Calculator,    label: 'MATHEMATICS' },
};

const SUBJECT_PRINT_COLORS = {
  Physics: '#00f5ff', Chemistry: '#ff00ff', Mathematics: '#00ff41',
};

const RANK_THRESHOLDS = [
  { rank: 'CADET',       min: 0,     max: 500   },
  { rank: 'RECRUIT',     min: 500,   max: 1200  },
  { rank: 'SPECIALIST',  min: 1200,  max: 2500  },
  { rank: 'OPERATIVE',   min: 2500,  max: 4500  },
  { rank: 'COMMANDER',   min: 4500,  max: 7000  },
  { rank: 'WARLORD',     min: 7000,  max: 10000 },
  { rank: 'NEXUS ELITE', min: 10000, max: 99999 },
];

const TIMER_PRESETS = [
  { label: '25m',  seconds: 25  * 60 },
  { label: '50m',  seconds: 50  * 60 },
  { label: '120m', seconds: 120 * 60 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PURE HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getRank(xp) {
  const found = [...RANK_THRESHOLDS].reverse().find((rankDef) => xp >= rankDef.min);
  return found || RANK_THRESHOLDS[0];
}

/** Safe localStorage wrapper — never throws. */
const LS = {
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};

function fireConfetti(diff) {
  const colors =
    diff === 'H' ? ['#ff00ff', '#ff69b4', '#ffffff'] :
    diff === 'M' ? ['#ff6b00', '#ffff00', '#ffffff'] :
                   ['#00ff41', '#00f5ff', '#ffffff'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors, scalar: 1.2 });
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 0 }, colors }), 300);
  setTimeout(() => confetti({ particleCount: 60, angle: 60,  spread: 60, origin: { x: 1 }, colors }), 450);
}

function fireNeuralConfetti() {
  const colors = ['#00f5ff', '#00ff41', '#ffffff', '#7fff00'];
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors, scalar: 1.5 });
  setTimeout(() => confetti({ particleCount: 80, angle: 110, spread: 70, origin: { x: 0 }, colors }), 200);
  setTimeout(() => confetti({ particleCount: 80, angle: 70,  spread: 70, origin: { x: 1 }, colors }), 350);
}

function playNeuralSync() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, startTime, duration, type = 'sine') => {
      const oscillator = audioCtx.createOscillator();
      const gainNode   = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gainNode.gain.setValueAtTime(0.3,   audioCtx.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
      oscillator.start(audioCtx.currentTime + startTime);
      oscillator.stop(audioCtx.currentTime  + startTime + duration);
    };
    playNote(220,  0,    0.12);
    playNote(440,  0.1,  0.12);
    playNote(880,  0.2,  0.15);
    playNote(1760, 0.32, 0.25, 'square');
    playNote(880,  0.5,  0.4);
  } catch {}
}

function playComboShatter() {
  try {
    const audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode   = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.4);
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useVelocityCombo
 * Tracks PYQ solved count + velocity combo level for a single mission.
 * Combo resets if no +1 tap occurs within COMBO_WINDOW_MS (4 minutes).
 */
function useVelocityCombo(missionId) {
  const [comboLevel,   setComboLevel]   = useState(0);
  const [solvedCount,  setSolvedCount]  = useState(() => LS.get(`solved_${missionId}`, 0));
  const [comboExpired, setComboExpired] = useState(false);

  const windowTimerRef    = useRef(null);
  const currentMultiplier = COMBO_MULTIPLIERS[Math.min(comboLevel, COMBO_MULTIPLIERS.length - 1)];

  const incrementSolved = useCallback(() => {
    setSolvedCount((prev) => {
      const next = prev + 1;
      LS.set(`solved_${missionId}`, next);
      return next;
    });

    if (windowTimerRef.current) {
      clearTimeout(windowTimerRef.current);
      setComboLevel((prev) => Math.min(prev + 1, COMBO_MULTIPLIERS.length - 1));
    } else {
      setComboLevel(0);
    }

    setComboExpired(false);

    windowTimerRef.current = setTimeout(() => {
      windowTimerRef.current = null;
      playComboShatter();
      setComboExpired(true);
      setTimeout(() => { setComboLevel(0); setComboExpired(false); }, 1200);
    }, COMBO_WINDOW_MS);
  }, [missionId]);

  return { comboLevel, solvedCount, currentMultiplier, incrementSolved, comboExpired };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — SMALL / STATELESS UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function XPFloatAnimation({ xpAmount, hasVelocityBonus, onAnimationDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -100, scale: 1.6 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
      onAnimationComplete={onAnimationDone}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-[9998] text-center"
    >
      <div style={{
        fontFamily: 'monospace',
        color:      hasVelocityBonus ? '#ffff00' : '#00ff41',
        textShadow: `0 0 20px ${hasVelocityBonus ? '#ffff00' : '#00ff41'}`,
        fontSize:   36,
        fontWeight: 900,
      }}>
        +{xpAmount} XP
      </div>
      {hasVelocityBonus && (
        <div style={{ fontFamily: 'monospace', color: '#ff6b00', textShadow: '0 0 15px #ff6b00', fontSize: 18, fontWeight: 700 }}>
          ⚡ VELOCITY BONUS!
        </div>
      )}
    </motion.div>
  );
}

function RevisionCard({ revisionEntry }) {
  const daysLeft  = Math.ceil((revisionEntry.dueDate - Date.now()) / 86400000);
  const isOverdue = daysLeft < 0;
  const isDueToday = daysLeft <= 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3"
      style={{
        background:   'rgba(255,255,0,0.05)',
        border:       `1px solid ${isDueToday || isOverdue ? '#ffff0040' : '#2a3f5a40'}`,
        borderRadius: 4,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-yellow-400" style={{ fontSize: 10 }}>⟳ MEMORY NODE</div>
          <div className="text-white font-semibold text-sm truncate" style={{ maxWidth: 160 }}>{revisionEntry.chapterName}</div>
          <div className="font-mono text-gray-500" style={{ fontSize: 10 }}>{revisionEntry.subject}</div>
        </div>
        <div className="text-right">
          {isOverdue ? (
            <div className="font-mono text-red-400 text-xs">OVERDUE!</div>
          ) : isDueToday ? (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="font-mono text-yellow-400 text-xs">TODAY!</motion.div>
          ) : (
            <div className="font-mono text-gray-500 text-xs">+{daysLeft}d</div>
          )}
          <div className="font-mono text-gray-600" style={{ fontSize: 9 }}>Rev #{revisionEntry.revNum}</div>
        </div>
      </div>
    </motion.div>
  );
}

function ChapterItem({ chapter, isCompleted, animDelay }) {
  const diffConfig = DIFF_CONFIG[chapter.diff];
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: isCompleted ? 0.35 : 1 }}
      transition={{ duration: 0.4, delay: animDelay }}
      className="flex items-center gap-2 py-1.5 px-2 rounded"
      style={{ background: isCompleted ? 'rgba(0,0,0,0.2)' : 'transparent' }}
    >
      {isCompleted ? (
        <CheckCircle size={12} style={{ color: '#00ff41', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 12, height: 12, flexShrink: 0, border: `1px solid ${diffConfig.color}`, borderRadius: '50%' }} />
      )}
      <span className="text-sm flex-1" style={{
        color:               isCompleted ? '#4a6080' : '#c0d8f0',
        textDecoration:      isCompleted ? 'line-through' : 'none',
        textDecorationColor: '#ff00ff',
      }}>
        {chapter.name}
      </span>
      <span className="font-mono px-1.5 py-0.5" style={{
        color:      diffConfig.color,
        border:     `1px solid ${diffConfig.color}60`,
        background: diffConfig.bg,
        fontSize:   8,
      }}>
        {chapter.diff}
      </span>
    </motion.div>
  );
}

function IgnitionSwitch({ onIgnite }) {
  const [isArmed, setIsArmed] = useState(false);
  return (
    <motion.div
      className="relative"
      animate={isArmed ? { x: [-2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      {!isArmed ? (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsArmed(true)}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 font-mono text-sm font-black tracking-widest"
          style={{
            background: 'linear-gradient(135deg, rgba(255,0,0,0.15), rgba(139,0,0,0.2))',
            border:     '1px solid #ff0000',
            color:      '#ff4444',
            boxShadow:  '0 0 20px rgba(255,0,0,0.3), 0 0 40px rgba(255,0,0,0.1)',
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
        <div
          className="flex items-center gap-3 py-3 px-5"
          style={{ background: 'rgba(139,0,0,0.3)', border: '2px solid #ff0000', boxShadow: '0 0 30px rgba(255,0,0,0.5)' }}
        >
          <Skull size={16} color="#ff4444" />
          <span className="font-mono text-xs text-red-400 flex-1">CONFIRM OVERRIDE?</span>
          <button
            onClick={() => { onIgnite(); setIsArmed(false); }}
            className="px-4 py-1.5 font-mono text-xs font-black text-white"
            style={{ background: '#ff0000', boxShadow: '0 0 12px #ff000080' }}
          >
            INITIATE
          </button>
          <button
            onClick={() => setIsArmed(false)}
            className="px-3 py-1.5 font-mono text-xs text-gray-400 border border-gray-700"
          >
            ABORT
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — COMPLEX COMPONENTS
// All depend on constants / hooks defined above — no forward-reference issues.
// ─────────────────────────────────────────────────────────────────────────────

function VigilanceOverlay({ countdown, onResync }) {
  const isUrgent = countdown < 20;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9995] flex items-center justify-center"
      style={{ background: 'rgba(10,0,0,0.88)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,0,0,0.04) 2px,rgba(255,0,0,0.04) 4px)' }}
      />
      <motion.div
        animate={isUrgent ? { x: [-4, 4, -4, 4, 0], transition: { repeat: Infinity, duration: 0.15 } } : {}}
        className="relative text-center px-12 py-10"
        style={{
          background: 'linear-gradient(135deg, #1a0000, #0a0000)',
          border:     '2px solid #ff0000',
          boxShadow:  '0 0 60px rgba(255,0,0,0.5), 0 0 120px rgba(255,0,0,0.2)',
        }}
      >
        <div className="flex justify-center mb-4">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
            <AlertTriangle size={48} color="#ff0000" />
          </motion.div>
        </div>
        <div className="font-mono text-2xl font-black text-red-500 tracking-widest mb-2" style={{ textShadow: '0 0 20px #ff0000' }}>
          ⚠ SYSTEM FAILING
        </div>
        <div className="font-mono text-sm text-red-300 mb-2">NEURAL LINK DEGRADATION DETECTED</div>
        <div className="font-mono text-xs text-gray-500 mb-6">No activity detected — focus protocol compromised</div>
        <div
          className="font-mono text-6xl font-black mb-6"
          style={{ color: isUrgent ? '#ff0000' : '#ff6b00', textShadow: `0 0 30px ${isUrgent ? '#ff0000' : '#ff6b00'}` }}
        >
          {countdown}s
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onResync}
          className="px-8 py-4 font-mono text-sm font-black tracking-widest"
          style={{
            background: 'rgba(0,245,255,0.15)',
            border:     '2px solid #00f5ff',
            color:      '#00f5ff',
            boxShadow:  '0 0 30px rgba(0,245,255,0.4)',
          }}
        >
          <Radio size={16} className="inline mr-2" />
          RE-SYNC NEURAL LINK
        </motion.button>
        <div className="mt-4 font-mono text-red-900" style={{ fontSize: 10 }}>
          FAILURE TO COMPLY → MISSION ABORTED
        </div>
      </motion.div>
    </motion.div>
  );
}

function LiveTimeDisplay({ taskId, isRunning, sessionStartRef }) {
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    const tick = () => {
      const savedSeconds = LS.get(`time_spent_${taskId}`, 0);
      const liveElapsed  = sessionStartRef.current
        ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
        : 0;
      setDisplaySeconds(savedSeconds + liveElapsed);
    };
    tick();
    const intervalId = setInterval(tick, 5000);
    return () => clearInterval(intervalId);
  }, [taskId, isRunning, sessionStartRef]);

  const totalMinutes = Math.floor(displaySeconds / 60);
  if (totalMinutes === 0) return null;

  return (
    <div className="mt-2 text-center font-mono text-gray-600" style={{ fontSize: 10 }}>
      ⏱ {totalMinutes}m spent on this mission
    </div>
  );
}

// ── TimerModal ────────────────────────────────────────────────────────────────

function TimerModal({ task, onClose, onTimerStateChange, vigilanceMode }) {
  const timerStorageKey = `timer_${task.id}`;
  const timeSpentKey    = `time_spent_${task.id}`;

  const savedTimerState = LS.get(timerStorageKey, {
    seconds:      POMODORO_WORK,
    totalSeconds: POMODORO_WORK,
    isBreak:      false,
    sessions:     0,
  });

  const [secondsLeft,        setSecondsLeft]        = useState(savedTimerState.seconds);
  const [totalSeconds,       setTotalSeconds]        = useState(savedTimerState.totalSeconds);
  const [isRunning,          setIsRunning]           = useState(false);
  const [isBreak,            setIsBreak]             = useState(savedTimerState.isBreak);
  const [completedSessions,  setCompletedSessions]   = useState(savedTimerState.sessions);
  const [customMinuteInput,  setCustomMinuteInput]   = useState('');
  const [showVigilance,      setShowVigilance]       = useState(false);
  const [vigilanceCountdown, setVigilanceCountdown]  = useState(60);

  const sessionStartRef      = useRef(null);
  const lastActivityRef      = useRef(Date.now());
  const mainIntervalRef      = useRef(null);
  const vigilanceIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const persistTimerState = useCallback((sec, total, brk, sess) => {
    LS.set(timerStorageKey, { seconds: sec, totalSeconds: total, isBreak: brk, sessions: sess });
  }, [timerStorageKey]);

  const flushTimeToStorage = useCallback(() => {
    if (sessionStartRef.current !== null) {
      const elapsed  = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const previous = LS.get(timeSpentKey, 0);
      LS.set(timeSpentKey, previous + elapsed);
      sessionStartRef.current = null;
    }
  }, [timeSpentKey]);

  // Notify parent when running state changes
  useEffect(() => { onTimerStateChange?.(isRunning); }, [isRunning, onTimerStateChange]);

  // Main countdown tick
  useEffect(() => {
    if (!isRunning) { clearInterval(mainIntervalRef.current); return; }
    mainIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(mainIntervalRef.current);
          setIsRunning(false);
          const nextIsBreak      = !isBreak;
          const nextTotalSeconds = nextIsBreak ? POMODORO_BREAK : POMODORO_WORK;
          const nextSessions     = !isBreak ? completedSessions + 1 : completedSessions;
          setIsBreak(nextIsBreak);
          setTotalSeconds(nextTotalSeconds);
          setCompletedSessions(nextSessions);
          persistTimerState(nextTotalSeconds, nextTotalSeconds, nextIsBreak, nextSessions);
          return nextTotalSeconds;
        }
        const nextSec = prev - 1;
        persistTimerState(nextSec, totalSeconds, isBreak, completedSessions);
        return nextSec;
      });
    }, 1000);
    return () => clearInterval(mainIntervalRef.current);
  }, [isRunning, isBreak, completedSessions, totalSeconds, persistTimerState]);

  // Vigilance idle monitor
  useEffect(() => {
    if (!vigilanceMode || !isRunning) {
      clearInterval(vigilanceIntervalRef.current);
      clearInterval(countdownIntervalRef.current);
      return;
    }
    lastActivityRef.current = Date.now();
    vigilanceIntervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= VIGILANCE_IDLE_MS && !showVigilance) {
        setShowVigilance(true);
        setVigilanceCountdown(60);
        countdownIntervalRef.current = setInterval(() => {
          setVigilanceCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              setIsRunning(false);
              setSecondsLeft(totalSeconds);
              setShowVigilance(false);
              persistTimerState(totalSeconds, totalSeconds, isBreak, completedSessions);
              return 60;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);
    return () => {
      clearInterval(vigilanceIntervalRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [vigilanceMode, isRunning, showVigilance, totalSeconds, isBreak, completedSessions, persistTimerState]);

  // Flush elapsed time on unmount
  useEffect(() => {
    return () => {
      flushTimeToStorage();
      persistTimerState(secondsLeft, totalSeconds, isBreak, completedSessions);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordActivity = () => { lastActivityRef.current = Date.now(); };

  const handleResync = () => {
    clearInterval(countdownIntervalRef.current);
    setShowVigilance(false);
    lastActivityRef.current = Date.now();
    fireNeuralConfetti();
    playNeuralSync();
  };

  const toggleTimer = () => {
    recordActivity();
    setIsRunning((prev) => {
      if (!prev) { sessionStartRef.current = Date.now(); }
      else        { flushTimeToStorage(); }
      return !prev;
    });
  };

  const applyPresetSeconds = (presetSeconds) => {
    recordActivity();
    flushTimeToStorage();
    setIsRunning(false);
    setSecondsLeft(presetSeconds);
    setTotalSeconds(presetSeconds);
    setIsBreak(false);
    persistTimerState(presetSeconds, presetSeconds, false, completedSessions);
  };

  const applyCustomMinutes = () => {
    const minutes = parseInt(customMinuteInput, 10);
    if (!minutes || minutes < 1 || minutes > 300) return;
    applyPresetSeconds(minutes * 60);
    setCustomMinuteInput('');
  };

  const resetTimer = () => {
    recordActivity();
    flushTimeToStorage();
    setIsRunning(false);
    setSecondsLeft(POMODORO_WORK);
    setTotalSeconds(POMODORO_WORK);
    setIsBreak(false);
    setCompletedSessions(0);
    persistTimerState(POMODORO_WORK, POMODORO_WORK, false, 0);
  };

  const minuteDisplay   = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secondDisplay   = String(secondsLeft % 60).padStart(2, '0');
  const progressFill    = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const diffConfig      = DIFF_CONFIG[task.diff];
  const svgCircumference = 2 * Math.PI * 90;
  const strokeOffset     = svgCircumference - (progressFill / 100) * svgCircumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: 'rgba(2,5,8,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <AnimatePresence>
        {showVigilance && <VigilanceOverlay countdown={vigilanceCountdown} onResync={handleResync} />}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #060d1a 100%)',
          border:     `1px solid ${diffConfig.color}`,
          boxShadow:  `0 0 30px ${diffConfig.color}40, 0 0 80px ${diffConfig.color}20`,
          padding:    40,
          minWidth:   400,
        }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="font-mono tracking-widest mb-1" style={{ color: diffConfig.color, fontSize: 10 }}>
            TIMER COMMAND CENTER
          </div>
          <div className="font-bold text-lg text-white truncate" style={{ maxWidth: 300, margin: '0 auto' }}>{task.name}</div>
          <div className="font-mono text-gray-500 mt-1" style={{ fontSize: 12 }}>
            {task.subject} • {isBreak ? '☕ BREAK' : '⚡ FOCUS'}
          </div>
          {vigilanceMode && isRunning && (
            <div className="mt-1 flex items-center justify-center gap-1">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Eye size={10} color="#00ff41" />
              </motion.div>
              <span className="font-mono text-green-500" style={{ fontSize: 9 }}>VIGILANCE ACTIVE</span>
            </div>
          )}
        </div>

        {/* Preset buttons: 25m / 50m / 120m + custom input */}
        <div className="flex gap-2 mb-4 justify-center flex-wrap">
          {TIMER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPresetSeconds(preset.seconds)}
              className="px-4 py-1.5 font-mono text-xs font-black tracking-wider transition-all"
              style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}
            >
              {preset.label}
            </button>
          ))}
          <div className="flex gap-1">
            <input
              type="number"
              value={customMinuteInput}
              onChange={(e) => setCustomMinuteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustomMinutes()}
              placeholder="min"
              className="w-14 px-2 py-1.5 font-mono text-xs text-center focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,0,0.3)', color: '#ff6b00' }}
            />
            <button
              onClick={applyCustomMinutes}
              className="px-2 py-1.5 font-mono text-xs"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.4)', color: '#ff6b00' }}
            >
              SET
            </button>
          </div>
        </div>

        {/* SVG ring timer */}
        <div className="flex justify-center mb-5 relative">
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#1a2f4a" strokeWidth="6" />
            <motion.circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke={diffConfig.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={svgCircumference}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 0.5 }}
              style={{ filter: `drop-shadow(0 0 8px ${diffConfig.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-5xl font-black text-white" style={{ textShadow: `0 0 20px ${diffConfig.color}` }}>
              {minuteDisplay}:{secondDisplay}
            </div>
            <div className="font-mono text-xs mt-1" style={{ color: diffConfig.color }}>
              SESSION {completedSessions + 1}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            className="flex items-center gap-2 px-6 py-3 font-mono text-sm font-bold transition-all"
            style={{
              background: isRunning ? 'rgba(255,0,255,0.15)' : `${diffConfig.color}20`,
              border:     `1px solid ${isRunning ? '#ff00ff' : diffConfig.color}`,
              color:      isRunning ? '#ff00ff' : diffConfig.color,
              boxShadow:  isRunning ? '0 0 15px rgba(255,0,255,0.3)' : `0 0 15px ${diffConfig.color}40`,
            }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? 'PAUSE' : 'ENGAGE'}
          </motion.button>
          <button
            onClick={resetTimer}
            className="px-4 py-3 text-gray-500 hover:text-white transition-colors border border-gray-700 hover:border-gray-500"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {completedSessions > 0 && (
          <div className="mt-4 text-center font-mono text-xs text-gray-500">
            {completedSessions} POMODORO{completedSessions !== 1 ? 'S' : ''} COMPLETE
          </div>
        )}
        {task.pyqs > 0 && (
          <div className="mt-2 text-center font-mono text-xs" style={{ color: diffConfig.color }}>
            TARGET: {task.pyqs} PYQs
          </div>
        )}

        <LiveTimeDisplay taskId={task.id} isRunning={isRunning} sessionStartRef={sessionStartRef} />
      </motion.div>
    </motion.div>
  );
}

// ── MissionCard ───────────────────────────────────────────────────────────────

function MissionCard({ task, onAnnihilate, onOpenTimer, onDelete, timerRunning }) {
  const diffConfig    = DIFF_CONFIG[task.diff];
  const subjectConfig = SUBJECT_CONFIG[task.subject] || {};
  const SubjectIcon   = subjectConfig.icon || BookOpen;
  const subjectColor  = subjectConfig.color || '#00f5ff';

  const { comboLevel, solvedCount, currentMultiplier, incrementSolved, comboExpired } = useVelocityCombo(task.id);

  const targetPyqCount = task.pyqs || 0;
  const canAnnihilate  = targetPyqCount === 0 || solvedCount >= targetPyqCount;
  const isOverheat     = comboLevel >= 4;

  const cardBorderColor = comboLevel > 0 ? diffConfig.color : `${diffConfig.color}40`;
  const cardGlow        = comboLevel > 0
    ? `0 0 ${10 + comboLevel * 8}px ${diffConfig.color}, 0 0 ${20 + comboLevel * 15}px ${diffConfig.color}60`
    : `0 0 10px ${diffConfig.color}15`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={
        comboExpired
          ? { x: [-6, 6, -6, 6, -4, 4, 0], transition: { duration: 0.5 } }
          : { opacity: 1, x: 0 }
      }
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${diffConfig.bg}, rgba(10,22,40,0.95))`,
        border:     `1px solid ${cardBorderColor}`,
        boxShadow:  cardGlow,
        opacity:    timerRunning ? 0.6 : 1,
        transition: 'opacity 0.4s, box-shadow 0.3s, border-color 0.3s',
      }}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: diffConfig.color, boxShadow: `0 0 ${8 + comboLevel * 4}px ${diffConfig.color}` }}
      />

      {isOverheat && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.08, 0.22, 0.08] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          style={{ background: `radial-gradient(ellipse at center, ${diffConfig.color}44, transparent 70%)` }}
        />
      )}

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="font-mono tracking-widest px-2 py-0.5 border"
                style={{ color: diffConfig.color, borderColor: diffConfig.color, background: diffConfig.bg, fontSize: 9 }}
              >
                {diffConfig.label}
              </span>
              <span className="font-mono text-gray-600" style={{ fontSize: 9 }}>{HOURS_MAP[task.diff]}H EST.</span>
            </div>
            <h3 className="font-bold text-base text-white leading-tight">{task.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <SubjectIcon size={11} style={{ color: subjectColor }} />
              <span className="font-mono" style={{ color: subjectColor, fontSize: 10 }}>{task.subject}</span>
              {task.pyqs > 0 && (
                <span className="font-mono text-gray-500" style={{ fontSize: 10 }}>• {task.pyqs} PYQs</span>
              )}
            </div>
          </div>

          {/* XP + Combo */}
          <div className="flex-shrink-0 text-center">
            <div className="font-mono text-xl font-black" style={{ color: diffConfig.color, textShadow: `0 0 10px ${diffConfig.color}` }}>
              {XP_MAP[task.diff]}
            </div>
            <div className="font-mono text-gray-600" style={{ fontSize: 9 }}>XP</div>
            {comboLevel > 0 && (
              <motion.div key={comboLevel} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-1">
                <div className="font-mono text-xs font-black" style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>
                  {currentMultiplier}x
                </div>
                <div className="font-mono text-yellow-600 flex items-center gap-0.5" style={{ fontSize: 8 }}>
                  {isOverheat ? <><Flame size={8} className="text-orange-400" />HOT</> : 'COMBO'}
                </div>
              </motion.div>
            )}
            {comboExpired && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0, opacity: 0 }}
                className="font-mono text-red-500 font-black"
                style={{ fontSize: 10 }}
              >
                SHATTER
              </motion.div>
            )}
          </div>
        </div>

        {/* PYQ progress bar */}
        {targetPyqCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: diffConfig.color, boxShadow: `0 0 4px ${diffConfig.color}` }}
                animate={{ width: `${Math.min(100, (solvedCount / targetPyqCount) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="font-mono" style={{ color: diffConfig.color, fontSize: 10 }}>{solvedCount}/{targetPyqCount}</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={incrementSolved}
              className="px-2 py-1 font-mono font-black"
              style={{ background: `${diffConfig.color}20`, border: `1px solid ${diffConfig.color}60`, color: diffConfig.color, fontSize: 10 }}
            >
              +1
            </motion.button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onOpenTimer(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono tracking-wider transition-all"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}
          >
            <Clock size={12} /> TIMER
          </button>

          <motion.button
            whileTap={canAnnihilate ? { scale: 0.95 } : {}}
            onClick={() => canAnnihilate && onAnnihilate(task, comboLevel, currentMultiplier)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono tracking-wider transition-all flex-1"
            style={{
              background: canAnnihilate ? `${diffConfig.color}18` : 'rgba(30,30,30,0.4)',
              border:     `1px solid ${canAnnihilate ? `${diffConfig.color}80` : '#2a3a2a'}`,
              color:      canAnnihilate ? diffConfig.color : '#3a4a3a',
              boxShadow:  canAnnihilate ? `0 0 8px ${diffConfig.color}20` : 'none',
              cursor:     canAnnihilate ? 'pointer' : 'not-allowed',
            }}
          >
            <Zap size={12} />
            {canAnnihilate
              ? (comboLevel > 0 ? '⚡ VELOCITY ANNIHILATE' : 'ANNIHILATE')
              : `LOCKED (${solvedCount}/${targetPyqCount})`}
          </motion.button>

          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center px-2 py-1.5 text-gray-600 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-900"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── WarArchiveModal ───────────────────────────────────────────────────────────

function WarArchiveModal({ archives, onClose, totalXP, rankName, onDownloadPDF }) {
  const totalPyqsSolved = archives.reduce((sum, e) => sum + (e.finalPyqCount     || 0), 0);
  const totalMinutes    = archives.reduce((sum, e) => sum + (e.timeSpentMinutes  || 0), 0);
  const totalHours      = (totalMinutes / 60).toFixed(1);

  const summaryStats = [
    { value: archives.length,          label: 'MISSIONS COMPLETE' },
    { value: totalPyqsSolved,          label: 'TOTAL PYQs SOLVED' },
    { value: `${totalHours}h`,         label: 'HOURS INVESTED'    },
    { value: totalXP.toLocaleString(), label: 'TOTAL XP EARNED'   },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9980] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 30 }}
        transition={{ type: 'spring', damping: 22 }}
        className="relative w-full flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #080e18, #04080f)',
          border:     '1px solid rgba(255,165,0,0.4)',
          boxShadow:  '0 0 40px rgba(255,165,0,0.15)',
          maxWidth:   900,
          maxHeight:  '90vh',
        }}
      >
        {/* Title bar — hidden on print via .no-print */}
        <div
          className="no-print flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgba(255,165,0,0.2)', background: 'rgba(255,165,0,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
            </div>
            <span className="font-mono text-gray-600 tracking-widest" style={{ fontSize: 10 }}>
              nexus@mhtcet:~/WAR_ARCHIVES$
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider"
              style={{
                background: 'rgba(0,245,255,0.08)',
                border:     '1px solid rgba(0,245,255,0.35)',
                color:      '#00f5ff',
                fontSize:   10,
              }}
            >
              <Download size={11} /> DOWNLOAD INTEL REPORT
            </motion.button>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Heading */}
        <div className="px-5 pt-4 pb-2">
          <div className="font-mono text-lg font-black tracking-widest" style={{ color: '#ffa500', textShadow: '0 0 16px rgba(255,165,0,0.5)' }}>
            📂 WAR ARCHIVES — CLASSIFIED INTEL
          </div>
          <div className="font-mono text-gray-600 mt-0.5" style={{ fontSize: 10 }}>
            Missions annihilated: {archives.length} | Rank: {rankName}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-5 mb-3 grid grid-cols-4 gap-2">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="p-2 text-center" style={{ background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)' }}>
              <div className="font-mono text-lg font-black" style={{ color: '#ffa500' }}>{stat.value}</div>
              <div className="font-mono text-gray-600 tracking-wider" style={{ fontSize: 8 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto px-5 pb-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,165,0,0.3) transparent' }}>
          {archives.length === 0 ? (
            <div className="text-center py-16">
              <Archive size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,165,0,0.3)' }} />
              <div className="font-mono text-sm text-gray-700">NO MISSIONS ARCHIVED YET</div>
              <div className="font-mono text-xs text-gray-800 mt-1">Annihilate missions to populate this database</div>
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,165,0,0.2)' }}>
                  {['#','CHAPTER','SUBJECT','DIFF','PYQs','TIME','XP','DATE'].map((heading) => (
                    <th key={heading} className="text-left py-2 px-2 font-mono tracking-widest" style={{ color: 'rgba(255,165,0,0.6)', fontSize: 9 }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {archives.map((entry, index) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="py-2 px-2 font-mono text-gray-700" style={{ fontSize: 10 }}>{archives.length - index}</td>
                    <td className="py-2 px-2">
                      <div className="text-white font-semibold" style={{ fontSize: 13 }}>{entry.chapterName}</div>
                      {entry.hadVelocityBonus && <div className="font-mono text-yellow-500" style={{ fontSize: 8 }}>⚡ VELOCITY BONUS</div>}
                    </td>
                    <td className="py-2 px-2 font-mono" style={{ color: SUBJECT_PRINT_COLORS[entry.subject] || '#aaa', fontSize: 10 }}>
                      {entry.subject}
                    </td>
                    <td className="py-2 px-2">
                      <span className="font-mono px-1.5 py-0.5" style={{
                        color:      DIFF_CONFIG[entry.difficulty]?.color || '#aaa',
                        border:     `1px solid ${DIFF_CONFIG[entry.difficulty]?.color || '#aaa'}50`,
                        background: `${DIFF_CONFIG[entry.difficulty]?.color || '#aaa'}10`,
                        fontSize:   9,
                      }}>
                        {DIFF_LABELS_PRINT[entry.difficulty] || entry.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-white" style={{ fontSize: 11 }}>{entry.finalPyqCount || 0}</td>
                    <td className="py-2 px-2 font-mono text-gray-400" style={{ fontSize: 10 }}>
                      {entry.timeSpentMinutes > 0 ? `${entry.timeSpentMinutes}m` : '—'}
                    </td>
                    <td className="py-2 px-2 font-mono" style={{ color: '#ffa500', fontSize: 10 }}>{entry.xpEarned}</td>
                    <td className="py-2 px-2 font-mono" style={{ fontSize: 9 }}>
                      <div className="text-gray-600">{entry.completedDate}</div>
                      <div className="text-gray-700">{entry.completedTime}</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — MAIN APP
// All sub-components fully defined above — zero hoisting / ReferenceError risk.
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {

  // ── localStorage-backed state ────────────────────────────────────────────────
  const [completedChapters, setCompletedChapters] = useState(() => LS.get('completed_chapters', []));
  const [totalXP,           setTotalXP]           = useState(() => LS.get('total_xp', 0));
  const [missions,          setMissions]           = useState(() => LS.get('missions', []));
  const [revisions,         setRevisions]          = useState(() => LS.get('revisions', []));
  const [warArchives,       setWarArchives]        = useState(() => LS.get('WAR_ARCHIVES', []));
  const [vigilanceMode,     setVigilanceMode]      = useState(() => LS.get('vigilance_mode', false));

  // ── Ephemeral UI state ───────────────────────────────────────────────────────
  const [activeTimerTask,  setActiveTimerTask]  = useState(null);
  const [xpFloatData,      setXpFloatData]      = useState(null);
  const [isTimerRunning,   setIsTimerRunning]   = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // ── Mission builder form state ───────────────────────────────────────────────
  const [formSubject,  setFormSubject]  = useState('Physics');
  const [formChapter,  setFormChapter]  = useState('');
  const [formDiff,     setFormDiff]     = useState('M');
  const [formPyqCount, setFormPyqCount] = useState(0);

  // Seed form to first uncompleted chapter on mount
  useEffect(() => {
    const firstAvailable = SYLLABUS['Physics'].find(
      (ch) => !completedChapters.includes(`Physics::${ch.name}`)
    );
    if (firstAvailable) {
      setFormChapter(firstAvailable.name);
      setFormDiff(firstAvailable.diff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist side-effects ─────────────────────────────────────────────────────
  useEffect(() => { LS.set('completed_chapters', completedChapters); }, [completedChapters]);
  useEffect(() => { LS.set('total_xp',           totalXP);           }, [totalXP]);
  useEffect(() => { LS.set('missions',            missions);          }, [missions]);
  useEffect(() => { LS.set('revisions',           revisions);         }, [revisions]);
  useEffect(() => { LS.set('vigilance_mode',      vigilanceMode);     }, [vigilanceMode]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const progressPercent     = (completedChapters.length / TOTAL_CHAPTERS) * 100;
  const currentRank         = getRank(totalXP);
  const nextRank            = RANK_THRESHOLDS.find((r) => r.min > totalXP) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  const rankProgressPercent = Math.min(
    100,
    ((totalXP - currentRank.min) / (Math.max(nextRank.min, currentRank.min + 1) - currentRank.min)) * 100
  );
  const upcomingRevisions = revisions
    .filter((r) => !r.done)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 6);

  // Chapters not yet completed for the selected subject (drives the chapter dropdown)
  const availableChapters = SYLLABUS[formSubject].filter(
    (ch) => !completedChapters.includes(`${formSubject}::${ch.name}`)
  );
  const alreadyQueuedNames = missions
    .filter((m) => m.subject === formSubject && !m.isMicro)
    .map((m) => m.name);

  // ── Print-zone computed values ────────────────────────────────────────────────
  const printGeneratedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).toUpperCase();
  const printTotalPyqs  = warArchives.reduce((s, a) => s + (a.finalPyqCount     || 0), 0);
  const printTotalMins  = warArchives.reduce((s, a) => s + (a.timeSpentMinutes  || 0), 0);
  const printTotalHours = (printTotalMins / 60).toFixed(1);

  // ── PDF trigger ───────────────────────────────────────────────────────────────
  /**
   * handleDownloadPDF
   * Calls window.print(). The <style> @media print block below hides
   * body * and reveals only #archive-print-root, producing a clean PDF.
   */
  const handleDownloadPDF = () => {
    window.print();
  };

  // ── Event handlers ────────────────────────────────────────────────────────────

  // Subject dropdown → auto-advance chapter dropdown to first uncompleted chapter
  const handleSubjectChange = (newSubject) => {
    const firstAvailable = SYLLABUS[newSubject].find(
      (ch) => !completedChapters.includes(`${newSubject}::${ch.name}`)
    );
    setFormSubject(newSubject);
    setFormChapter(firstAvailable?.name || '');
    setFormDiff(firstAvailable?.diff   || 'M');
  };

  // Chapter dropdown → auto-fill difficulty from syllabus metadata
  const handleChapterChange = (chapterName) => {
    const chapter = SYLLABUS[formSubject].find((ch) => ch.name === chapterName);
    setFormChapter(chapterName);
    if (chapter) setFormDiff(chapter.diff);
  };

  const handleAddMission = () => {
    if (!formChapter) return;
    const alreadyQueued = missions.some(
      (m) => m.subject === formSubject && m.name === formChapter
    );
    if (alreadyQueued) return;

    const newMission = {
      id:        Date.now().toString(),
      name:      formChapter,
      subject:   formSubject,
      diff:      formDiff,
      pyqs:      Number(formPyqCount) || 0,
      createdAt: Date.now(),
    };
    setMissions((prev) => [newMission, ...prev]);

    // Advance form to next uncompleted chapter
    const nextAvailable = SYLLABUS[formSubject].find(
      (ch) =>
        !completedChapters.includes(`${formSubject}::${ch.name}`) &&
        ch.name !== formChapter
    );
    setFormChapter(nextAvailable?.name || '');
    setFormDiff(nextAvailable?.diff   || 'M');
    setFormPyqCount(0);
  };

  const handleIgnite = () => {
    const subjectKeys  = Object.keys(SYLLABUS);
    const randomSubj   = subjectKeys[Math.floor(Math.random() * subjectKeys.length)];
    const microMission = {
      id:        `micro_${Date.now()}`,
      name:      '⚡ MICRO-MISSION: 1 PYQ NOW',
      subject:   randomSubj,
      diff:      'E',
      pyqs:      1,
      isMicro:   true,
      createdAt: Date.now(),
    };
    setMissions((prev) => [microMission, ...prev]);
    setActiveTimerTask(microMission);
  };

  /**
   * handleAnnihilate
   * Removes the mission, marks the chapter completed in the Syllabus Vault
   * (key format: "Subject::Chapter Name"), awards XP, writes to WAR_ARCHIVES,
   * and schedules spaced-repetition revisions at +1d / +3d / +7d.
   */
  const handleAnnihilate = (task, comboLevel, velocityMultiplier) => {
    const chapterKey = `${task.subject}::${task.name}`;

    setMissions((prev) => prev.filter((m) => m.id !== task.id));

    // Mark chapter complete → strikes it through in Syllabus Vault
    if (!task.isMicro && !completedChapters.includes(chapterKey)) {
      setCompletedChapters((prev) => [...prev, chapterKey]);
    }

    // XP
    const baseXP      = XP_MAP[task.diff] || 150;
    const hadVelocity = comboLevel > 0;
    const xpEarned    = hadVelocity ? Math.round(baseXP * velocityMultiplier) : baseXP;
    setTotalXP((prev) => prev + xpEarned);
    setXpFloatData({ xpAmount: xpEarned, hasVelocityBonus: hadVelocity, id: Date.now() });

    if (!task.isMicro) {
      const timeSpentSeconds = LS.get(`time_spent_${task.id}`, 0);
      const pyqsSolved       = LS.get(`solved_${task.id}`, 0);

      const archiveEntry = {
        id:               task.id,
        chapterName:      task.name,
        subject:          task.subject,
        difficulty:       task.diff,
        finalPyqCount:    pyqsSolved,
        timeSpentMinutes: Math.round(timeSpentSeconds / 60),
        xpEarned,
        hadVelocityBonus: hadVelocity,
        completedAt:      Date.now(),
        completedDate:    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        completedTime:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };

      // Persist WAR_ARCHIVES to localStorage immediately
      const existingArchives = LS.get('WAR_ARCHIVES', []);
      LS.set('WAR_ARCHIVES', [archiveEntry, ...existingArchives]);
      setWarArchives((prev) => [archiveEntry, ...prev]);

      // Spaced repetition schedule
      const nowMs = Date.now();
      setRevisions((prev) => [
        ...prev,
        { id: `${task.id}_r1`, chapterName: task.name, subject: task.subject, dueDate: nowMs + 1 * 86400000, revNum: 1 },
        { id: `${task.id}_r3`, chapterName: task.name, subject: task.subject, dueDate: nowMs + 3 * 86400000, revNum: 2 },
        { id: `${task.id}_r7`, chapterName: task.name, subject: task.subject, dueDate: nowMs + 7 * 86400000, revNum: 3 },
      ]);
    }

    LS.remove(`timer_${task.id}`);
    LS.remove(`solved_${task.id}`);
    LS.remove(`time_spent_${task.id}`);
    fireConfetti(task.diff);
  };

  const handleDeleteMission = (taskId) => {
    setMissions((prev) => prev.filter((m) => m.id !== taskId));
    LS.remove(`timer_${taskId}`);
    LS.remove(`solved_${taskId}`);
    LS.remove(`time_spent_${taskId}`);
  };

  /** Chapters for one subject sorted pending → completed. */
  const getSortedChaptersForSubject = (subject) => {
    const all       = SYLLABUS[subject];
    const pending   = all.filter((ch) => !completedChapters.includes(`${subject}::${ch.name}`));
    const completed = all.filter((ch) =>  completedChapters.includes(`${subject}::${ch.name}`));
    return [...pending, ...completed];
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: 'linear-gradient(180deg, #020508 0%, #030810 50%, #020508 100%)',
        color:      '#e0f0ff',
      }}
    >
      {/*
        ═══════════════════════════════════════════════════════════════════════
        PRINT / PDF STYLES
        ═══════════════════════════════════════════════════════════════════════
        Exact rules as specified:
          • body *            → visibility: hidden
          • #archive-print-root, #archive-print-root * → visibility: visible
          • #archive-print-root → position absolute, left 0, top 0, width 100%
          • .no-print         → display: none
        The hidden div below (id="archive-print-root") becomes the entire
        printed page. window.print() is called by handleDownloadPDF().
        ═══════════════════════════════════════════════════════════════════════
      */}
      <style>{`
        @media print {
          /* Hide everything on the screen */
          body * { visibility: hidden !important; background: none !important; }

          /* Show ONLY the archive table and its children */
          #archive-print-root,
          #archive-print-root * {
            visibility: visible !important;
            color: black !important;
          }

          /* Force the archive to start at the very top-left of page 1 */
          #archive-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }

          /* Remove neon shadows/backgrounds for the printer */
          .no-print { display: none !important; }

          /* ── Print typography ───────────────────────────────────────────── */
          #archive-print-root {
            font-family: 'Courier New', Courier, monospace;
            padding: 32px;
            box-sizing: border-box;
          }
          .print-header {
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #222;
            padding-bottom: 16px;
          }
          .print-title { font-size: 22px; font-weight: 900; letter-spacing: 4px; }
          .print-sub   { font-size: 11px; color: #555; margin-top: 4px; letter-spacing: 2px; }
          .print-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            padding: 12px;
            border: 1px solid #ccc;
          }
          .print-stat     { text-align: center; }
          .print-stat-val { font-size: 22px; font-weight: 900; }
          .print-stat-lbl { font-size: 9px; letter-spacing: 2px; color: #555; }
          .print-table                       { width: 100%; border-collapse: collapse; font-size: 11px; }
          .print-table th                    { border-bottom: 2px solid #222; padding: 6px 8px; text-align: left; font-size: 9px; letter-spacing: 1px; background: #f5f5f5; }
          .print-table td                    { border-bottom: 1px solid #ddd; padding: 6px 8px; }
          .print-table tr:nth-child(even) td { background: #fafafa; }
          .print-footer { margin-top: 20px; font-size: 9px; color: #888; text-align: center; letter-spacing: 1px; }

          @page { margin: 1.5cm; }
        }
      `}</style>

      {/*
        ═══════════════════════════════════════════════════════════════════════
        HIDDEN PRINT ZONE
        Always in the DOM. Invisible on screen (display:none).
        @media print makes it the only visible element on the page.
        id="archive-print-root" matches the CSS selector above exactly.
        ═══════════════════════════════════════════════════════════════════════
      */}
      <div id="archive-print-root" style={{ display: 'none' }}>
        <div className="print-header">
          <div className="print-title">MHT-CET NEXUS — INTEL REPORT</div>
          <div className="print-sub">CLASSIFIED WAR ARCHIVES • GENERATED {printGeneratedDate}</div>
          <div className="print-sub" style={{ marginTop: 4 }}>
            OPERATIVE RANK: {currentRank.rank} • TOTAL XP: {totalXP.toLocaleString()}
          </div>
        </div>

        <div className="print-stats">
          <div className="print-stat">
            <div className="print-stat-val">{warArchives.length}</div>
            <div className="print-stat-lbl">MISSIONS COMPLETE</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-val">{printTotalPyqs}</div>
            <div className="print-stat-lbl">TOTAL PYQs SOLVED</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-val">{printTotalHours}h</div>
            <div className="print-stat-lbl">HOURS INVESTED</div>
          </div>
          <div className="print-stat">
            <div className="print-stat-val">{totalXP.toLocaleString()}</div>
            <div className="print-stat-lbl">XP EARNED</div>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>CHAPTER</th>
              <th>SUBJECT</th>
              <th>DIFFICULTY</th>
              <th>PYQs SOLVED</th>
              <th>TIME SPENT</th>
              <th>XP EARNED</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            {warArchives.map((entry, index) => (
              <tr key={entry.id}>
                <td>{warArchives.length - index}</td>
                <td>{entry.chapterName}{entry.hadVelocityBonus ? ' ⚡' : ''}</td>
                <td>{entry.subject}</td>
                <td>{DIFF_LABELS_PRINT[entry.difficulty] || entry.difficulty}</td>
                <td style={{ textAlign: 'center' }}>{entry.finalPyqCount || 0}</td>
                <td style={{ textAlign: 'center' }}>{entry.timeSpentMinutes > 0 ? `${entry.timeSpentMinutes}m` : '—'}</td>
                <td style={{ textAlign: 'center' }}>{entry.xpEarned}</td>
                <td>{entry.completedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
          MHT-CET NEXUS • NEURO-WARFARE PROTOCOL v3.0 • ALL DATA IS PROPERTY OF THE OPERATIVE
        </div>
      </div>

      {/* ── Floating XP animation ── */}
      <AnimatePresence>
        {xpFloatData && (
          <XPFloatAnimation
            key={xpFloatData.id}
            xpAmount={xpFloatData.xpAmount}
            hasVelocityBonus={xpFloatData.hasVelocityBonus}
            onAnimationDone={() => setXpFloatData(null)}
          />
        )}
      </AnimatePresence>

      {/* ── War Archive Modal ── */}
      <AnimatePresence>
        {showArchiveModal && (
          <WarArchiveModal
            archives={warArchives}
            onClose={() => setShowArchiveModal(false)}
            totalXP={totalXP}
            rankName={currentRank.rank}
            onDownloadPDF={handleDownloadPDF}
          />
        )}
      </AnimatePresence>

      {/* ── Timer Modal ── */}
      <AnimatePresence>
        {activeTimerTask && (
          <TimerModal
            task={activeTimerTask}
            onClose={() => { setActiveTimerTask(null); setIsTimerRunning(false); }}
            onTimerStateChange={setIsTimerRunning}
            vigilanceMode={vigilanceMode}
          />
        )}
      </AnimatePresence>

      {/* ── Focus dimmer (timer running but modal closed) ── */}
      <AnimatePresence>
        {isTimerRunning && !activeTimerTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          />
        )}
      </AnimatePresence>

      {/* ══ HEADER ══ */}
      <header
        className="no-print sticky top-0 z-50 border-b"
        style={{ background: 'rgba(5,10,14,0.97)', backdropFilter: 'blur(12px)', borderColor: '#1a2f4a' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.5)' }}>
              <Atom size={16} color="#00f5ff" />
            </div>
            <div>
              <div className="font-mono text-sm font-black tracking-widest" style={{ color: '#00f5ff', textShadow: '0 0 10px #00f5ff' }}>
                MHT-CET NEXUS
              </div>
              <div className="font-mono text-gray-600 tracking-widest" style={{ fontSize: 9 }}>NEURO-WARFARE v3.0</div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-4">
            {/* War Archives */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider transition-all"
              style={{
                background: warArchives.length > 0 ? 'rgba(255,165,0,0.1)' : 'rgba(30,30,30,0.4)',
                border:     `1px solid ${warArchives.length > 0 ? 'rgba(255,165,0,0.5)' : '#2a3040'}`,
                color:      warArchives.length > 0 ? '#ffa500' : '#3a4a5a',
                fontSize:   10,
              }}
            >
              <FolderOpen size={11} />
              <span className="hidden sm:inline">WAR ARCHIVES</span>
              {warArchives.length > 0 && (
                <span className="font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,165,0,0.2)', color: '#ffa500', fontSize: 9 }}>
                  {warArchives.length}
                </span>
              )}
            </motion.button>

            {/* Vigilance toggle */}
            <button
              onClick={() => setVigilanceMode((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider transition-all"
              style={{
                background: vigilanceMode ? 'rgba(0,255,65,0.12)' : 'rgba(30,30,30,0.5)',
                border:     `1px solid ${vigilanceMode ? '#00ff41' : '#2a3f2a'}`,
                color:      vigilanceMode ? '#00ff41' : '#3a5a3a',
                fontSize:   10,
              }}
            >
              {vigilanceMode ? <Eye size={11} /> : <EyeOff size={11} />}
              VIGILANCE
            </button>

            {/* Rank */}
            <div className="text-right hidden sm:block">
              <div className="font-mono tracking-widest text-gray-500" style={{ fontSize: 10 }}>RANK</div>
              <div className="font-mono text-sm font-black" style={{ color: '#ff00ff', textShadow: '0 0 8px #ff00ff' }}>
                {currentRank.rank}
              </div>
            </div>

            {/* Total XP */}
            <div className="text-right">
              <div className="font-mono tracking-widest text-gray-500" style={{ fontSize: 10 }}>TOTAL XP</div>
              <div className="font-mono text-sm font-black" style={{ color: '#00ff41', textShadow: '0 0 8px #00ff41' }}>
                {totalXP.toLocaleString()}
              </div>
            </div>

            {/* Chapter progress pill */}
            <div className="hidden sm:block">
              <div className="font-mono text-gray-600 mb-1" style={{ fontSize: 9 }}>
                {completedChapters.length}/{TOTAL_CHAPTERS}
              </div>
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: '#00ff41', boxShadow: '0 0 6px #00ff41' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* ══ IGNITION SWITCH ══ */}
        <IgnitionSwitch onIgnite={handleIgnite} />

        {/* ══ SECTION 1: MISSION BUILDER ══ */}
        <section style={{ opacity: isTimerRunning ? 0.5 : 1, transition: 'opacity 0.4s', pointerEvents: isTimerRunning ? 'none' : 'auto' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00f5ff, transparent)' }} />
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00f5ff', textShadow: '0 0 8px #00f5ff' }}>
              ◈ TODAY&apos;S MISSION BUILDER
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00f5ff, transparent)' }} />
          </div>

          <div className="p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: '1px solid rgba(0,245,255,0.2)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

              {/* ① Subject dropdown */}
              <div className="lg:col-span-1">
                <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>TARGET SUBJECT</label>
                <div className="relative">
                  <select
                    value={formSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-sm focus:outline-none appearance-none pr-8"
                    style={{
                      background: 'rgba(0,245,255,0.06)',
                      border:     `1px solid ${SUBJECT_CONFIG[formSubject]?.color || '#00f5ff'}60`,
                      color:      SUBJECT_CONFIG[formSubject]?.color || '#00f5ff',
                    }}
                  >
                    {Object.keys(SYLLABUS).map((subj) => (
                      <option key={subj} value={subj} style={{ background: '#060d1a', color: '#e0f0ff' }}>
                        {subj}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: SUBJECT_CONFIG[formSubject]?.color || '#00f5ff' }}
                  />
                </div>
              </div>

              {/* ② Chapter dropdown — shows only uncompleted chapters for selected subject */}
              <div className="lg:col-span-2">
                <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>
                  TARGET CHAPTER{' '}
                  <span className="text-gray-700">({availableChapters.length} remaining)</span>
                </label>
                <div className="relative">
                  {availableChapters.length === 0 ? (
                    <div className="w-full px-3 py-2 font-mono text-xs" style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.2)', color: '#00ff41' }}>
                      ✓ ALL CHAPTERS ANNIHILATED
                    </div>
                  ) : (
                    <>
                      <select
                        value={formChapter}
                        onChange={(e) => handleChapterChange(e.target.value)}
                        className="w-full px-3 py-2 font-mono text-sm focus:outline-none appearance-none pr-8"
                        style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.25)', color: '#e0f0ff' }}
                      >
                        {availableChapters.map((ch) => {
                          const isQueued = alreadyQueuedNames.includes(ch.name);
                          return (
                            <option key={ch.name} value={ch.name} style={{ background: '#060d1a', color: isQueued ? '#4a6080' : '#e0f0ff' }}>
                              {isQueued ? `⟳ ${ch.name} (queued)` : ch.name}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                    </>
                  )}
                </div>
              </div>

              {/* ③ Difficulty (auto-filled from chapter metadata, manually overrideable) */}
              <div>
                <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>
                  DIFFICULTY {formChapter && <span className="text-gray-700">(auto)</span>}
                </label>
                <div className="flex gap-1.5">
                  {['E', 'M', 'H'].map((diffKey) => {
                    const diffCfg    = DIFF_CONFIG[diffKey];
                    const isSelected = formDiff === diffKey;
                    return (
                      <button
                        key={diffKey}
                        onClick={() => setFormDiff(diffKey)}
                        className="flex-1 py-2 font-mono text-xs font-black transition-all"
                        style={{
                          background: isSelected ? `${diffCfg.color}20` : 'rgba(0,0,0,0.3)',
                          border:     `1px solid ${isSelected ? diffCfg.color : '#1a2f4a'}`,
                          color:      isSelected ? diffCfg.color : '#4a6080',
                        }}
                      >
                        {diffKey}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ④ PYQ count + Deploy */}
              <div>
                <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>TARGET PYQs</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formPyqCount}
                    onChange={(e) => setFormPyqCount(e.target.value)}
                    min="0"
                    className="w-16 px-2 py-2 font-mono text-sm text-center focus:outline-none"
                    style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', color: '#e0f0ff' }}
                  />
                  <button
                    onClick={handleAddMission}
                    disabled={!formChapter}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 font-mono text-xs font-black tracking-wider transition-all"
                    style={{
                      background: formChapter ? 'rgba(0,245,255,0.15)' : 'rgba(20,30,40,0.4)',
                      border:     `1px solid ${formChapter ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.1)'}`,
                      color:      formChapter ? '#00f5ff' : '#2a4a5a',
                      cursor:     formChapter ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Plus size={14} /> DEPLOY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mission cards */}
          <AnimatePresence mode="popLayout">
            {missions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 border border-dashed"
                style={{ borderColor: '#1a2f4a' }}
              >
                <Target size={32} className="mx-auto mb-3 text-gray-700" />
                <p className="font-mono text-sm text-gray-600">NO ACTIVE MISSIONS — DEPLOY YOUR FIRST TARGET</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {missions.map((task) => (
                  <MissionCard
                    key={task.id}
                    task={task}
                    onAnnihilate={handleAnnihilate}
                    onOpenTimer={setActiveTimerTask}
                    onDelete={handleDeleteMission}
                    timerRunning={isTimerRunning}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* ══ SECTION 2: GLOBAL PROGRESS + RANK ══ */}
        <section style={{ opacity: isTimerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00ff41, transparent)' }} />
            <span className="font-mono text-xs tracking-widest" style={{ color: '#00ff41', textShadow: '0 0 8px #00ff41' }}>
              ◈ NEXUS CORE — GLOBAL PROGRESS
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00ff41, transparent)' }} />
          </div>

          <div className="p-6" style={{ background: 'linear-gradient(135deg, #061a0f, #050a0e)', border: '1px solid rgba(0,255,65,0.25)' }}>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { val: completedChapters.length,                  label: 'ELIMINATED',  color: '#00ff41' },
                { val: TOTAL_CHAPTERS - completedChapters.length, label: 'REMAINING',   color: '#ffffff' },
                { val: `${Math.round(progressPercent)}%`,         label: 'ANNIHILATED', color: '#00f5ff' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-mono text-3xl font-black" style={{ color: stat.color, textShadow: `0 0 8px ${stat.color}` }}>
                    {stat.val}
                  </div>
                  <div className="font-mono text-gray-500 tracking-widest" style={{ fontSize: 10 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Dominance bar */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-gray-500 tracking-widest" style={{ fontSize: 10 }}>SYLLABUS DOMINATION</span>
                <span className="font-mono text-xs" style={{ color: '#00ff41' }}>
                  {completedChapters.length} / {TOTAL_CHAPTERS}
                </span>
              </div>
              <div className="relative h-8 overflow-hidden" style={{ background: '#050f08', border: '1px solid rgba(0,255,65,0.2)' }}>
                <motion.div
                  className="absolute left-0 top-0 h-full"
                  style={{ background: 'linear-gradient(90deg, #00ff41, #00f5ff)', boxShadow: '0 0 15px rgba(0,255,65,0.8)' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs font-black text-white" style={{ mixBlendMode: 'difference' }}>
                    {Math.round(progressPercent)}% DOMINANCE
                  </span>
                </div>
              </div>
            </div>

            {/* Rank bar */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#1a2f4a' }}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Award size={14} color="#ff00ff" />
                  <span className="font-mono text-xs font-black" style={{ color: '#ff00ff', textShadow: '0 0 8px #ff00ff' }}>
                    {currentRank.rank}
                  </span>
                </div>
                <span className="font-mono text-xs text-gray-500">
                  {totalXP} / {nextRank.min} XP → {nextRank.rank}
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0a0810', border: '1px solid rgba(255,0,255,0.2)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #ff00ff, #ff69b4)', boxShadow: '0 0 10px rgba(255,0,255,0.8)' }}
                  animate={{ width: `${rankProgressPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 2.5: MEMORY HACK NODES ══ */}
        {upcomingRevisions.length > 0 && (
          <section style={{ opacity: isTimerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ffff00, transparent)' }} />
              <span className="font-mono text-xs tracking-widest" style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>
                ◈ MEMORY HACK NODES
              </span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ffff00, transparent)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcomingRevisions.map((rev) => (
                <RevisionCard key={rev.id} revisionEntry={rev} />
              ))}
            </div>
          </section>
        )}

        {/* ══ SECTION 3: THE SYLLABUS VAULT ══ */}
        <section style={{ opacity: isTimerRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ff00ff, transparent)' }} />
            <span className="font-mono text-xs tracking-widest" style={{ color: '#ff00ff', textShadow: '0 0 8px #ff00ff' }}>
              ◈ THE SYLLABUS VAULT
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ff00ff, transparent)' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(SYLLABUS).map(([subject]) => {
              const subjectConfig  = SUBJECT_CONFIG[subject];
              const SubjectIcon    = subjectConfig.icon;
              const sortedChapters = getSortedChaptersForSubject(subject);
              const completedCount = sortedChapters.filter(
                (ch) => completedChapters.includes(`${subject}::${ch.name}`)
              ).length;
              const totalCount  = sortedChapters.length;
              const subjectFill = (completedCount / totalCount) * 100;

              return (
                <motion.div
                  key={subject}
                  layout
                  className="overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: `1px solid ${subjectConfig.color}25` }}
                >
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${subjectConfig.color}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <SubjectIcon size={18} style={{ color: subjectConfig.color, filter: `drop-shadow(0 0 6px ${subjectConfig.color})` }} />
                      <span className="font-mono text-sm font-black tracking-widest" style={{ color: subjectConfig.color, textShadow: `0 0 10px ${subjectConfig.color}` }}>
                        {subjectConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: subjectConfig.color, boxShadow: `0 0 6px ${subjectConfig.color}` }}
                          animate={{ width: `${subjectFill}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <span className="font-mono" style={{ color: subjectConfig.color, fontSize: 10 }}>{completedCount}/{totalCount}</span>
                    </div>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    {sortedChapters.map((chapter, idx) => (
                      <ChapterItem
                        key={chapter.name}
                        chapter={chapter}
                        isCompleted={completedChapters.includes(`${subject}::${chapter.name}`)}
                        animDelay={idx * 0.03}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="text-center py-6">
          <div className="font-mono tracking-widest" style={{ color: '#1a2f4a', fontSize: 10 }}>
            MHT-CET NEXUS • {TOTAL_CHAPTERS} CHAPTERS • NEURO-WARFARE PROTOCOL • ALL SYSTEMS OPERATIONAL
          </div>
          <div className="font-mono mt-1" style={{ color: '#111c2a', fontSize: 9 }}>
            PERSISTENCE: localStorage • VIGILANCE: Active • VELOCITY STREAK: 4-min window • XP: Real-time
          </div>
        </footer>

      </div>
    </div>
  );
}
