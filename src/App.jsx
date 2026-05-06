import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Zap, Target, Shield, Sword, Clock, CheckCircle,
  ChevronDown, Plus, Trash2, Play, Pause, RotateCcw,
  Award, AlertTriangle, BookOpen, Atom, FlaskConical,
  Calculator, X, Flame, Radio, Skull, Eye, EyeOff,
  FolderOpen, Download, Archive, Lock, Star, Cpu,
  Activity, TrendingUp, Wifi, WifiOff, Coffee, Film,
  Zap as ZapIcon, Map, Navigation, Calendar, TrendingDown,
} from 'lucide-react';

import NeuralDestinyGacha, { GachaStatusIcon } from './NeuralDestinyGacha';
import ResonanceSiege, { useBossModeTheme } from './ResonanceSiege';

import MemoryFragmentModal, { EchoMarquee, playEchoPacket, playChapterCompletion, stopCompletionAudio, } from './MemoryFragmentModal';
import NeuralSanctum, { useSanctumState, GhostCamOverlay, EchoDailyLog, MemoryCanvas, BreakStasisPanel, } from './NeuralSanctum';
import ECHO_NARRATIVE, { getChapterIndexFromKey, getNarrativeByChapter, } from './narrativeContent';

// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SYLLABUS = {
  Physics: [
    { name: 'Structure of Atom',          diff: 'E' },
    { name: 'Rotational Dynamics',        diff: 'H' },
    { name: 'Kinetic Theory of Gases',    diff: 'M' },
    { name: 'Wave Optics',                diff: 'H' },
    { name: 'Dual Nature of Radiation',   diff: 'M' },
    { name: 'Semiconductors',             diff: 'E' },
  ],
  Chemistry: [
    { name: 'Atomic Structure',           diff: 'E' },
    { name: 'Basic Concepts of Chemistry',diff: 'E' },
    { name: 'Chemical Thermodynamics',    diff: 'M' },
    { name: 'Solutions',                  diff: 'H' },
    { name: 'Electrochemistry',           diff: 'H' },
    { name: 'Ionic Equilibrium',          diff: 'H' },
    { name: 'Halogen Derivatives',        diff: 'E' },
    { name: 'Alcohols, Phenols and Ethers', diff: 'M' },
    { name: 'Amines',                     diff: 'M' },
    { name: 'Transition Elements',        diff: 'E' },
  ],
  Mathematics: [
    { name: 'Pair of Lines',               diff: 'M' },
    { name: 'Line & Plane',                diff: 'M' },
    { name: 'Differentiation',             diff: 'H' },
    { name: 'Applications of Derivatives', diff: 'H' },
    { name: 'Differential Equations',      diff: 'H' },
  ],
};

const EPISODES = [
  {
    id: 1, title: 'The Atomic Awakening', subtitle: 'Season Premiere', color: '#00f5ff',
    chapters: [
      { subject: 'Physics',   name: 'Structure of Atom'           },
      { subject: 'Chemistry', name: 'Atomic Structure'            },
      { subject: 'Chemistry', name: 'Basic Concepts of Chemistry' },
    ],
  },
  {
    id: 2, title: 'Thermodynamic Reckoning', subtitle: 'The Heat Protocol', color: '#ff6b00',
    chapters: [
      { subject: 'Chemistry',   name: 'Chemical Thermodynamics' },
      { subject: 'Physics',     name: 'Kinetic Theory of Gases' },
      { subject: 'Mathematics', name: 'Pair of Lines'           },
    ],
  },
  {
    id: 3, title: 'Equilibrium & Chaos', subtitle: 'The Balance Breaks', color: '#ff00ff',
    chapters: [
      { subject: 'Chemistry',   name: 'Ionic Equilibrium' },
      { subject: 'Chemistry',   name: 'Solutions'         },
      { subject: 'Mathematics', name: 'Line & Plane'      },
    ],
  },
  {
    id: 4, title: 'Electrochemical Storm', subtitle: 'Current Wars', color: '#ffff00',
    chapters: [
      { subject: 'Chemistry', name: 'Electrochemistry'    },
      { subject: 'Physics',   name: 'Semiconductors'      },
      { subject: 'Physics',   name: 'Rotational Dynamics' },
    ],
  },
  {
    id: 5, title: 'Derivatives of Destruction', subtitle: 'Calculus Apocalypse', color: '#00ff41',
    chapters: [
      { subject: 'Mathematics', name: 'Differentiation'             },
      { subject: 'Mathematics', name: 'Applications of Derivatives' },
      { subject: 'Physics',     name: 'Wave Optics'                 },
    ],
  },
  {
    id: 6, title: 'Organic Uprising', subtitle: 'Carbon Strikes Back', color: '#7fff00',
    chapters: [
      { subject: 'Chemistry', name: 'Halogen Derivatives'          },
      { subject: 'Chemistry', name: 'Alcohols, Phenols and Ethers' },
      { subject: 'Chemistry', name: 'Amines'                       },
    ],
  },
  {
    id: 7, title: 'The Final Nexus', subtitle: 'Season Finale', color: '#ffa500',
    chapters: [
      { subject: 'Chemistry',   name: 'Transition Elements'      },
      { subject: 'Physics',     name: 'Dual Nature of Radiation' },
      { subject: 'Mathematics', name: 'Differential Equations'   },
    ],
  },
];

const TOTAL_CHAPTERS     = Object.values(SYLLABUS).flat().length;
const SYLLABUS_FLAT = Object.entries(SYLLABUS).flatMap(([subject, chapters]) =>
  chapters.map(ch => ({ subject, name: ch.name, diff: ch.diff }))
);
const XP_MAP             = { H: 500, M: 300, E: 150 };
const HOURS_MAP          = { H: 5,   M: 3,   E: 1.5 };
const POMODORO_WORK      = 25 * 60;
const POMODORO_BREAK     = 5  * 60;
const COMBO_WINDOW_MS    = 4  * 60 * 1000;
const VIGILANCE_IDLE_MS  = 10 * 60 * 1000;
const COMBO_MULTIPLIERS  = [1, 2, 5, 10, 20, 50];

// ── INTEGRITY DECAY ─────────────────────────────────────────────────
// Passive decay: 5% per hour of inactivity.
// Implemented as a per-minute tick so the rate is always accurate.
const INTEGRITY_DECAY_PER_HOUR   = 5;                                 // %/hr
const INTEGRITY_DECAY_PER_MINUTE = INTEGRITY_DECAY_PER_HOUR / 60;    // ≈ 0.0833 %/min
const INTEGRITY_RESTORE_AMOUNT   = 20;                                // restored when timer starts

// ── NEURAL ALARM THRESHOLD ──────────────────────────────────────────
const ALARM_INTEGRITY_THRESHOLD   = 60;
const VIGNETTE_INTEGRITY_THRESHOLD = 40;

const POWER_HOUR_DURATION_MS = 90 * 60 * 1000;
const POWER_HOUR_MULTIPLIER  = 2;

const LEISURE_MINUTES_PER_PYQ = 2;

const MICRO_MISSION_TARGET_PYQS    = 2;
const MICRO_MISSION_DURATION_SECS  = 10 * 60;

const WAR_WINDOW_DAYS = 8;

const DIFF_CONFIG = {
  H: { label: 'BOSS BATTLE', color: '#ff00ff', bg: 'rgba(255,0,255,0.1)',  icon: Sword  },
  M: { label: 'ELITE ENEMY', color: '#ff6b00', bg: 'rgba(255,107,0,0.1)', icon: Shield },
  E: { label: 'MINION',      color: '#00ff41', bg: 'rgba(0,255,65,0.1)',   icon: Target },
};

const DIFF_LABELS_PRINT = { H: 'BOSS', M: 'ELITE', E: 'MINION' };

const SUBJECT_CONFIG = {
  Physics:     { color: '#00f5ff', icon: Atom,        label: 'PHYSICS',     stat: 'strength'     },
  Chemistry:   { color: '#ff00ff', icon: FlaskConical, label: 'CHEMISTRY',  stat: 'dexterity'    },
  Mathematics: { color: '#00ff41', icon: Calculator,   label: 'MATHEMATICS', stat: 'intelligence' },
};

const SUBJECT_PRINT_COLORS = {
  Physics: '#00f5ff', Chemistry: '#ff00ff', Mathematics: '#00ff41',
};

const RANK_THRESHOLDS = [
  { rank: 'CADET',       min: 0,      max: 50000   },
  { rank: 'RECRUIT',     min: 50000,   max: 70000  },
  { rank: 'SPECIALIST',  min: 100000,  max: 150000  },
  { rank: 'OPERATIVE',   min: 150000,  max: 200000  },
  { rank: 'COMMANDER',   min: 200000,  max: 320000  },
  { rank: 'WARLORD',     min: 320000,  max: 420000 },
  { rank: 'NEXUS ELITE', min: 420000,  max: 500000 },
];

const TIMER_PRESETS = [
  { label: '5m',  seconds: 5  * 60 },
  { label: '25m',  seconds: 25  * 60 },
  { label: '50m', seconds: 50 * 60 },
];

const LEVEL_THRESHOLDS = [
  0, 20000, 50000, 70000, 100000,
  150000, 170000, 200000, 220000, 250000,
  270000, 280000, 300000, 320000, 350000,
  400000, 420000, 450000, 470000, 500000,
];

// ── CAMPAIGN DATE SYSTEM ─────────────────────────────────────────────
const CAMPAIGN_START_DATE = new Date(2026, 4, 1, 6, 0, 0, 0); // May 1 2026 06:00 AM

function getCampaignCurrentDay() {
  const now = new Date();
  const diffMs = now - CAMPAIGN_START_DATE;
  if (diffMs < 0) return 0; // before campaign
  return Math.min(8, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getTodayDateString() {
  // Returns 'YYYY-MM-DD' for the current game day (resets at 06:00 AM)
  const now = new Date();
  if (now.getHours() < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

function getDailyChapterGoal(currentDay) {
  // Distribute 17 remaining chapters across 8 days (from campaign day 1)
  const remaining = CAMPAIGN_CHAPTERS_TOTAL - CAMPAIGN_COMPLETED_BASE;
  return Math.ceil(remaining / CAMPAIGN_TOTAL_DAYS);
}

// Audio context — unlocked on first user gesture
let _audioUnlocked = false;
function markAudioUnlocked() { _audioUnlocked = true; }
function isAudioUnlocked()   { return _audioUnlocked; }

const BOOT_LINES = [
  'System waking...',
  'Neural Link Syncing...',
  "Let's begin the Story of the Greatest.",
];

const DAY_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ═══════════════════════════════════════════════════════════════════
// GHOST PACING CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const CAMPAIGN_TOTAL_DAYS     = 8;
const CAMPAIGN_CHAPTERS_TOTAL = 21;
const CAMPAIGN_COMPLETED_BASE = 4;   // chapters already done before sprint
const CAMPAIGN_REMAINING      = CAMPAIGN_CHAPTERS_TOTAL - CAMPAIGN_COMPLETED_BASE; // 17
const DAILY_START_HOUR        = 6;   // 06:00 AM
const DAILY_END_HOUR          = 26;  // 02:00 AM next day (26 = 24+2)
const DAILY_STUDY_HOURS       = DAILY_END_HOUR - DAILY_START_HOUR; // 20 hours/day
const CAMPAIGN_TOTAL_HOURS    = CAMPAIGN_TOTAL_DAYS * DAILY_STUDY_HOURS; // 160 hours

function getCampaignStartEpoch() {
  // Returns the epoch of 06:00 AM on the day the campaign started.
  // Reads from localStorage so it's anchored to first boot.
  const saved = LS.get('ghost_campaign_start', null);
  if (saved) return saved;
  // First call: anchor to today's 06:00 AM.
  const now = new Date();
  const sixAM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0);
  // If it's currently before 06:00 AM, anchor to yesterday's 06:00 AM.
  if (now < sixAM) sixAM.setDate(sixAM.getDate() - 1);
  const epoch = sixAM.getTime();
  LS.set('ghost_campaign_start', epoch);
  return epoch;
}

// Ghost handicap constants — Challenger difficulty
const GHOST_BASE_CHAPTERS = 6;   // User's 4 done + 2 lead buffer
const GHOST_SLOPE         = CAMPAIGN_CHAPTERS_TOTAL - GHOST_BASE_CHAPTERS; // 21 - 6 = 15

function getGhostMetrics(completedCount) {
  const campaignStart   = getCampaignStartEpoch();
  const campaignEnd     = campaignStart + CAMPAIGN_TOTAL_DAYS * 24 * 3600 * 1000;
  const now             = Date.now();
  const totalDurationMs = campaignEnd - campaignStart;

  // Clamp time fraction to [0, 1] so ghost never overshoots after deadline.
  const elapsedMs       = Math.min(Math.max(now - campaignStart, 0), totalDurationMs);
  const timeFraction    = elapsedMs / totalDurationMs;

  // ── CHALLENGER FORMULA ─────────────────────────────────────────
  // Ghost starts at GHOST_BASE_CHAPTERS and climbs to CAMPAIGN_CHAPTERS_TOTAL
  // over the full 8-day window. Clamped so it never exceeds 21.
  const ghostChapterTarget = Math.min(
    CAMPAIGN_CHAPTERS_TOTAL,
    GHOST_BASE_CHAPTERS + GHOST_SLOPE * timeFraction
  );

  const ghostProgress  = (ghostChapterTarget / CAMPAIGN_CHAPTERS_TOTAL) * 100;  // 0–100
  const actualProgress = (completedCount    / CAMPAIGN_CHAPTERS_TOTAL) * 100;  // 0–100

  const isAhead    = completedCount >= ghostChapterTarget;
  const deltaChaps = Math.abs(ghostChapterTarget - completedCount);
  const deltaPct   = Math.abs(ghostProgress - actualProgress);

  // ── CHAPTERS NEEDED TODAY (by 02:00 AM) ───────────────────────
  // Project where the ghost will be at tonight's 02:00 AM deadline,
  // then subtract what the user has already done.
  const now2             = new Date();
  const todayBase        = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 6, 0, 0, 0);
  // If it's currently before 06:00 AM, the current game-day started yesterday.
  if (now2 < todayBase) todayBase.setDate(todayBase.getDate() - 1);
  // 02:00 AM next calendar day = 20 hours after today's 06:00 AM start.
  const tonightDeadline  = new Date(todayBase.getTime() + 20 * 3600 * 1000);

  const deadlineFraction = Math.min(
    1,
    Math.max(0, (tonightDeadline.getTime() - campaignStart) / totalDurationMs)
  );
  const ghostAtDeadline  = Math.min(
    CAMPAIGN_CHAPTERS_TOTAL,
    GHOST_BASE_CHAPTERS + GHOST_SLOPE * deadlineFraction
  );

  const chaptersNeededToday = Math.max(0, Math.ceil(ghostAtDeadline - completedCount));

  const daysLeft = Math.max(0, (campaignEnd - now) / (24 * 3600 * 1000));

  return {
    ghostProgress,        // 0–100 float  → drives the ghost bar width
    actualProgress,       // 0–100 float  → drives your bar width
    ghostChapterTarget,   // raw float, e.g. 7.34 chapters
    isAhead,
    deltaChaps,
    deltaPct,
    chaptersNeededToday,  // integer, chapters needed before 02:00 AM tonight
    daysLeft,
    campaignStart,
    campaignEnd,
  };
}
// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — PURE HELPERS
// ═══════════════════════════════════════════════════════════════════

function getRank(xp) {
  const found = [...RANK_THRESHOLDS].reverse().find((r) => xp >= r.min);
  return found || RANK_THRESHOLDS[0];
}

function getUserLevel(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

function getLevelProgress(xp) {
  const level            = getUserLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold    = LEVEL_THRESHOLDS[level]     || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = ((xp - currentThreshold) / Math.max(nextThreshold - currentThreshold, 1)) * 100;
  return Math.min(100, Math.max(0, progress));
}

function getSystemTheme(level) {
  if (level >= 15) return 'god';
  if (level >= 8) return 'neon';
  return 'dim';
}

function getGameDay() {
  const now = new Date();
  if (now.getHours() < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

function isNewGameDay(lastLoginEpoch) {
  if (!lastLoginEpoch) return true;
  const lastGameDay = (() => {
    const d = new Date(lastLoginEpoch);
    if (d.getHours() < 6) {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  })();
  return lastGameDay !== getGameDay();
}

function isPowerHourActive(powerHourEnd) {
  if (!powerHourEnd) return false;
  return Date.now() < powerHourEnd;
}

function getPowerHourSecondsLeft(powerHourEnd) {
  if (!powerHourEnd) return 0;
  return Math.max(0, Math.floor((powerHourEnd - Date.now()) / 1000));
}

function stripTime(epoch) {
  const d = new Date(epoch);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isoDay(epoch) {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const LS = {
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch { return defaultValue; }
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

function fireGodModeConfetti() {
  const colors = ['#ffd700', '#ffa500', '#ffff00', '#fff8dc', '#fffacd'];
  confetti({ particleCount: 250, spread: 120, origin: { y: 0.4 }, colors, scalar: 1.8 });
  setTimeout(() => confetti({ particleCount: 100, angle: 115, spread: 80, origin: { x: 0 }, colors }), 200);
  setTimeout(() => confetti({ particleCount: 100, angle: 65,  spread: 80, origin: { x: 1 }, colors }), 350);
  setTimeout(() => confetti({ particleCount: 80,  spread: 140, origin: { y: 0.2 }, colors }), 500);
}

function firePowerHourConfetti() {
  const colors = ['#ffff00', '#ff6b00', '#fff700', '#ffa500'];
  confetti({ particleCount: 200, spread: 110, origin: { y: 0.5 }, colors, scalar: 1.6 });
  setTimeout(() => confetti({ particleCount: 80, angle: 115, spread: 70, origin: { x: 0 }, colors }), 200);
  setTimeout(() => confetti({ particleCount: 80, angle: 65,  spread: 70, origin: { x: 1 }, colors }), 350);
}

function fireNeuralConfetti() {
  const colors = ['#00f5ff', '#00ff41', '#ffffff', '#7fff00'];
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors, scalar: 1.5 });
  setTimeout(() => confetti({ particleCount: 80, angle: 110, spread: 70, origin: { x: 0 }, colors }), 200);
  setTimeout(() => confetti({ particleCount: 80, angle: 70,  spread: 70, origin: { x: 1 }, colors }), 350);
}

function playNeuralSync() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const note = (freq, t, dur, type = 'sine') => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      g.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur);
    };
    note(220, 0, 0.12); note(440, 0.1, 0.12);
    note(880, 0.2, 0.15); note(1760, 0.32, 0.25, 'square');
    note(880, 0.5, 0.4);
  } catch {}
}

function playBootSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const note = (freq, t, dur, type = 'sine') => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur);
    };
    note(110, 0, 0.3, 'sine');
    note(220, 0.3, 0.3, 'sine');
    note(440, 0.6, 0.3, 'sine');
    note(880, 0.9, 0.5, 'square');
    note(1320, 1.4, 0.8, 'sine');
  } catch {}
}

function playComboShatter() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function getGlitchStyles(integrity) {
  if (integrity >= ALARM_INTEGRITY_THRESHOLD) return '';

  const raw60     = (ALARM_INTEGRITY_THRESHOLD - integrity) / ALARM_INTEGRITY_THRESHOLD;
  const intensity = Math.min(1, raw60);

  const shakeAmt = integrity < VIGNETTE_INTEGRITY_THRESHOLD
    ? Math.round(4 + ((VIGNETTE_INTEGRITY_THRESHOLD - integrity) / VIGNETTE_INTEGRITY_THRESHOLD) * 6)
    : Math.round(intensity * 4);

  const scanOpacity = (intensity * 0.12).toFixed(3);
  const animDuration = Math.max(0.18, 0.9 - intensity * 0.65).toFixed(2);

  const vignetteOpacity = integrity < VIGNETTE_INTEGRITY_THRESHOLD
    ? ((VIGNETTE_INTEGRITY_THRESHOLD - integrity) / VIGNETTE_INTEGRITY_THRESHOLD * 0.6).toFixed(3)
    : '0';

  return `
    @keyframes glitch-shake {
      0%,  100% { transform: translate(0, 0) skewX(0deg); }
      10%        { transform: translate(-${shakeAmt}px, 1px) skewX(-${(intensity * 2).toFixed(1)}deg); }
      20%        { transform: translate(${shakeAmt}px, -1px) skewX(${(intensity).toFixed(1)}deg); }
      30%        { transform: translate(-${Math.round(shakeAmt * 0.6)}px, 0px) skewX(0deg); }
      40%        { transform: translate(${Math.round(shakeAmt * 0.8)}px, 1px) skewX(${(intensity * 0.5).toFixed(1)}deg); }
      50%        { transform: translate(0px, 0px) skewX(0deg); }
      60%        { transform: translate(-${Math.round(shakeAmt * 0.4)}px, -1px) skewX(${(intensity * 0.3).toFixed(1)}deg); }
      70%        { transform: translate(${Math.round(shakeAmt * 0.7)}px, 0px) skewX(0deg); }
      80%        { transform: translate(-${Math.round(shakeAmt * 0.5)}px, 1px) skewX(-${(intensity * 0.4).toFixed(1)}deg); }
      90%        { transform: translate(${Math.round(shakeAmt * 0.3)}px, -1px) skewX(0deg); }
    }
    @keyframes scanline-drift {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes vignette-pulse {
      0%, 100% { opacity: ${vignetteOpacity}; }
      50%       { opacity: ${(parseFloat(vignetteOpacity) * 1.4).toFixed(3)}; }
    }
    .glitch-scanlines::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9990;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255, 0, 0, ${scanOpacity}) 2px,
        rgba(255, 0, 0, ${scanOpacity}) 4px
      );
    }
    .glitch-body {
      animation: glitch-shake ${animDuration}s ease-in-out infinite;
    }
    .glitch-color-shift {
      filter: hue-rotate(${Math.round(intensity * 30)}deg) saturate(${(1 + intensity * 0.5).toFixed(2)});
    }
    .vignette-overlay::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9989;
      background: radial-gradient(
        ellipse at center,
        transparent 40%,
        rgba(180, 0, 0, ${vignetteOpacity}) 100%
      );
      animation: vignette-pulse 1.6s ease-in-out infinite;
    }
  `;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3 — CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════════

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

function useGlitchType(targetText, speed = 40, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [isDone,    setIsDone]    = useState(false);
  const GLITCH_CHARS = '░▒▓█▄▌▐▀ⅠⅡⅢ▲▼◆◇';

  useEffect(() => {
    setDisplayed('');
    setIsDone(false);
    let idx       = 0;
    let glitchIdx = 0;
    let startTimer;
    let glitchTimer;
    let revealTimer;

    startTimer = setTimeout(() => {
      glitchTimer = setInterval(() => {
        const rand = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        setDisplayed(() => {
          const glitchLen = Math.min(idx + 3, targetText.length);
          return targetText.slice(0, idx) + Array.from({ length: glitchLen - idx }, () =>
            GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          ).join('') + rand;
        });
        glitchIdx++;
        if (glitchIdx > 4) {
          clearInterval(glitchTimer);
          revealTimer = setInterval(() => {
            if (idx < targetText.length) {
              idx++;
              setDisplayed(targetText.slice(0, idx));
            } else {
              clearInterval(revealTimer);
              setIsDone(true);
            }
          }, speed);
        }
      }, 40);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearInterval(glitchTimer);
      clearInterval(revealTimer);
    };
  }, [targetText, speed, startDelay]);

  return { displayed, isDone };
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 4 — SMALL / STATELESS UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function BootLine({ text, startDelay, onDone, isLast }) {
  const { displayed, isDone } = useGlitchType(text, 35, startDelay);

  useEffect(() => {
    if (isDone && onDone) onDone();
  }, [isDone, onDone]);

  const color = isLast ? '#00f5ff' : '#00ff41';
  const glow  = isLast ? '#00f5ff' : '#00ff41';

  return (
    <div className="flex items-center gap-3 font-mono" style={{ fontSize: isLast ? 22 : 16, minHeight: 32 }}>
      {isDone ? (
        <span style={{ color: '#00ff41', fontSize: 14 }}>✓</span>
      ) : (
        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}
          style={{ color: '#00ff41', fontSize: 14 }}>█</motion.span>
      )}
      <span style={{
        color,
        textShadow: isDone ? `0 0 12px ${glow}` : 'none',
        fontWeight: isLast ? 900 : 400,
        letterSpacing: isLast ? '0.08em' : '0.04em',
      }}>{displayed}</span>
    </div>
  );
}

function BootSequence({ onInitialize }) {
  const [showButton,    setShowButton]    = useState(false);
  const [shatterActive, setShatterActive] = useState(false);
  const [shatterDone,   setShatterDone]   = useState(false);

  const LINE_DELAYS    = [400, 1800, 3600];
  const LINE_DURATIONS = [1000, 1100, 1200];

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), LINE_DELAYS[2] + LINE_DURATIONS[2] + 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    playBootSound();
  }, []);

  const handleInitialize = () => {
    setShatterActive(true);
    setTimeout(() => {
      setShatterDone(true);
      setTimeout(onInitialize, 400);
    }, 900);
  };

  if (shatterDone) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{ background: '#000' }}
      animate={shatterActive ? { opacity: 0, scale: 1.06 } : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)',
      }} />
      <div className="absolute top-8 left-8 font-mono text-green-900" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
        MHT-CET NEXUS v4.0 // NEURAL OS
      </div>
      <div className="absolute top-8 right-8 font-mono text-green-900" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      <div className="relative z-10 w-full max-w-2xl px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="font-mono text-5xl font-black tracking-widest mb-2"
            style={{ color: '#00ff41', textShadow: '0 0 30px #00ff41, 0 0 60px #00ff4160' }}>
            MHT-CET NEXUS
          </div>
          <div className="font-mono text-xs text-green-900 tracking-widest">
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          </div>
        </motion.div>

        <div className="space-y-4 mb-12">
          <BootLine text={BOOT_LINES[0]} startDelay={LINE_DELAYS[0]} isLast={false} />
          <BootLine text={BOOT_LINES[1]} startDelay={LINE_DELAYS[1]} isLast={false} />
          <BootLine text={BOOT_LINES[2]} startDelay={LINE_DELAYS[2]} isLast={true}  />
        </div>

        <AnimatePresence>
          {showButton && !shatterActive && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ type: 'spring', damping: 18 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={handleInitialize}
                animate={{ boxShadow: [
                  '0 0 20px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.2)',
                  '0 0 40px rgba(0,245,255,0.8), 0 0 80px rgba(0,245,255,0.4)',
                  '0 0 20px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.2)',
                ]}}
                transition={{ repeat: Infinity, duration: 1.8 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-5 font-mono font-black tracking-widest text-base"
                style={{
                  background: 'rgba(0,245,255,0.1)',
                  border: '2px solid #00f5ff',
                  color: '#00f5ff',
                  letterSpacing: '0.15em',
                }}
              >
                ⚡ INITIALIZE NEURAL GRIND
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="mt-16">
          <div className="font-mono text-green-900 text-center mb-2" style={{ fontSize: 9, letterSpacing: '0.3em' }}>
            NEURAL OS LOADING
          </div>
          <div className="h-0.5 w-full" style={{ background: '#0a1a0a' }}>
            <motion.div
              className="h-full"
              style={{ background: '#00ff41', boxShadow: '0 0 8px #00ff41' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: LINE_DELAYS[2] / 1000 + LINE_DURATIONS[2] / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PowerHourBanner({ powerHourEnd }) {
  const [secsLeft, setSecsLeft] = useState(() => getPowerHourSecondsLeft(powerHourEnd));

  useEffect(() => {
    const id = setInterval(() => {
      const s = getPowerHourSecondsLeft(powerHourEnd);
      setSecsLeft(s);
      if (s <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [powerHourEnd]);

  if (secsLeft <= 0) return null;

  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <motion.div
        animate={{
          background: [
            'linear-gradient(90deg, rgba(255,215,0,0.15), rgba(255,107,0,0.15), rgba(255,215,0,0.15))',
            'linear-gradient(90deg, rgba(255,107,0,0.15), rgba(255,215,0,0.15), rgba(255,107,0,0.15))',
          ],
        }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="px-4 py-2 flex items-center justify-between"
        style={{ border: '1px solid rgba(255,215,0,0.4)' }}
      >
        <div className="flex items-center gap-3">
          <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Zap size={16} color="#ffd700" />
          </motion.div>
          <span className="font-mono text-xs font-black tracking-widest" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
            ⚡ POWER HOUR ACTIVE — ALL XP DOUBLED (2×)
          </span>
        </div>
        <div className="font-mono font-black text-sm" style={{ color: '#ff6b00', textShadow: '0 0 8px #ff6b00' }}>
          {mins}:{secs}
        </div>
      </motion.div>
    </motion.div>
  );
}

function EntertainmentClearance({ dailyPyqsSolved, onRedeem }) {
  const totalEarned = dailyPyqsSolved * LEISURE_MINUTES_PER_PYQ;
  const [redeemed,  setRedeemed] = useState(() => LS.get('daily_leisure_redeemed', 0));
  const [draining,  setDraining] = useState(false);
  const available = Math.max(0, totalEarned - redeemed);

  useEffect(() => {
    LS.set('daily_leisure_redeemed', redeemed);
  }, [redeemed]);

  const handleRedeem = () => {
    if (available <= 0) return;
    setDraining(true);
    setTimeout(() => {
      setRedeemed((prev) => prev + available);
      setDraining(false);
      if (onRedeem) onRedeem(available);
    }, 1200);
  };

  const pct = totalEarned > 0 ? Math.min(100, (available / totalEarned) * 100) : 0;

  return (
    <div className="p-4" style={{
      background: 'linear-gradient(135deg, rgba(15,5,25,0.95), rgba(8,3,15,0.95))',
      border: '1px solid rgba(148,0,255,0.3)',
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Film size={14} color="#b44fff" />
          <span className="font-mono text-xs font-black tracking-widest" style={{ color: '#b44fff' }}>
            ENTERTAINMENT CLEARANCE
          </span>
        </div>
        <div className="font-mono text-xs" style={{ color: 'rgba(148,0,255,0.6)', fontSize: 9 }}>
          1 PYQ = {LEISURE_MINUTES_PER_PYQ} MIN
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="font-mono" style={{ color: '#b44fff', fontSize: 9 }}>LEISURE BALANCE</span>
            <span className="font-mono font-black" style={{ color: '#b44fff', fontSize: 10 }}>
              {available} min available
            </span>
          </div>
          <div className="h-3 rounded-none overflow-hidden" style={{ background: '#0a0515' }}>
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, #b44fff, #7722ff)', boxShadow: '0 0 8px #b44fff' }}
              animate={{ width: draining ? '0%' : `${pct}%` }}
              transition={{ duration: draining ? 1.2 : 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="font-mono text-gray-700" style={{ fontSize: 8 }}>0 min</span>
            <span className="font-mono text-gray-700" style={{ fontSize: 8 }}>{totalEarned} min EARNED ({dailyPyqsSolved} PYQs today)</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleRedeem}
          disabled={available <= 0 || draining}
          className="px-4 py-2 font-mono text-xs font-black whitespace-nowrap"
          style={{
            background: available > 0 ? 'rgba(180,79,255,0.15)' : 'rgba(30,10,50,0.4)',
            border: `1px solid ${available > 0 ? '#b44fff' : 'rgba(80,20,120,0.3)'}`,
            color: available > 0 ? '#b44fff' : '#3a1f5a',
            cursor: available > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {draining ? '▓▒░ DRAINING...' : available > 0 ? '▶ REDEEM LEISURE' : 'NONE EARNED'}
        </motion.button>
      </div>
      {redeemed > 0 && (
        <div className="font-mono text-xs text-center" style={{ color: 'rgba(100,60,150,0.6)', fontSize: 9 }}>
          {redeemed} MIN REDEEMED TODAY — GUILT-FREE MODE ACTIVATED ✓
        </div>
      )}
    </div>
  );
}

function MicroMissionModal({ onComplete, onAbort }) {
  const [pyqsDone,   setPyqsDone]   = useState(0);
  const [secsLeft,   setSecsLeft]   = useState(MICRO_MISSION_DURATION_SECS);
  const [isRunning,  setIsRunning]  = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed,   setIsFailed]   = useState(false);
  const tickRef = useRef(null);

  const start = () => setIsRunning(true);

  useEffect(() => {
    if (!isRunning) return;
    tickRef.current = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          if (pyqsDone < MICRO_MISSION_TARGET_PYQS) setIsFailed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [isRunning, pyqsDone]);

  const handleAddPYQ = () => {
    if (!isRunning || isComplete || isFailed) return;
    const next = pyqsDone + 1;
    setPyqsDone(next);
    if (next >= MICRO_MISSION_TARGET_PYQS) {
      clearInterval(tickRef.current);
      setIsComplete(true);
      fireNeuralConfetti();
      playNeuralSync();
    }
  };

  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');
  const pct  = (pyqsDone / MICRO_MISSION_TARGET_PYQS) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9992] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative text-center px-10 py-8"
        style={{
          background: 'linear-gradient(135deg, #0a0012, #050008)',
          border: '2px solid #ff00ff',
          boxShadow: '0 0 40px rgba(255,0,255,0.4), 0 0 80px rgba(255,0,255,0.15)',
          minWidth: 380,
        }}
      >
        <button onClick={onAbort} className="absolute top-3 right-3 text-gray-600 hover:text-white">
          <X size={18} />
        </button>

        {!isComplete && !isFailed && (
          <>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
              <AlertTriangle size={32} color="#ff00ff" className="mx-auto mb-3" />
            </motion.div>
            <div className="font-mono text-lg font-black tracking-widest mb-1" style={{ color: '#ff00ff', textShadow: '0 0 16px #ff00ff' }}>
              MICRO-MISSION
            </div>
            <div className="font-mono text-sm text-gray-400 mb-1">LIMBIC OVERRIDE PROTOCOL</div>
            <div className="font-mono text-xs text-gray-600 mb-6">
              Solve exactly {MICRO_MISSION_TARGET_PYQS} PYQs within {MICRO_MISSION_DURATION_SECS / 60} minutes.
            </div>
            <div className="font-mono text-5xl font-black mb-2" style={{ color: secsLeft < 60 ? '#ff0000' : '#ff6b00', textShadow: `0 0 20px ${secsLeft < 60 ? '#ff0000' : '#ff6b00'}` }}>
              {mins}:{secs}
            </div>
            <div className="mb-5">
              <div className="h-3 mx-auto w-48 rounded-full overflow-hidden mb-2" style={{ background: '#1a0020' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #ff00ff, #ff69b4)', boxShadow: '0 0 8px #ff00ff' }}
                  animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }}
                />
              </div>
              <div className="font-mono text-sm font-black" style={{ color: '#ff00ff' }}>
                {pyqsDone} / {MICRO_MISSION_TARGET_PYQS} PYQs SOLVED
              </div>
            </div>
            {!isRunning ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={start}
                className="w-full py-3 font-mono text-sm font-black tracking-widest"
                style={{ background: 'rgba(255,0,255,0.15)', border: '1px solid #ff00ff', color: '#ff00ff' }}
              >▶ BEGIN OVERRIDE</motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleAddPYQ}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-full py-4 font-mono text-sm font-black tracking-widest"
                style={{ background: 'rgba(255,0,255,0.2)', border: '2px solid #ff00ff', color: '#ff00ff', boxShadow: '0 0 20px rgba(255,0,255,0.3)' }}
              >✓ SOLVED ONE PYQ (+1)</motion.button>
            )}
          </>
        )}

        {isComplete && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle size={40} color="#00ff41" className="mx-auto mb-3" />
            <div className="font-mono text-xl font-black tracking-widest mb-2" style={{ color: '#00ff41', textShadow: '0 0 20px #00ff41' }}>
              NEURAL LINK RESTORED
            </div>
            <div className="font-mono text-sm text-gray-400 mb-6">
              Micro-mission complete. Resistance broken. Resume your main mission.
            </div>
            <button onClick={onComplete}
              className="w-full py-3 font-mono font-black text-sm"
              style={{ background: 'rgba(0,255,65,0.15)', border: '1px solid #00ff41', color: '#00ff41' }}
            >↩ RESUME MAIN MISSION</button>
          </motion.div>
        )}

        {isFailed && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Skull size={40} color="#ff0000" className="mx-auto mb-3" />
            <div className="font-mono text-xl font-black tracking-widest mb-2" style={{ color: '#ff0000', textShadow: '0 0 20px #ff0000' }}>
              OVERRIDE FAILED
            </div>
            <div className="font-mono text-sm text-gray-500 mb-6">
              Time expired. The mission continues anyway — get back in.
            </div>
            <button onClick={onAbort}
              className="w-full py-3 font-mono font-black text-sm"
              style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000', color: '#ff4444' }}
            >↩ RETURN TO BASE</button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function XPFloatAnimation({ xpAmount, hasVelocityBonus, isPowerHour, onAnimationDone, theme }) {
  const goldMode = theme === 'god';
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
        color:      goldMode ? '#ffd700' : (hasVelocityBonus ? '#ffff00' : '#00ff41'),
        textShadow: `0 0 20px ${goldMode ? '#ffd700' : (hasVelocityBonus ? '#ffff00' : '#00ff41')}`,
        fontSize: 36, fontWeight: 900,
      }}>+{xpAmount} XP</div>
      {hasVelocityBonus && (
        <div style={{ fontFamily: 'monospace', color: '#ff6b00', textShadow: '0 0 15px #ff6b00', fontSize: 18, fontWeight: 700 }}>
          ⚡ VELOCITY BONUS!
        </div>
      )}
      {isPowerHour && (
        <div style={{ fontFamily: 'monospace', color: '#ffd700', textShadow: '0 0 15px #ffd700', fontSize: 14, fontWeight: 700 }}>
          ⚡ POWER HOUR 2×!
        </div>
      )}
      {goldMode && (
        <div style={{ fontFamily: 'monospace', color: '#ffd700', textShadow: '0 0 15px #ffd700', fontSize: 14, fontWeight: 700 }}>
          ✦ GOD MODE BONUS ✦
        </div>
      )}
    </motion.div>
  );
}

function MemoryNode({ node, onCheck }) {
  const MILESTONES = [
    { key: 'd1', label: '1-DAY', days: 1, prevKey: null },
    { key: 'd3', label: '3-DAY', days: 3, prevKey: 'd1' },
    { key: 'd7', label: '7-DAY', days: 7, prevKey: 'd3' },
  ];

  const checkedCount  = MILESTONES.filter((m) => node.milestones[m.key]).length;
  const hasAnyChecked = checkedCount > 0;
  const sc            = SUBJECT_CONFIG[node.subject] || {};
  const SubIcon       = sc.icon || BookOpen;
  const daysSince     = Math.floor((Date.now() - node.completedAt) / 86400000);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0, scale: 1.06, y: -16,
        boxShadow: '0 0 60px rgba(255,215,0,0.8)',
        transition: { duration: 0.4, ease: 'easeOut' },
      }}
      className="relative overflow-hidden"
      style={{
        background: hasAnyChecked
          ? 'linear-gradient(135deg, rgba(10,20,10,0.95), rgba(5,12,5,0.95))'
          : 'linear-gradient(135deg, rgba(12,10,5,0.95), rgba(8,6,3,0.95))',
        border: `1px solid ${hasAnyChecked ? 'rgba(0,255,65,0.25)' : 'rgba(255,215,0,0.2)'}`,
        boxShadow: hasAnyChecked
          ? '0 0 12px rgba(0,255,65,0.08)'
          : '0 0 8px rgba(255,215,0,0.05)',
      }}
    >
      {hasAnyChecked && checkedCount < 3 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.03, 0.09, 0.03] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.3), transparent 70%)' }}
        />
      )}

      <div className="p-3 pb-2">
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {hasAnyChecked ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="font-mono"
                  style={{ color: '#00f5ff', fontSize: 8, letterSpacing: '0.15em' }}
                >⟳ PROCESSING</motion.span>
              ) : (
                <span className="font-mono" style={{ color: 'rgba(255,215,0,0.5)', fontSize: 8, letterSpacing: '0.15em' }}>⬡ MEMORY NODE</span>
              )}
            </div>
            <div className="font-bold text-sm text-white leading-tight truncate pr-2">{node.chapterName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <SubIcon size={9} style={{ color: sc.color }} />
              <span className="font-mono" style={{ color: sc.color, fontSize: 8 }}>{node.subject}</span>
              <span className="font-mono text-gray-700" style={{ fontSize: 8 }}>• Day {daysSince}</span>
            </div>
          </div>
          <div className="flex gap-1 items-center mt-0.5 flex-shrink-0">
            {MILESTONES.map(({ key }) => (
              <div key={key} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: node.milestones[key] ? '#00ff41' : 'rgba(60,80,60,0.4)',
                boxShadow: node.milestones[key] ? '0 0 5px #00ff41' : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        <div className="flex gap-1.5">
          {MILESTONES.map(({ key, label, days, prevKey }) => {
            const isChecked  = !!node.milestones[key];
            const isUnlocked = !prevKey || !!node.milestones[prevKey];
            const dueDate    = node.completedAt + days * 86400000;
            const isOverdue  = !isChecked && Date.now() > dueDate && isUnlocked;
            const isDueToday = !isChecked && isUnlocked && !isOverdue &&
                               Math.abs(Date.now() - dueDate) < 86400000;

            const borderCol = isChecked  ? 'rgba(0,255,65,0.55)'
                            : isOverdue  ? 'rgba(255,60,0,0.55)'
                            : isDueToday ? 'rgba(255,215,0,0.55)'
                            : isUnlocked ? 'rgba(0,245,255,0.2)'
                            : 'rgba(30,45,60,0.4)';
            const bgCol     = isChecked  ? 'rgba(0,255,65,0.1)'
                            : isOverdue  ? 'rgba(255,60,0,0.07)'
                            : isDueToday ? 'rgba(255,215,0,0.07)'
                            : 'rgba(0,0,0,0.2)';
            const textCol   = isChecked  ? '#00ff41'
                            : isOverdue  ? '#ff6644'
                            : isDueToday ? '#ffd700'
                            : isUnlocked ? '#4a8899'
                            : '#2a3f50';

            return (
              <motion.button
                key={key}
                onClick={() => !isChecked && isUnlocked && onCheck(node.id, key)}
                disabled={isChecked || !isUnlocked}
                whileHover={!isChecked && isUnlocked ? { scale: 1.04 } : {}}
                whileTap={!isChecked && isUnlocked ? { scale: 0.88 } : {}}
                className="flex-1 flex flex-col items-center gap-1 py-2 transition-all"
                style={{
                  background: bgCol,
                  border: `1px solid ${borderCol}`,
                  cursor: isChecked || !isUnlocked ? 'not-allowed' : 'pointer',
                  opacity: !isUnlocked ? 0.4 : 1,
                }}
              >
                <AnimatePresence mode="wait">
                  {isChecked ? (
                    <motion.div
                      key="checked"
                      initial={{ scale: 0, rotate: -120 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                    >
                      <CheckCircle size={13} color="#00ff41" style={{ filter: 'drop-shadow(0 0 4px #00ff41)' }} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unchecked"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      style={{
                        width: 13, height: 13,
                        border: `1.5px solid ${borderCol}`,
                        borderRadius: '50%',
                        background: isOverdue || isDueToday ? `${borderCol}18` : 'transparent',
                      }}
                    />
                  )}
                </AnimatePresence>
                <span className="font-mono font-black" style={{ color: textCol, fontSize: 7, letterSpacing: '0.05em' }}>
                  {label}
                </span>
                {isOverdue && !isChecked && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                    className="font-mono"
                    style={{ color: '#ff4444', fontSize: 6 }}
                  >LATE</motion.span>
                )}
                {isDueToday && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.1 }}
                    className="font-mono"
                    style={{ color: '#ffd700', fontSize: 6 }}
                  >TODAY</motion.span>
                )}
                {!isUnlocked && (
                  <span className="font-mono" style={{ color: '#2a3f50', fontSize: 6 }}>🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function SystemIntegrityBar({ integrity }) {
  const color =
    integrity >= 75 ? '#00ff41' :
    integrity >= 60 ? '#ffff00' :
    integrity >= 40 ? '#ff6b00' : '#ff0000';
  const label =
    integrity >= 75 ? 'STABLE'   :
    integrity >= 60 ? 'DEGRADED' :
    integrity >= 40 ? 'CRITICAL' : 'FAILING';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {integrity >= 60 ? <Wifi size={11} color={color} /> : (
          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
            <WifiOff size={11} color={color} />
          </motion.div>
        )}
        <span className="font-mono tracking-widest" style={{ color, fontSize: 9 }}>SYS INTEGRITY</span>
      </div>
      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ width: `${integrity}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className="font-mono" style={{ color, fontSize: 9 }}>{Math.round(integrity)}% {label}</span>
    </div>
  );
}

// ─── GHOST PACING BAR ─────────────────────────────────────────────
function GhostPacingBar({ completedCount, systemTheme }) {
  const [metrics, setMetrics] = useState(() => getGhostMetrics(completedCount));

  // Refresh every 30 seconds so the ghost moves in real-time.
  useEffect(() => {
    setMetrics(getGhostMetrics(completedCount));
    const id = setInterval(() => setMetrics(getGhostMetrics(completedCount)), 30_000);
    return () => clearInterval(id);
  }, [completedCount]);

 const {
    ghostProgress, actualProgress, ghostChapterTarget,
    isAhead, deltaChaps, deltaPct,
    chaptersNeededToday, daysLeft,
  } = metrics;

  const accentColor  = systemTheme === 'god' ? '#ffd700' : '#00f5ff';
  const ghostColor   = isAhead ? '#00f5ff' : '#ff2222';
  const ghostGlow    = isAhead ? '0 0 12px #00f5ff, 0 0 24px #00f5ff88' : '0 0 12px #ff2222, 0 0 24px #ff222288';
  const statusVerb   = isAhead ? 'AHEAD OF' : 'BEHIND';
  const statusColor  = isAhead ? '#00ff41' : '#ff3333';

  const barBg        = 'rgba(10,16,28,0.9)';
  const trackColor   = '#0a1828';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(6,10,20,0.97), rgba(4,6,14,0.97))',
      border: `1px solid ${ghostColor}40`,
      boxShadow: `0 0 20px ${ghostColor}15`,
      padding: '16px 20px',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: isAhead ? 2 : 0.7 }}
          >
            <Activity size={13} color={ghostColor} />
          </motion.div>
          <span className="font-mono text-xs font-black tracking-widest"
            style={{ color: ghostColor, textShadow: ghostGlow }}>
            ◈ GHOST PACING — 8-DAY SPRINT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs" style={{ color: 'rgba(100,130,160,0.6)' }}>
            {daysLeft.toFixed(1)}d remaining
          </div>
          <div className="font-mono text-xs font-black px-2 py-0.5"
            style={{
              background: `${ghostColor}18`,
              border: `1px solid ${ghostColor}50`,
              color: ghostColor,
            }}>
            {completedCount}/{CAMPAIGN_CHAPTERS_TOTAL} CHAPTERS
          </div>
        </div>
      </div>

      {/* Dual Progress Bar */}
      <div className="relative mb-2" style={{ height: 28 }}>
        {/* Track */}
        <div className="absolute inset-0 rounded-sm overflow-hidden"
          style={{ background: trackColor, border: '1px solid rgba(30,50,80,0.5)' }}>

          {/* Actual progress */}
          <motion.div
            className="absolute left-0 top-0 h-full"
            style={{
              background: systemTheme === 'god'
                ? 'linear-gradient(90deg, #ffd700, #ffa500)'
                : 'linear-gradient(90deg, #00ff41, #00f5ff)',
              boxShadow: systemTheme === 'god'
                ? '0 0 10px rgba(255,215,0,0.8)'
                : '0 0 10px rgba(0,255,65,0.7)',
              zIndex: 2,
            }}
            animate={{ width: `${Math.min(actualProgress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Ghost marker */}
          <motion.div
            className="absolute top-0 h-full"
            style={{
              width: 3,
              background: ghostColor,
              boxShadow: ghostGlow,
              zIndex: 4,
            }}
            animate={{ left: `${Math.min(Math.max(ghostProgress - 0.15, 0), 99.5)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Ghost trail (semi-transparent fill up to ghost) */}
          <motion.div
            className="absolute left-0 top-0 h-full"
            style={{
              background: `${ghostColor}18`,
              zIndex: 1,
              borderRight: `2px solid ${ghostColor}60`,
            }}
            animate={{ width: `${Math.min(ghostProgress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
            <span className="font-mono font-black"
              style={{ fontSize: 9, color: '#fff', mixBlendMode: 'difference', letterSpacing: '0.08em' }}>
              YOU: {Math.round(actualProgress)}% │ GHOST: {Math.round(ghostProgress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Ghost position tick labels */}
      <div className="relative mb-3" style={{ height: 12 }}>
        {/* Your position label */}
        <motion.div
          className="absolute font-mono"
          style={{
            fontSize: 7,
            color: systemTheme === 'god' ? '#ffd700' : '#00ff41',
            transform: 'translateX(-50%)',
            top: 0,
            letterSpacing: '0.04em',
          }}
          animate={{ left: `${Math.min(Math.max(actualProgress, 2), 96)}%` }}
          transition={{ duration: 1 }}
        >▲ YOU</motion.div>

        {/* Ghost label */}
        <motion.div
          className="absolute font-mono"
          style={{
            fontSize: 7,
            color: ghostColor,
            transform: 'translateX(-50%)',
            top: 0,
            letterSpacing: '0.04em',
            textShadow: `0 0 6px ${ghostColor}`,
          }}
          animate={{ left: `${Math.min(Math.max(ghostProgress, 5), 93)}%` }}
          transition={{ duration: 1 }}
        >👻 GHOST</motion.div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <motion.div
          animate={!isAhead ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.9 }}
          className="font-mono font-black"
          style={{ color: statusColor, fontSize: 11, textShadow: `0 0 10px ${statusColor}` }}
        >
          {isAhead ? '▲' : '▼'} {deltaPct.toFixed(1)}% {statusVerb} THE GHOST
          <span style={{ color: 'rgba(100,130,160,0.5)', fontWeight: 400 }}>
            {' '}({deltaChaps.toFixed(1)} chapters)
          </span>
        </motion.div>

        {/* Daily target pill */}
        <motion.div
          animate={chaptersNeededToday > 0 ? { scale: [1, 1.04, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="flex items-center gap-2 px-3 py-1.5 font-mono font-black"
          style={{
            background: chaptersNeededToday > 0 ? 'rgba(255,107,0,0.12)' : 'rgba(0,255,65,0.1)',
            border: `1px solid ${chaptersNeededToday > 0 ? 'rgba(255,107,0,0.5)' : 'rgba(0,255,65,0.4)'}`,
            color: chaptersNeededToday > 0 ? '#ff6b00' : '#00ff41',
            fontSize: 10,
          }}
        >
          <Target size={10} />
          {chaptersNeededToday > 0
            ? `${chaptersNeededToday} CHAPTER${chaptersNeededToday !== 1 ? 'S' : ''} NEEDED TODAY`
            : 'ON PACE — NO DEBT TODAY'}
        </motion.div>
      </div>

      {/* Ghost pace formula (dim debug line) */}
      <div className="mt-2 font-mono" style={{ color: 'rgba(50,70,100,0.5)', fontSize: 8 }}>
       GHOST FORMULA: {ghostChapterTarget.toFixed(2)} chapters elapsed ÷ {CAMPAIGN_CHAPTERS_TOTAL} total
        = {ghostProgress.toFixed(1)}% pace │ TARGET: {(CAMPAIGN_CHAPTERS_TOTAL / CAMPAIGN_TOTAL_DAYS).toFixed(2)} ch/day
      </div>
    </div>
  );
}

function NeuralAlarmBanner({ integrity, onDismiss }) {
  const isCritical = integrity < VIGNETTE_INTEGRITY_THRESHOLD;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <motion.div
        animate={{
          background: isCritical
            ? ['rgba(180,0,0,0.25)', 'rgba(255,0,0,0.12)', 'rgba(180,0,0,0.25)']
            : ['rgba(120,0,0,0.18)', 'rgba(255,60,0,0.08)', 'rgba(120,0,0,0.18)'],
        }}
        transition={{ repeat: Infinity, duration: isCritical ? 0.7 : 1.4 }}
        className="px-4 py-2 flex items-center justify-between"
        style={{ border: `1px solid ${isCritical ? 'rgba(255,0,0,0.7)' : 'rgba(255,60,0,0.45)'}` }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: isCritical ? 0.5 : 0.9 }}
          >
            <AlertTriangle size={15} color={isCritical ? '#ff0000' : '#ff4400'} />
          </motion.div>
          <span className="font-mono text-xs font-black tracking-widest"
            style={{ color: isCritical ? '#ff3333' : '#ff6633', textShadow: `0 0 8px ${isCritical ? '#ff0000' : '#ff4400'}` }}>
            {isCritical
              ? `⚠ NEURAL DECAY CRITICAL — ${Math.round(integrity)}% INTEGRITY — START A POMODORO NOW`
              : `⚠ NEURAL ALARM — ${Math.round(integrity)}% INTEGRITY — SYSTEM DEGRADING — ENGAGE TIMER TO SILENCE`}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="font-mono text-xs px-2 py-1 ml-3 flex-shrink-0"
          style={{ border: '1px solid rgba(255,60,0,0.35)', color: 'rgba(255,80,0,0.6)', background: 'transparent' }}
          title="Dismiss banner (alarm still active)"
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 4.5 — TEMPORAL WAR-MAP
// ═══════════════════════════════════════════════════════════════════

function TemporalWarMap({ warStartDate, warArchives, totalChapters, completedCount, systemTheme }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMidnight = stripTime(warStartDate);
  const deadlineMs    = startMidnight + WAR_WINDOW_DAYS * 86400000;

  const days = Array.from({ length: WAR_WINDOW_DAYS }, (_, i) => {
    const dayStart = startMidnight + i * 86400000;
    const dayEnd   = dayStart + 86400000;
    const dayKey   = isoDay(dayStart);
    const d        = new Date(dayStart);
    return { i, dayStart, dayEnd, dayKey, d };
  });

  const archivesByDay = {};
  warArchives.forEach((entry) => {
    if (entry.isRevisionNode || !entry.completedAt) return;
    const key = isoDay(entry.completedAt);
    if (!archivesByDay[key]) archivesByDay[key] = [];
    archivesByDay[key].push(entry);
  });

  const daysSinceStart  = Math.max(0.01, (now - startMidnight) / 86400000);
  const chaptersPerDay  = completedCount / daysSinceStart;
  const remaining       = totalChapters - completedCount;
  const daysRequired    = chaptersPerDay > 0.001
    ? remaining / chaptersPerDay
    : Infinity;

  const projectedMs     = now + daysRequired * 86400000;
  const daysAheadBehind = (deadlineMs - projectedMs) / 86400000;
  const isOnTrack       = daysAheadBehind >= 0;

  const msToDeadline    = Math.max(0, deadlineMs - now);
  const cdDays          = Math.floor(msToDeadline / 86400000);
  const cdHrs           = Math.floor((msToDeadline % 86400000) / 3600000);
  const cdMins          = Math.floor((msToDeadline % 3600000)  / 60000);
  const cdSecs          = Math.floor((msToDeadline % 60000)    / 1000);

  const projectedDateStr = daysRequired === Infinity
    ? '∞'
    : new Date(projectedMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();

  const velocityColor  = isOnTrack ? '#00ff41' : '#ff3333';
  const accentColor    = systemTheme === 'god' ? '#ffd700' : '#00f5ff';

  const maxDayChapters = Math.max(1, ...Object.values(archivesByDay).map((a) => a.length));
  const todayKey = isoDay(now);

  let intelligenceText = '';
  if (remaining === 0) {
    intelligenceText = '⚡  100% ANNIHILATED — MISSION ACCOMPLISHED.';
  } else if (daysRequired === Infinity) {
    intelligenceText = '⚠ VELOCITY = 0. NO CHAPTERS ELIMINATED. BEGIN COMBAT IMMEDIATELY.';
  } else if (isOnTrack) {
    intelligenceText = `✓ AT CURRENT VELOCITY,  BREACH IN ${daysRequired.toFixed(1)} DAYS — ${Math.abs(daysAheadBehind).toFixed(1)} DAYS AHEAD OF DEADLINE.`;
  } else {
    intelligenceText = `⚠ AT CURRENT VELOCITY,  BREACH IN ${daysRequired.toFixed(1)} DAYS — ${Math.abs(daysAheadBehind).toFixed(1)} DAYS PAST DEADLINE. ACCELERATE.`;
  }

  const recentDays = days.filter(({ dayKey }) => {
    const d = new Date(dayKey);
    return (now - d.getTime()) < 3 * 86400000 && archivesByDay[dayKey];
  });
  const rollingAvg = recentDays.length > 0
    ? recentDays.reduce((s, { dayKey }) => s + (archivesByDay[dayKey]?.length || 0), 0) / Math.max(1, recentDays.length)
    : chaptersPerDay;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
        <div className="flex items-center gap-2">
          <Map size={13} style={{ color: accentColor }} />
          <span className="font-mono text-xs tracking-widest font-black"
            style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}` }}>
            ◈ TEMPORAL WAR-MAP — 8-DAY CAMPAIGN
          </span>
        </div>
        <div className="h-px flex-1" style={{ background: `linear-gradient(270deg, ${accentColor}, transparent)` }} />
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #060c18, #040810)',
        border: `1px solid ${accentColor}25`,
        boxShadow: `0 0 30px ${accentColor}08`,
      }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0" style={{ borderBottom: `1px solid ${accentColor}15` }}>
          {[
            {
              label: 'WAR VELOCITY',
              value: chaptersPerDay < 0.01 ? '—' : `${chaptersPerDay.toFixed(2)}`,
              unit: 'ch/day',
              color: accentColor,
              sub: rollingAvg !== chaptersPerDay ? `3d avg: ${rollingAvg.toFixed(2)}` : null,
            },
            {
              label: 'DAYS ELAPSED',
              value: daysSinceStart.toFixed(1),
              unit: `of ${WAR_WINDOW_DAYS}`,
              color: '#ff6b00',
              sub: `${completedCount} chapters eliminated`,
            },
            {
              label: 'DAYS TO BREACH',
              value: daysRequired === Infinity ? '∞' : daysRequired.toFixed(1),
              unit: remaining > 0 ? `${remaining} remaining` : 'COMPLETE',
              color: velocityColor,
              sub: isOnTrack ? '▲ ON TRACK' : '▼ BEHIND',
            },
            {
              label: 'PROJECTED DATE',
              value: projectedDateStr,
              unit: daysAheadBehind >= 0
                ? `${Math.abs(daysAheadBehind).toFixed(1)}d EARLY`
                : `${Math.abs(daysAheadBehind).toFixed(1)}d LATE`,
              color: velocityColor,
              sub: null,
            },
          ].map(({ label, value, unit, color, sub }, idx) => (
            <div key={label} className="p-4 text-center relative"
              style={{ borderRight: idx < 3 ? `1px solid ${accentColor}15` : 'none' }}>
              <div className="font-mono tracking-widest mb-1" style={{ color: 'rgba(120,150,180,0.5)', fontSize: 8 }}>{label}</div>
              <motion.div
                key={value}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono font-black"
                style={{ color, textShadow: `0 0 10px ${color}`, fontSize: 24, lineHeight: 1 }}
              >{value}</motion.div>
              <div className="font-mono mt-1" style={{ color: 'rgba(100,130,160,0.6)', fontSize: 9 }}>{unit}</div>
              {sub && (
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }}
                  className="font-mono mt-0.5" style={{ color, fontSize: 8 }}
                >{sub}</motion.div>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderBottom: `1px solid ${accentColor}15`, background: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Clock size={12} style={{ color: cdDays < 2 ? '#ff3333' : accentColor }} />
            </motion.div>
            <span className="font-mono tracking-widest" style={{ color: 'rgba(120,150,180,0.5)', fontSize: 9 }}>
              DEADLINE COUNTDOWN
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono font-black"
            style={{ color: cdDays < 2 ? '#ff3333' : accentColor, textShadow: `0 0 10px ${cdDays < 2 ? '#ff3333' : accentColor}` }}>
            {msToDeadline > 0 ? (
              <>
                <span style={{ fontSize: 20 }}>{String(cdDays).padStart(2,'0')}</span>
                <span style={{ color: 'rgba(120,150,180,0.4)', fontSize: 14 }}>d</span>
                <span style={{ fontSize: 20 }}>{String(cdHrs).padStart(2,'0')}</span>
                <span style={{ color: 'rgba(120,150,180,0.4)', fontSize: 14 }}>h</span>
                <span style={{ fontSize: 20 }}>{String(cdMins).padStart(2,'0')}</span>
                <span style={{ color: 'rgba(120,150,180,0.4)', fontSize: 14 }}>m</span>
                <span style={{ fontSize: 20 }}>{String(cdSecs).padStart(2,'0')}</span>
                <span style={{ color: 'rgba(120,150,180,0.4)', fontSize: 14 }}>s</span>
              </>
            ) : (
              <span style={{ fontSize: 16, color: '#ff3333' }}>CAMPAIGN WINDOW CLOSED</span>
            )}
          </div>
          <div className="font-mono" style={{ color: 'rgba(80,110,140,0.5)', fontSize: 9 }}>
            WAR START: {new Date(warStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WAR_WINDOW_DAYS}, minmax(80px, 1fr))`, gap: 6, minWidth: 600 }}>
              {days.map(({ i, dayStart, dayKey, d }) => {
                const isPast    = dayKey < todayKey;
                const isToday   = dayKey === todayKey;
                const isFuture  = dayKey > todayKey;
                const dayChaps  = archivesByDay[dayKey] || [];
                const chapCount = dayChaps.length;

                const daysLeft    = Math.max(1, WAR_WINDOW_DAYS - i);
                const chapsNeeded = isFuture ? Math.ceil(remaining / daysLeft) : 0;

                const cardBorder = isToday
                  ? `2px solid ${accentColor}`
                  : isPast
                  ? '1px solid rgba(40,60,80,0.4)'
                  : '1px solid rgba(30,50,70,0.3)';

                const cardBg = isToday
                  ? `rgba(0,245,255,0.05)`
                  : isPast
                  ? 'rgba(5,10,15,0.6)'
                  : 'rgba(8,14,22,0.4)';

                return (
                  <motion.div
                    key={dayKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative flex flex-col"
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      boxShadow: isToday ? `0 0 16px ${accentColor}30, inset 0 0 20px ${accentColor}05` : 'none',
                      minHeight: 130,
                      overflow: 'hidden',
                    }}
                  >
                    {isPast && chapCount === 0 && (
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,50,50,0.04) 6px, rgba(255,50,50,0.04) 7px)',
                      }} />
                    )}
                    {isPast && chapCount === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="font-mono text-center" style={{ color: 'rgba(80,40,40,0.6)', fontSize: 7, letterSpacing: '0.05em', transform: 'rotate(-20deg)' }}>
                          NO DATA
                        </div>
                      </div>
                    )}

                    {isToday && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                        style={{ border: `2px solid ${accentColor}`, boxShadow: `inset 0 0 12px ${accentColor}20` }}
                      />
                    )}

                    <div className="px-2 pt-2 pb-1">
                      <div className="font-mono font-black" style={{
                        color: isToday ? accentColor : isPast ? 'rgba(80,100,120,0.6)' : 'rgba(100,130,160,0.5)',
                        fontSize: 9, letterSpacing: '0.1em',
                        textShadow: isToday ? `0 0 8px ${accentColor}` : 'none',
                      }}>
                        {DAY_NAMES[d.getDay()]}
                      </div>
                      <div className="font-mono font-black" style={{
                        color: isToday ? '#ffffff' : isPast ? 'rgba(120,140,160,0.5)' : 'rgba(80,100,120,0.4)',
                        fontSize: 20, lineHeight: 1.1,
                      }}>
                        {d.getDate()}
                      </div>
                      <div className="font-mono" style={{ color: 'rgba(60,80,100,0.5)', fontSize: 7 }}>
                        {MONTH_NAMES[d.getMonth()]}
                      </div>
                    </div>

                    {isToday && (
                      <motion.div
                        animate={{ opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="mx-2 mb-1 text-center font-mono font-black"
                        style={{
                          background: `${accentColor}20`,
                          border: `1px solid ${accentColor}60`,
                          color: accentColor,
                          fontSize: 7, padding: '2px 0', letterSpacing: '0.05em',
                        }}
                      >▶ YOU ARE HERE</motion.div>
                    )}

                    <div className="flex-1 px-2 pb-2 flex flex-col justify-end">
                      {chapCount > 0 ? (
                        <>
                          <div className="mb-1">
                            {Object.entries(SUBJECT_CONFIG).map(([subj, sc]) => {
                              const subjCount = dayChaps.filter(a => a.subject === subj).length;
                              if (subjCount === 0) return null;
                              return (
                                <div key={subj} className="flex items-center gap-1 mb-0.5">
                                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                                  <div className="flex-1 h-1 overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: sc.color, boxShadow: `0 0 3px ${sc.color}` }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(subjCount / Math.max(chapCount, 1)) * 100}%` }}
                                      transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                                    />
                                  </div>
                                  <span className="font-mono" style={{ color: sc.color, fontSize: 7 }}>{subjCount}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="font-mono font-black text-center" style={{
                            color: '#00ff41', fontSize: 16,
                            textShadow: '0 0 8px #00ff41',
                          }}>{chapCount}</div>
                          <div className="font-mono text-center" style={{ color: 'rgba(0,255,65,0.5)', fontSize: 7 }}>CHAPTERS</div>
                          {isPast && (
                            <div className="font-mono text-center mt-0.5" style={{ color: 'rgba(0,255,65,0.4)', fontSize: 7 }}>
                              ✓ MISSION COMPLETE
                            </div>
                          )}
                        </>
                      ) : isFuture ? (
                        <>
                          <div className="font-mono text-center mb-0.5" style={{ color: 'rgba(60,80,100,0.4)', fontSize: 7 }}>TARGET</div>
                          <div className="font-mono font-black text-center" style={{
                            color: 'rgba(80,110,140,0.35)',
                            fontSize: 15,
                          }}>
                            {chapsNeeded > 0 ? chapsNeeded : '—'}
                          </div>
                          {chapsNeeded > 0 && (
                            <div className="font-mono text-center" style={{ color: 'rgba(60,80,100,0.3)', fontSize: 7 }}>needed</div>
                          )}
                        </>
                      ) : (
                        <div className="font-mono text-center" style={{ color: 'rgba(80,40,40,0.5)', fontSize: 7 }}>0 today</div>
                      )}
                    </div>

                    <div className="absolute top-1.5 right-1.5 font-mono" style={{ color: 'rgba(40,60,80,0.4)', fontSize: 7 }}>
                      D{i + 1}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 relative" style={{ height: 16 }}>
            <div className="absolute inset-0 flex">
              {days.map(({ dayKey }, i) => (
                <div key={dayKey} className="flex-1 flex justify-center">
                  <div style={{ width: 1, height: dayKey === todayKey ? 12 : 6, background: dayKey === todayKey ? accentColor : 'rgba(40,60,80,0.4)', boxShadow: dayKey === todayKey ? `0 0 4px ${accentColor}` : 'none' }} />
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${accentColor}60, rgba(40,60,80,0.2))` }} />
          </div>

          <div className="mt-4 p-3" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(40,60,80,0.3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono tracking-widest" style={{ color: 'rgba(100,130,160,0.6)', fontSize: 9 }}>
                CAMPAIGN PROGRESS
              </span>
              <span className="font-mono font-black" style={{ color: velocityColor, fontSize: 9 }}>
                {completedCount}/{totalChapters} CHAPTERS
              </span>
            </div>
            <div className="relative h-4 overflow-hidden" style={{ background: '#030810', border: '1px solid rgba(30,50,70,0.4)' }}>
              <motion.div
                className="absolute left-0 top-0 h-full"
                style={{ background: `linear-gradient(90deg, ${velocityColor}, ${velocityColor}aa)`, boxShadow: `0 0 8px ${velocityColor}` }}
                animate={{ width: `${(completedCount / totalChapters) * 100}%` }}
                transition={{ duration: 1 }}
              />
              {daysRequired !== Infinity && daysRequired > 0 && (
                <motion.div
                  className="absolute top-0 h-full"
                  style={{
                    left: `${(completedCount / totalChapters) * 100}%`,
                    background: `${velocityColor}22`,
                    borderRight: `1px dashed ${velocityColor}60`,
                  }}
                  animate={{ width: `${Math.min(100 - (completedCount / totalChapters) * 100, (remaining / totalChapters) * 100)}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              )}
              <div className="absolute right-0 top-0 h-full" style={{ width: 2, background: '#ff3333', boxShadow: '0 0 4px #ff3333' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-white font-black" style={{ fontSize: 8, mixBlendMode: 'difference' }}>
                  {Math.round((completedCount / totalChapters) * 100)}% DOMINANCE
                </span>
              </div>
            </div>
          </div>

          <motion.div
            animate={!isOnTrack && remaining > 0 ? {
              borderColor: ['rgba(255,51,51,0.3)', 'rgba(255,51,51,0.7)', 'rgba(255,51,51,0.3)'],
            } : {}}
            transition={{ repeat: Infinity, duration: 1.6 }}
            className="mt-3 p-3 flex items-start gap-3"
            style={{
              background: remaining === 0 ? 'rgba(0,255,65,0.05)' : isOnTrack ? 'rgba(0,255,65,0.04)' : 'rgba(255,51,51,0.05)',
              border: `1px solid ${remaining === 0 ? 'rgba(0,255,65,0.3)' : isOnTrack ? 'rgba(0,255,65,0.2)' : 'rgba(255,51,51,0.3)'}`,
            }}
          >
            <motion.div
              animate={!isOnTrack && remaining > 0 ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              {remaining === 0
                ? <CheckCircle size={13} color="#00ff41" />
                : isOnTrack
                ? <TrendingUp size={13} color="#00ff41" />
                : <TrendingDown size={13} color="#ff3333" />}
            </motion.div>
            <div>
              <div className="font-mono font-black mb-0.5" style={{ color: 'rgba(80,100,120,0.5)', fontSize: 8, letterSpacing: '0.15em' }}>
                INTEL REPORT — BATTLEFIELD ASSESSMENT
              </div>
              <div className="font-mono font-black" style={{
                color: remaining === 0 ? '#00ff41' : isOnTrack ? '#00dd41' : '#ff4444',
                fontSize: 10, lineHeight: 1.5,
                textShadow: `0 0 8px ${remaining === 0 ? '#00ff41' : isOnTrack ? '#00ff41' : '#ff3333'}40`,
              }}>
                {intelligenceText}
              </div>
              <div className="font-mono mt-1.5" style={{ color: 'rgba(80,100,120,0.45)', fontSize: 8 }}>
                {`FORMULA: DaysRequired = ${remaining} chapters ÷ ${chaptersPerDay.toFixed(3)} ch/day = ${daysRequired === Infinity ? '∞' : daysRequired.toFixed(2)} days`}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 5 — COMPLEX COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function AvatarStatsCard({ stats, totalXP, theme }) {
  const level   = getUserLevel(totalXP);
  const lvlProg = getLevelProgress(totalXP);
  const rank    = getRank(totalXP);

  const themeStyles = {
    dim: {
      border: '1px solid rgba(100,100,120,0.4)',
      background: 'linear-gradient(135deg, #0a0a12, #050508)',
      titleColor: '#8888aa', accentColor: '#8888aa', glow: 'none',
    },
    neon: {
      border: '1px solid rgba(0,245,255,0.4)',
      background: 'linear-gradient(135deg, #0a1628, #060d1a)',
      titleColor: '#00f5ff', accentColor: '#ff00ff',
      glow: '0 0 20px rgba(0,245,255,0.2)',
    },
    god: {
      border: '2px solid rgba(255,215,0,0.8)',
      background: 'linear-gradient(135deg, #1a1200, #0d0900)',
      titleColor: '#ffd700', accentColor: '#ffa500',
      glow: '0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,165,0,0.2)',
    },
  };

  const ts = themeStyles[theme] || themeStyles.neon;

  const statDefs = [
    { key: 'strength',     label: 'STR', fullLabel: 'STRENGTH',     desc: 'Physics XP',   color: '#00f5ff', icon: Atom         },
    { key: 'dexterity',    label: 'DEX', fullLabel: 'DEXTERITY',    desc: 'Chemistry XP', color: '#ff00ff', icon: FlaskConical },
    { key: 'intelligence', label: 'INT', fullLabel: 'INTELLIGENCE', desc: 'Math XP',       color: '#00ff41', icon: Calculator  },
  ];

  const maxStat = Math.max(...statDefs.map(s => stats[s.key] || 0), 1);

  return (
    <motion.div layout style={{ ...ts, boxShadow: ts.glow }} className="p-5 relative overflow-hidden">
      {theme === 'god' && (
        <motion.div className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.04, 0.12, 0.04] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.3), transparent 70%)' }}
        />
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center relative"
              style={{ background: ts.background, border: `2px solid ${ts.titleColor}`, boxShadow: `0 0 12px ${ts.titleColor}60` }}>
              <Cpu size={18} style={{ color: ts.titleColor }} />
              {theme === 'god' && (
                <motion.div className="absolute -inset-0.5 rounded-none pointer-events-none"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{ border: `1px solid ${ts.titleColor}`, boxShadow: `0 0 8px ${ts.titleColor}` }}
                />
              )}
            </div>
            <div>
              <div className="font-mono text-xs tracking-widest font-black" style={{ color: ts.titleColor, textShadow: `0 0 8px ${ts.titleColor}` }}>
                {theme === 'god' ? '✦ CYBER AVATAR ✦' : 'CYBER AVATAR'}
              </div>
              <div className="font-mono text-gray-500" style={{ fontSize: 10 }}>
                {theme === 'dim' ? 'SYSTEM OFFLINE' : theme === 'neon' ? 'NEON OVERLOAD ACTIVE' : 'GOD MODE UNLOCKED'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-black text-2xl" style={{ color: ts.titleColor, textShadow: `0 0 12px ${ts.titleColor}` }}>LVL {level}</div>
            <div className="font-mono text-gray-500" style={{ fontSize: 9 }}>{rank.rank}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono" style={{ color: ts.accentColor, fontSize: 9 }}>LEVEL PROGRESS</span>
            <span className="font-mono" style={{ color: ts.accentColor, fontSize: 9 }}>{Math.round(lvlProg)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#111' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: theme === 'god' ? 'linear-gradient(90deg, #ffd700, #ffa500)' : `linear-gradient(90deg, ${ts.titleColor}, ${ts.accentColor})`, boxShadow: `0 0 8px ${ts.titleColor}` }}
              animate={{ width: `${lvlProg}%` }} transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {statDefs.map(({ key, label, fullLabel, desc, color, icon: Icon }) => {
            const val = stats[key] || 0;
            const pct = (val / Math.max(maxStat, 1)) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <Icon size={12} style={{ color, flexShrink: 0 }} />
                <div className="w-8 font-mono text-xs font-black" style={{ color }}>{label}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-mono" style={{ color: '#4a6080', fontSize: 8 }}>{fullLabel} ({desc})</span>
                    <span className="font-mono" style={{ color, fontSize: 8 }}>{val} XP</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#0a1020' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                      animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1" style={{
            background: theme === 'god' ? 'rgba(255,215,0,0.1)' : theme === 'neon' ? 'rgba(0,245,255,0.08)' : 'rgba(80,80,100,0.08)',
            border: `1px solid ${ts.titleColor}40`,
          }}>
            <Star size={9} style={{ color: ts.titleColor }} />
            <span className="font-mono font-black" style={{ color: ts.titleColor, fontSize: 9 }}>
              {theme === 'god' ? '⚡ GOD MODE (LVL 16+)' : theme === 'neon' ? 'NEON OVERLOAD (LVL 6+)' : 'DIM MODE (LVL 1-5)'}
            </span>
          </div>
          {theme === 'god' && (
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <span className="font-mono" style={{ color: '#ffd700', fontSize: 9 }}>✦ MAX POWER ✦</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EpisodeCard({ episode, isLocked, completedChapters, onDeployChapter, deployedNames }) {
  const episodeChapterKeys = episode.chapters.map(c => `${c.subject}::${c.name}`);
  const completedInEpisode = episodeChapterKeys.filter(k => completedChapters.includes(k)).length;
  const totalInEpisode     = episode.chapters.length;
  const isComplete         = completedInEpisode === totalInEpisode;
  const pct                = (completedInEpisode / totalInEpisode) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
      style={{
        background: isLocked
          ? 'linear-gradient(135deg, rgba(10,10,16,0.95), rgba(5,5,10,0.95))'
          : 'linear-gradient(135deg, rgba(10,18,30,0.95), rgba(6,10,18,0.95))',
        border: isLocked ? '1px solid rgba(50,50,70,0.4)' : `1px solid ${episode.color}40`,
        boxShadow: isComplete ? `0 0 20px ${episode.color}30` : 'none',
        filter: isLocked ? 'blur(1px)' : 'none',
      }}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center"
          style={{ background: 'rgba(5,5,12,0.7)', backdropFilter: 'blur(3px)' }}>
          <Lock size={22} style={{ color: 'rgba(100,100,140,0.6)' }} />
          <div className="font-mono text-xs text-gray-700 mt-2 tracking-widest">LOCKED</div>
          <div className="font-mono text-gray-800 mt-0.5" style={{ fontSize: 9 }}>Complete Ep {episode.id - 1} to unlock</div>
        </div>
      )}

      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${episode.color}20` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="font-mono font-black" style={{ color: episode.color, fontSize: 9 }}>EPISODE {episode.id}</div>
            <div className="font-mono text-gray-700" style={{ fontSize: 9 }}>{episode.subtitle}</div>
          </div>
          {isComplete && (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <CheckCircle size={14} style={{ color: episode.color }} />
            </motion.div>
          )}
        </div>
        <div className="font-mono text-sm font-black" style={{
          color: isLocked ? 'rgba(80,80,100,0.5)' : episode.color,
          textShadow: isLocked ? 'none' : `0 0 10px ${episode.color}60`,
        }}>{episode.title}</div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#0a1020' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: episode.color, boxShadow: `0 0 4px ${episode.color}` }}
              animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
            />
          </div>
          <span className="font-mono" style={{ color: episode.color, fontSize: 9 }}>{completedInEpisode}/{totalInEpisode}</span>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {episode.chapters.map((ch, idx) => {
          const key         = `${ch.subject}::${ch.name}`;
          const isCompleted = completedChapters.includes(key);
          const isDeployed  = deployedNames.some(d => d.subject === ch.subject && d.name === ch.name);
          const sc          = SUBJECT_CONFIG[ch.subject];
          const dc          = DIFF_CONFIG[[ch.subject]?.find(s => s.name === ch.name)?.diff || 'M'];
          const SubIcon     = sc?.icon || BookOpen;

          return (
            <motion.div key={ch.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-2 py-1.5 px-2 rounded"
              style={{ background: isCompleted ? 'rgba(0,0,0,0.3)' : 'transparent', opacity: isLocked ? 0 : 1 }}>
              {isCompleted ? (
                <CheckCircle size={11} style={{ color: '#00ff41', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 11, height: 11, flexShrink: 0, border: `1px solid ${dc.color}`, borderRadius: '50%' }} />
              )}
              <SubIcon size={10} style={{ color: sc?.color, flexShrink: 0 }} />
              <span className="text-xs flex-1 font-mono" style={{
                color: isCompleted ? '#3a5060' : '#c0d8f0',
                textDecoration: isCompleted ? 'line-through' : 'none',
                textDecorationColor: '#ff00ff',
              }}>{ch.name}</span>
              <span className="font-mono" style={{ color: sc?.color, fontSize: 8 }}>{ch.subject.slice(0, 3).toUpperCase()}</span>
              {!isCompleted && !isDeployed && !isLocked && (
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => onDeployChapter(ch)}
                  className="px-1.5 py-0.5 font-mono font-black"
                  style={{ background: `${episode.color}18`, border: `1px solid ${episode.color}60`, color: episode.color, fontSize: 8 }}
                >+ADD</motion.button>
              )}
              {isDeployed && !isCompleted && (
                <span className="font-mono" style={{ color: '#4a8060', fontSize: 8 }}>QUEUED</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function VigilanceOverlay({ countdown, onResync }) {
  const isUrgent = countdown < 20;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9995] flex items-center justify-center"
      style={{ background: 'rgba(10,0,0,0.88)', backdropFilter: 'blur(4px)' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,0,0,0.04) 2px,rgba(255,0,0,0.04) 4px)' }} />
      <motion.div
        animate={isUrgent ? { x: [-4, 4, -4, 4, 0], transition: { repeat: Infinity, duration: 0.15 } } : {}}
        className="relative text-center px-12 py-10"
        style={{ background: 'linear-gradient(135deg, #1a0000, #0a0000)', border: '2px solid #ff0000', boxShadow: '0 0 60px rgba(255,0,0,0.5), 0 0 120px rgba(255,0,0,0.2)' }}
      >
        <div className="flex justify-center mb-4">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
            <AlertTriangle size={48} color="#ff0000" />
          </motion.div>
        </div>
        <div className="font-mono text-2xl font-black text-red-500 tracking-widest mb-2" style={{ textShadow: '0 0 20px #ff0000' }}>⚠ SYSTEM FAILING</div>
        <div className="font-mono text-sm text-red-300 mb-2">NEURAL LINK DEGRADATION DETECTED</div>
        <div className="font-mono text-xs text-gray-500 mb-6">No activity detected — focus protocol compromised</div>
        <div className="font-mono text-6xl font-black mb-6" style={{ color: isUrgent ? '#ff0000' : '#ff6b00', textShadow: `0 0 30px ${isUrgent ? '#ff0000' : '#ff6b00'}` }}>{countdown}s</div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onResync}
          className="px-8 py-4 font-mono text-sm font-black tracking-widest"
          style={{ background: 'rgba(0,245,255,0.15)', border: '2px solid #00f5ff', color: '#00f5ff', boxShadow: '0 0 30px rgba(0,245,255,0.4)' }}
        ><Radio size={16} className="inline mr-2" />RE-SYNC NEURAL LINK</motion.button>
        <div className="mt-4 font-mono text-red-900" style={{ fontSize: 10 }}>FAILURE TO COMPLY → MISSION ABORTED</div>
      </motion.div>
    </motion.div>
  );
}

function LiveTimeDisplay({ taskId, isRunning, sessionStartRef }) {
  const [displaySeconds, setDisplaySeconds] = useState(0);
  useEffect(() => {
    const tick = () => {
      const saved = LS.get(`time_spent_${taskId}`, 0);
      const live  = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : 0;
      setDisplaySeconds(saved + live);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [taskId, isRunning, sessionStartRef]);

  const totalMinutes = Math.floor(displaySeconds / 60);
  if (totalMinutes === 0) return null;
  return (
    <div className="mt-2 text-center font-mono text-gray-600" style={{ fontSize: 10 }}>
      ⏱ {totalMinutes}m spent on this mission
    </div>
  );
}

function TimerModal({
  task, onClose,
  timerSecondsLeft, timerTotalSeconds, timerIsRunning, timerIsBreak, timerCompletedSessions,
  onToggleTimer, onAbortTimer, onApplyPreset, onApplyCustomMinutes, vigilanceMode,
}) {
  const [customMinuteInput,  setCustomMinuteInput]  = useState('');
  const [showVigilance,      setShowVigilance]       = useState(false);
  const [vigilanceCountdown, setVigilanceCountdown]  = useState(60);
  const lastActivityRef      = useRef(Date.now());
  const vigilanceIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const dummySessionRef      = useRef(null);

  const recordActivity = () => { lastActivityRef.current = Date.now(); };

  useEffect(() => {
    if (!vigilanceMode || !timerIsRunning) {
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
              onAbortTimer();
              setShowVigilance(false);
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
  }, [vigilanceMode, timerIsRunning, showVigilance, onAbortTimer]);

  const handleResync = () => {
    clearInterval(countdownIntervalRef.current);
    setShowVigilance(false);
    lastActivityRef.current = Date.now();
    fireNeuralConfetti();
    playNeuralSync();
  };

  const tryApplyCustom = () => {
    const minutes = parseInt(customMinuteInput, 10);
    if (!minutes || minutes < 1 || minutes > 300) return;
    onApplyCustomMinutes(minutes);
    setCustomMinuteInput('');
  };

  const diffConfig    = DIFF_CONFIG[task.diff];
  const minuteDisplay = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
  const secondDisplay = String(timerSecondsLeft % 60).padStart(2, '0');
  const progressFill  = ((timerTotalSeconds - timerSecondsLeft) / timerTotalSeconds) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeOffset  = circumference - (progressFill / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: 'rgba(2,5,8,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) { recordActivity(); onClose(); } }}
    >
      <AnimatePresence>
        {showVigilance && <VigilanceOverlay countdown={vigilanceCountdown} onResync={handleResync} />}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #060d1a 100%)',
          border: `1px solid ${diffConfig.color}`,
          boxShadow: `0 0 30px ${diffConfig.color}40, 0 0 80px ${diffConfig.color}20`,
          padding: 40, minWidth: 420,
        }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors" title="Close (timer keeps running)">
          <X size={20} />
        </button>

        <div className="text-center mb-4">
          <div className="font-mono tracking-widest mb-1" style={{ color: diffConfig.color, fontSize: 10 }}>TIMER COMMAND CENTER</div>
          <div className="font-bold text-lg text-white truncate" style={{ maxWidth: 300, margin: '0 auto' }}>{task.name}</div>
          <div className="font-mono text-gray-500 mt-1" style={{ fontSize: 12 }}>
            {task.subject} • {timerIsBreak ? '☕ BREAK' : '⚡ FOCUS'}
          </div>
          {timerIsRunning && !timerIsBreak && (
            <div className="mt-1 flex items-center justify-center gap-1">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41' }} />
              </motion.div>
              <span className="font-mono text-green-400" style={{ fontSize: 9 }}>TIMER PERSISTS IF YOU CLOSE THIS MODAL</span>
            </div>
          )}
          {vigilanceMode && timerIsRunning && (
            <div className="mt-1 flex items-center justify-center gap-1">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Eye size={10} color="#00ff41" />
              </motion.div>
              <span className="font-mono text-green-500" style={{ fontSize: 9 }}>VIGILANCE ACTIVE</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4 justify-center flex-wrap">
          {TIMER_PRESETS.map((p) => (
            <button key={p.label} onClick={() => { recordActivity(); onApplyPreset(p.seconds); }}
              className="px-4 py-1.5 font-mono text-xs font-black tracking-wider transition-all"
              style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff' }}
            >{p.label}</button>
          ))}
          <div className="flex gap-1">
            <input type="number" value={customMinuteInput}
              onChange={(e) => setCustomMinuteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryApplyCustom()}
              placeholder="min"
              className="w-14 px-2 py-1.5 font-mono text-xs text-center focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,107,0,0.3)', color: '#ff6b00' }}
            />
            <button onClick={tryApplyCustom}
              className="px-2 py-1.5 font-mono text-xs"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.4)', color: '#ff6b00' }}
            >SET</button>
          </div>
        </div>

        <div className="flex justify-center mb-5 relative">
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#1a2f4a" strokeWidth="6" />
            <motion.circle cx="100" cy="100" r="90" fill="none" stroke={diffConfig.color}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
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
              SESSION {timerCompletedSessions + 1}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => { recordActivity(); onToggleTimer(); }}
            className="flex items-center gap-2 px-6 py-3 font-mono text-sm font-bold transition-all"
            style={{
              background: timerIsRunning ? 'rgba(255,0,255,0.15)' : `${diffConfig.color}20`,
              border: `1px solid ${timerIsRunning ? '#ff00ff' : diffConfig.color}`,
              color: timerIsRunning ? '#ff00ff' : diffConfig.color,
              boxShadow: timerIsRunning ? '0 0 15px rgba(255,0,255,0.3)' : `0 0 15px ${diffConfig.color}40`,
            }}
          >
            {timerIsRunning ? <Pause size={16} /> : <Play size={16} />}
            {timerIsRunning ? 'PAUSE' : 'ENGAGE'}
          </motion.button>
          <button onClick={() => { recordActivity(); onAbortTimer(); }}
            className="flex items-center gap-1 px-4 py-3 font-mono text-xs text-gray-500 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-900"
          >
            <RotateCcw size={14} /> ABORT
          </button>
        </div>

        {timerCompletedSessions > 0 && (
          <div className="mt-4 text-center font-mono text-xs text-gray-500">
            {timerCompletedSessions} POMODORO{timerCompletedSessions !== 1 ? 'S' : ''} COMPLETE
          </div>
        )}
        {task.pyqs > 0 && (
          <div className="mt-2 text-center font-mono text-xs" style={{ color: diffConfig.color }}>
            TARGET: {task.pyqs} PYQs
          </div>
        )}
        <LiveTimeDisplay taskId={task.id} isRunning={timerIsRunning} sessionStartRef={dummySessionRef} />
      </motion.div>
    </motion.div>
  );
}

function MissionCard({ task, onAnnihilate, onOpenTimer, onDelete, isActiveTimer, timerIsRunning, onActivateOverride }) {
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

  const dimmed = timerIsRunning && !isActiveTimer;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={comboExpired
        ? { x: [-6, 6, -6, 6, -4, 4, 0], transition: { duration: 0.5 } }
        : { opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${diffConfig.bg}, rgba(10,22,40,0.95))`,
        border: `1px solid ${cardBorderColor}`,
        boxShadow: cardGlow,
        opacity: dimmed ? 0.5 : 1,
        transition: 'opacity 0.4s, box-shadow 0.3s, border-color 0.3s',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: diffConfig.color, boxShadow: `0 0 ${8 + comboLevel * 4}px ${diffConfig.color}` }} />

      {isOverheat && (
        <motion.div className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.08, 0.22, 0.08] }} transition={{ repeat: Infinity, duration: 0.6 }}
          style={{ background: `radial-gradient(ellipse at center, ${diffConfig.color}44, transparent 70%)` }}
        />
      )}

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono tracking-widest px-2 py-0.5 border" style={{ color: diffConfig.color, borderColor: diffConfig.color, background: diffConfig.bg, fontSize: 9 }}>
                {diffConfig.label}
              </span>
              <span className="font-mono text-gray-600" style={{ fontSize: 9 }}>{HOURS_MAP[task.diff]}H EST.</span>
            </div>
            <h3 className="font-bold text-base text-white leading-tight">{task.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <SubjectIcon size={11} style={{ color: subjectColor }} />
              <span className="font-mono" style={{ color: subjectColor, fontSize: 10 }}>{task.subject}</span>
              {task.pyqs > 0 && <span className="font-mono text-gray-500" style={{ fontSize: 10 }}>• {task.pyqs} PYQs</span>}
            </div>
          </div>

          <div className="flex-shrink-0 text-center">
            <div className="font-mono text-xl font-black" style={{ color: diffConfig.color, textShadow: `0 0 10px ${diffConfig.color}` }}>{XP_MAP[task.diff]}</div>
            <div className="font-mono text-gray-600" style={{ fontSize: 9 }}>XP</div>
            {comboLevel > 0 && (
              <motion.div key={comboLevel} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-1">
                <div className="font-mono text-xs font-black" style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}>{currentMultiplier}x</div>
                <div className="font-mono text-yellow-600 flex items-center gap-0.5" style={{ fontSize: 8 }}>
                  {isOverheat ? <><Flame size={8} className="text-orange-400" />HOT</> : 'COMBO'}
                </div>
              </motion.div>
            )}
            {comboExpired && (
              <motion.div initial={{ scale: 1, opacity: 1 }} animate={{ scale: 0, opacity: 0 }} className="font-mono text-red-500 font-black" style={{ fontSize: 10 }}>SHATTER</motion.div>
            )}
          </div>
        </div>

        {targetPyqCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: diffConfig.color, boxShadow: `0 0 4px ${diffConfig.color}` }}
                animate={{ width: `${Math.min(100, (solvedCount / targetPyqCount) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="font-mono" style={{ color: diffConfig.color, fontSize: 10 }}>{solvedCount}/{targetPyqCount}</span>
            <motion.button whileTap={{ scale: 0.85 }} onClick={incrementSolved}
              className="px-2 py-1 font-mono font-black"
              style={{ background: `${diffConfig.color}20`, border: `1px solid ${diffConfig.color}60`, color: diffConfig.color, fontSize: 10 }}
            >+1</motion.button>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={() => onOpenTimer(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono tracking-wider transition-all"
            style={{ background: isActiveTimer ? 'rgba(0,255,65,0.15)' : 'rgba(0,245,255,0.08)', border: `1px solid ${isActiveTimer ? 'rgba(0,255,65,0.6)' : 'rgba(0,245,255,0.3)'}`, color: isActiveTimer ? '#00ff41' : '#00f5ff' }}
          >
            <Clock size={12} /> {isActiveTimer ? 'OPEN TIMER' : 'TIMER'}
          </button>

          <motion.button whileTap={canAnnihilate ? { scale: 0.95 } : {}}
            onClick={() => canAnnihilate && onAnnihilate(task, comboLevel, currentMultiplier)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono tracking-wider transition-all flex-1"
            style={{
              background: canAnnihilate ? `${diffConfig.color}18` : 'rgba(30,30,30,0.4)',
              border: `1px solid ${canAnnihilate ? `${diffConfig.color}80` : '#2a3a2a'}`,
              color: canAnnihilate ? diffConfig.color : '#3a4a3a',
              boxShadow: canAnnihilate ? `0 0 8px ${diffConfig.color}20` : 'none',
              cursor: canAnnihilate ? 'pointer' : 'not-allowed',
            }}
          >
            <Zap size={12} />
            {canAnnihilate
              ? (comboLevel > 0 ? '⚡ VELOCITY ANNIHILATE' : 'ANNIHILATE')
              : `LOCKED (${solvedCount}/${targetPyqCount})`}
          </motion.button>

          <button onClick={() => onDelete(task.id)}
            className="flex items-center px-2 py-1.5 text-gray-600 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-900"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {!task.isMicro && (
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
            onClick={() => onActivateOverride(task)}
            className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 px-3 font-mono tracking-widest"
            style={{
              background: 'linear-gradient(135deg, rgba(255,0,0,0.07), rgba(100,0,0,0.1))',
              border: '1px solid rgba(255,60,0,0.3)',
              color: 'rgba(255,100,60,0.7)',
              fontSize: 9,
            }}
          >
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>⚠</motion.span>
            SYSTEM STALLING: ACTIVATE OVERRIDE
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}>⚠</motion.span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function WarArchiveModal({ archives, onClose, totalXP, rankName, onDownloadPDF }) {
  const totalPyqsSolved = archives.reduce((s, e) => s + (e.finalPyqCount    || 0), 0);
  const totalMinutes    = archives.reduce((s, e) => s + (e.timeSpentMinutes || 0), 0);
  const totalHours      = (totalMinutes / 60).toFixed(1);

  const stats = [
    { value: archives.length,          label: 'MISSIONS COMPLETE' },
    { value: totalPyqsSolved,          label: 'TOTAL PYQs SOLVED' },
    { value: `${totalHours}h`,         label: 'HOURS INVESTED'    },
    { value: totalXP.toLocaleString(), label: 'TOTAL XP EARNED'   },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9980] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }}
        transition={{ type: 'spring', damping: 22 }}
        className="relative w-full flex flex-col"
        style={{ background: 'linear-gradient(135deg, #080e18, #04080f)', border: '1px solid rgba(255,165,0,0.4)', boxShadow: '0 0 40px rgba(255,165,0,0.15)', maxWidth: 900, maxHeight: '90vh' }}
      >
        <div className="no-print flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,165,0,0.2)', background: 'rgba(255,165,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
            </div>
            <span className="font-mono text-gray-600 tracking-widest" style={{ fontSize: 10 }}>nexus@mhtcet:~/WAR_ARCHIVES$</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider"
              style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.35)', color: '#00f5ff', fontSize: 10 }}
            ><Download size={11} /> DOWNLOAD INTEL REPORT</motion.button>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors ml-2"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="font-mono text-lg font-black tracking-widest" style={{ color: '#ffa500', textShadow: '0 0 16px rgba(255,165,0,0.5)' }}>📂 WAR ARCHIVES — CLASSIFIED INTEL</div>
          <div className="font-mono text-gray-600 mt-0.5" style={{ fontSize: 10 }}>Missions annihilated: {archives.length} | Rank: {rankName}</div>
        </div>

        <div className="mx-5 mb-3 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="p-2 text-center" style={{ background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)' }}>
              <div className="font-mono text-lg font-black" style={{ color: '#ffa500' }}>{s.value}</div>
              <div className="font-mono text-gray-600 tracking-wider" style={{ fontSize: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>

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
                  {['#', 'CHAPTER', 'SUBJECT', 'DIFF', 'PYQs', 'TIME', 'XP', 'DATE'].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-mono tracking-widest" style={{ color: 'rgba(255,165,0,0.6)', fontSize: 9 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {archives.map((entry, idx) => (
                  <motion.tr key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-2 px-2 font-mono text-gray-700" style={{ fontSize: 10 }}>{archives.length - idx}</td>
                    <td className="py-2 px-2">
                      <div className="text-white font-semibold" style={{ fontSize: 13 }}>
                        {entry.chapterName}
                        {entry.isRevisionNode && (
                          <span className="ml-2 font-mono px-1 py-0.5"
                            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700', fontSize: 7, verticalAlign: 'middle' }}>
                            HARDENED
                          </span>
                        )}
                      </div>
                      {entry.hadVelocityBonus && <div className="font-mono text-yellow-500" style={{ fontSize: 8 }}>⚡ VELOCITY BONUS</div>}
                      {entry.hadPowerHour     && <div className="font-mono text-orange-400" style={{ fontSize: 8 }}>⚡ POWER HOUR 2×</div>}
                      {entry.isRevisionNode   && (
                        <div className="font-mono" style={{ color: 'rgba(0,255,65,0.5)', fontSize: 8 }}>
                          ⟳ SPACED REVISION COMPLETE
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono" style={{ color: SUBJECT_PRINT_COLORS[entry.subject] || '#aaa', fontSize: 10 }}>{entry.subject}</td>
                    <td className="py-2 px-2">
                      <span className="font-mono px-1.5 py-0.5" style={{ color: DIFF_CONFIG[entry.difficulty]?.color || '#aaa', border: `1px solid ${DIFF_CONFIG[entry.difficulty]?.color || '#aaa'}50`, background: `${DIFF_CONFIG[entry.difficulty]?.color || '#aaa'}10`, fontSize: 9 }}>
                        {DIFF_LABELS_PRINT[entry.difficulty] || entry.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-white" style={{ fontSize: 11 }}>{entry.finalPyqCount || 0}</td>
                    <td className="py-2 px-2 font-mono text-gray-400" style={{ fontSize: 10 }}>{entry.timeSpentMinutes > 0 ? `${entry.timeSpentMinutes}m` : '—'}</td>
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

// ── NARRATIVE NEXUS: Component Definitions ──────────────────────

const NARRATIVE_CSS = `
  @keyframes glitch-base {
    0%,100% { transform: translate(0,0); }
    8%  { transform: translate(-2px,0); }
    16% { transform: translate(2px,0); }
    24% { transform: translate(0,1px); }
    32% { transform: translate(-1px,-1px); }
    40% { transform: translate(0,0); }
  }
  @keyframes glitch-rgb-r {
    0%,100% { clip-path: inset(0 0 98% 0); transform: translate(-3px,0); color:#ff2222; }
    20% { clip-path: inset(40% 0 30% 0); transform: translate(3px,0); }
    40% { clip-path: inset(80% 0 5%  0); transform: translate(-2px,1px); }
    60% { clip-path: inset(10% 0 70% 0); transform: translate(1px,0); }
    80% { clip-path: inset(60% 0 20% 0); transform: translate(-1px,-1px); }
  }
  @keyframes glitch-rgb-b {
    0%,100% { clip-path: inset(0 0 98% 0); transform: translate(3px,0); color:#00f5ff; }
    20% { clip-path: inset(60% 0 10% 0); transform: translate(-3px,0); }
    40% { clip-path: inset(20% 0 60% 0); transform: translate(2px,-1px); }
    60% { clip-path: inset(80% 0 5%  0); transform: translate(-1px,0); }
    80% { clip-path: inset(5%  0 80% 0); transform: translate(1px,1px); }
  }
  .glitch-word { position:relative; display:inline-block; animation:glitch-base 2.4s ease-in-out infinite; }
  .glitch-word::before { content:attr(data-text); position:absolute; left:0; top:0; width:100%; animation:glitch-rgb-r 2.4s ease-in-out infinite; opacity:0.7; }
  .glitch-word::after  { content:attr(data-text); position:absolute; left:0; top:0; width:100%; animation:glitch-rgb-b 2.4s ease-in-out infinite; opacity:0.7; }
  @keyframes intro-scan { 0% { top:-4px; } 100% { top:100%; } }
  .intro-scanline::after { content:''; position:absolute; left:0; right:0; height:4px; background:linear-gradient(180deg,rgba(0,245,255,0.18),transparent); animation:intro-scan 2.8s linear infinite; pointer-events:none; z-index:2; }
  .glass-reward { background:rgba(5,18,30,0.72); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4); border:1.5px solid rgba(0,245,255,0.55); box-shadow:0 0 32px rgba(0,245,255,0.25),0 0 80px rgba(0,245,255,0.10),inset 0 0 40px rgba(0,245,255,0.04); }
  @keyframes lock-shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
  .chapter-locked { filter:grayscale(1) brightness(0.45); pointer-events:none; user-select:none; position:relative; overflow:hidden; }
  .chapter-locked::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.06) 50%,transparent 60%); background-size:200% 100%; animation:lock-shimmer 3s linear infinite; pointer-events:none; }
  @keyframes victory-ring { 0% { box-shadow:0 0 0 0 rgba(0,255,65,0.6); } 70% { box-shadow:0 0 0 24px rgba(0,255,65,0); } 100% { box-shadow:0 0 0 0 rgba(0,255,65,0); } }
  .victory-ring { animation:victory-ring 1.2s ease-out 3; }
`;

function playVictoryOSTSafe() {
  if (!isAudioUnlocked()) return;
  playVictoryOST();
}

function playVictoryOST() {
  try {
    const audio = new Audio('/dramatic-ending.mp3');
    audio.volume = 0.55;
    audio.play().catch(() => {});
    setTimeout(() => {
      const faderId = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - 0.05);
        if (audio.volume <= 0) { audio.pause(); clearInterval(faderId); }
      }, 100);
    }, 27000);
    setTimeout(() => audio.pause(), 30000);
  } catch {}
}

function isChapterSequentiallyUnlocked(episode, chapterIndex, completedChapters) {
  if (chapterIndex === 0) return true;
  const prev = episode.chapters[chapterIndex - 1];
  return completedChapters.includes(`${prev.subject}::${prev.name}`);
}

function MorningIntro({ onDismiss, onAudioUnlock }) {
  const currentDay = getCampaignCurrentDay();
  const todayStr   = getTodayDateString();

  // ── VISIBILITY LOGIC ────────────────────────────────────────────
  // Show if: campaign is active (day 1-8) AND after 06:00 AND not yet seen today
const [visible, setVisible] = useState(false);
const [phase,   setPhase]   = useState('boot');
const [line,    setLine]    = useState(0);
const audioRef  = useRef(null);

// ── MOUNT-TIME VISIBILITY CHECK ──────────────────────────────────
// Runs after mount so localStorage is always read fresh, not during
// the render cycle where React may have stale closure values.
useEffect(() => {
  if (currentDay < 1 || currentDay > 8) return;
  // Use plain date string — shows intro every calendar day regardless of 6AM gate
  const todayPlain = new Date().toLocaleDateString();
  const lastSeen   = localStorage.getItem('morning_intro_last_date');
  if (lastSeen !== todayPlain) {
    setVisible(true);
  }
}, []); // intentionally empty — reads fresh from localStorage on mount

  // ── DYNAMIC EPISODE DATA PER DAY ────────────────────────────────
  const DAY_META = {
    1: { season: 1, ep: 1, epTitle: 'THE ATOMIC AWAKENING',   subtitle: 'Season Premiere'     },
    2: { season: 1, ep: 2, epTitle: 'THERMODYNAMIC RECKONING', subtitle: 'The Heat Protocol'  },
    3: { season: 1, ep: 3, epTitle: 'EQUILIBRIUM & CHAOS',     subtitle: 'The Balance Breaks' },
    4: { season: 1, ep: 4, epTitle: 'ELECTROCHEMICAL STORM',   subtitle: 'Current Wars'       },
    5: { season: 1, ep: 5, epTitle: 'DERIVATIVES OF DESTRUCTION', subtitle: 'Calculus Apocalypse' },
    6: { season: 1, ep: 6, epTitle: 'ORGANIC UPRISING',        subtitle: 'Carbon Strikes Back' },
    7: { season: 1, ep: 7, epTitle: 'THE FINAL NEXUS',         subtitle: 'Season Finale'      },
    8: { season: 1, ep: 8, epTitle: 'ASCENSION PROTOCOL',      subtitle: 'The Ghost Awaits'   },
  };

  const meta = DAY_META[currentDay] || DAY_META[1];

  const LINES = [
    'NEURAL LINK ESTABLISHED...',
    `DAY  ${String(currentDay).padStart(2,'0')} / 08`,
    `MISSION: ${meta.epTitle}`,
  ];

useEffect(() => {
  if (!visible) return;
  const bootTimer = setTimeout(() => {
    setPhase('lines');
    let idx = 0;
    const advance = () => {
      idx++;
      setLine(idx);
      if (idx < LINES.length - 1) setTimeout(advance, 1100);
      else setTimeout(() => setPhase('button'), 1400);
    };
    setTimeout(advance, 900);
  }, 600);
  return () => {
    clearTimeout(bootTimer);
    // Do NOT touch audioRef here — audio is managed on window._introAudio
  };
}, [visible]);

const handleSync = () => {
  // 1. Start audio on user gesture — bypasses browser autoplay block
  try {
    const audio = new Audio('/intro-theme.mp3');
    audio.volume = 0.55;
    audio.play().catch(() => {});
    const faderId = setTimeout(() => {
      const fadeInterval = setInterval(() => {
        if (audio.volume <= 0.05) {
          audio.pause();
          clearInterval(fadeInterval);
        } else {
          audio.volume = Math.max(0, audio.volume - 0.05);
        }
      }, 120);
    }, 28000);
    window._introAudio = audio;
    window._introFader = faderId;
  } catch {}

  // 2. Unlock audio globally for the session
  markAudioUnlocked();
  if (onAudioUnlock) onAudioUnlock();

  // 3. Persist — won't show again today
localStorage.setItem('morning_intro_last_date', new Date().toLocaleDateString());

  // 4. Dismiss safely — audio survives on window
  setVisible(false);
  onDismiss?.();
};

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center intro-scanline"
      style={{ background: '#000', overflow: 'hidden' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.03) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Episode tag */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="absolute top-10 left-1/2 -translate-x-1/2 font-mono text-center"
        style={{ color: 'rgba(255,0,255,0.6)', fontSize: 10, letterSpacing: '0.35em', whiteSpace: 'nowrap' }}
      >
        NEURAL-WARFARE: SEASON {meta.season} &nbsp;•&nbsp; EPISODE {String(meta.ep).padStart(2,'0')} — {meta.subtitle.toUpperCase()}
      </motion.div>

      {/* Day counter top-right */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="absolute top-10 right-8 font-mono text-right"
        style={{ color: 'rgba(0,255,65,0.5)', fontSize: 9, letterSpacing: '0.2em' }}
      >
        CAMPAIGN DAY<br />
        <span style={{ fontSize: 24, fontWeight: 900, color: '#00ff41', textShadow: '0 0 12px #00ff41' }}>
          {currentDay}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(0,255,65,0.4)' }}> / 8</span>
      </motion.div>

      <div className="relative z-10 text-center space-y-6 px-8">
        {LINES.map((txt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: line >= i ? 1 : 0, y: line >= i ? 0 : 8 }}
            transition={{ duration: 0.6 }}
          >
            {i === 1 ? (
              <div className="glitch-word font-mono font-black" data-text={txt}
                style={{ fontSize: 'clamp(42px,10vw,80px)', color: '#00f5ff', textShadow: '0 0 30px #00f5ff,0 0 80px rgba(0,245,255,0.4)', letterSpacing: '0.12em' }}
              >{txt}</div>
            ) : i === 2 ? (
              <div className="glitch-word font-mono font-black" data-text={txt}
                style={{ fontSize: 'clamp(14px,3vw,22px)', color: '#ff00ff', textShadow: '0 0 18px #ff00ff', letterSpacing: '0.12em' }}
              >{txt}</div>
            ) : (
              <div className="font-mono" style={{ fontSize: 13, color: '#00ff41', textShadow: '0 0 10px #00ff41', letterSpacing: '0.25em' }}>{txt}</div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {phase === 'button' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ type: 'spring', damping: 18 }}
            className="mt-14 relative z-10"
          >
            <motion.button
              onClick={handleSync}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
              animate={{ boxShadow: ['0 0 16px rgba(0,245,255,0.3)','0 0 32px rgba(0,245,255,0.7)','0 0 16px rgba(0,245,255,0.3)'] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="px-12 py-5 font-mono font-black tracking-widest text-sm"
              style={{ background: 'rgba(0,245,255,0.1)', border: '2px solid #00f5ff', color: '#00f5ff', letterSpacing: '0.2em' }}
            >⚡ SYNC NEURAL LINK</motion.button>
            <p className="font-mono text-center mt-3" style={{ color: 'rgba(0,245,255,0.3)', fontSize: 9, letterSpacing: '0.3em' }}>
              DISMISS TO BEGIN DAY {String(currentDay).padStart(2,'0')} OPERATIONS
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner brackets */}
      {[{t:16,l:16,r:'none',b:'none'},{t:16,r:16,l:'none',b:'none'},{b:16,l:16,t:'none',r:'none'},{b:16,r:16,t:'none',l:'none'}].map((s,i) => (
        <svg key={i} width="40" height="40" viewBox="0 0 40 40" fill="none" className="absolute pointer-events-none"
          style={{ top: s.t !== 'none' ? s.t : 'auto', bottom: s.b !== 'none' ? s.b : 'auto', left: s.l !== 'none' ? s.l : 'auto', right: s.r !== 'none' ? s.r : 'auto', opacity: 0.5, transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1,-1)' : 'none' }}
        >
          <path d="M0 40 L0 0 L40 0" stroke="#00f5ff" strokeWidth="1.5"/>
        </svg>
      ))}
    </motion.div>
  );
}

function DailyReward({ onClose }) {
const currentDay = getCampaignCurrentDay();
const DAILY_LORE = {
  1: `Sector 1 Cleared. The Atomic foundations are set.\n\nYour Neural Link is stable. The Ghost has been sighted.\n\nRest now, Pilot. The Heat Protocol begins tomorrow.`,
  2: `Sector 2 Secured. The Ghost's thermal signature is fading.\n\nYour cognitive output has exceeded baseline parameters.\n\nRest now, Pilot. Tomorrow, the Equilibrium awaits.`,
  3: `Sector 3 Neutralized. Balance and chaos — both defeated.\n\nThe Ghost recalculates. It did not expect this pace.\n\nRest now, Pilot. The Current Wars begin at dawn.`,
  4: `Sector 4 Dominated. The electrochemical grid is yours.\n\nYour Integrity holds. The Ghost is losing ground.\n\nRest now, Pilot. Calculus awaits the next sunrise.`,
  5: `Sector 5 Annihilated. The derivatives could not stop you.\n\nFour sectors remain. The Ghost is desperate.\n\nRest now, Pilot. The organic uprising is next.`,
  6: `Sector 6 Conquered. Carbon has surrendered its secrets.\n\nThe Ghost's trail goes cold. You are ahead.\n\nRest now, Pilot. Only the Final Nexus remains.`,
  7: `Sector 7 Complete. The Nexus bows before you.\n\nOne day remains. The Ghost has been cornered.\n\nRest now, Pilot. Tomorrow — Ascension.`,
  8: `ALL SECTORS ANNIHILATED. THE CAMPAIGN IS COMPLETE.\n\nNeural Link: 100%. The Ghost has been integrated.\n\nYou are no longer the student. You are the System.`,
};
const LORE = DAILY_LORE[currentDay] || DAILY_LORE[1];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99990] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,5,12,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.82, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.82, y: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="glass-reward relative flex flex-col items-center text-center"
        style={{ maxWidth: 480, width: '100%', padding: '44px 36px 36px', borderRadius: 2 }}
      >
        {[{top:0,left:0},{top:0,right:0,transform:'scaleX(-1)'},{bottom:0,left:0,transform:'scaleY(-1)'},{bottom:0,right:0,transform:'scale(-1,-1)'}].map((s,i) => (
          <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none" style={{position:'absolute',opacity:0.7,...s}}>
            <path d="M0 24 L0 0 L24 0" stroke="#00f5ff" strokeWidth="1.5"/>
          </svg>
        ))}
        <motion.div className="w-full mb-6 overflow-hidden" style={{ border:'1px solid rgba(0,245,255,0.35)', boxShadow:'0 0 24px rgba(0,245,255,0.2)', maxHeight:200 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        >
          <img src="/day-2-reward.jpg" alt="Day 2 Reward" style={{ width:'100%', objectFit:'cover', display:'block' }} onError={(e) => { e.currentTarget.style.display='none'; }} />
        </motion.div>
        <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.35 }}
          className="font-mono text-xs tracking-widest mb-3 px-4 py-1.5"
          style={{ background:'rgba(0,245,255,0.08)', border:'1px solid rgba(0,245,255,0.4)', color:'#00f5ff', textShadow:'0 0 10px #00f5ff' }}
        >✦ DAY {String(currentDay).padStart(2,'0')} COMPLETE — SECTOR {currentDay} SECURED ✦</motion.div>
        <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
          className="font-mono text-sm leading-relaxed mb-8"
          style={{ color:'rgba(180,210,230,0.85)', whiteSpace:'pre-line', lineHeight:1.8 }}
        >{LORE}</motion.p>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.94 }} onClick={onClose}
          animate={{ boxShadow:['0 0 12px rgba(0,245,255,0.3)','0 0 28px rgba(0,245,255,0.6)','0 0 12px rgba(0,245,255,0.3)'] }}
          transition={{ repeat:Infinity, duration:2 }}
          className="px-10 py-3 font-mono font-black tracking-widest text-sm victory-ring"
          style={{ background:'rgba(0,245,255,0.1)', border:'1.5px solid #00f5ff', color:'#00f5ff', letterSpacing:'0.18em' }}
        >{currentDay < 8 ? `REST, PILOT — SEE YOU ON DAY ${String(currentDay + 1).padStart(2,'0')}` : `MISSION COMPLETE — YOU ARE THE SYSTEM`}</motion.button>
      </motion.div>
    </motion.div>
  );
}

function EpisodeCardV2({ episode, isLocked, completedChapters, onDeployChapter, deployedNames }) {
  const episodeChapterKeys = episode.chapters.map(c => `${c.subject}::${c.name}`);
  const completedInEpisode = episodeChapterKeys.filter(k => completedChapters.includes(k)).length;
  const totalInEpisode     = episode.chapters.length;
  const isComplete         = completedInEpisode === totalInEpisode;
  const pct                = (completedInEpisode / totalInEpisode) * 100;

  return (
    <motion.div layout initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="relative overflow-hidden"
      style={{
        background: isLocked ? 'linear-gradient(135deg,rgba(10,10,16,0.95),rgba(5,5,10,0.95))' : 'linear-gradient(135deg,rgba(10,18,30,0.95),rgba(6,10,18,0.95))',
        border: isLocked ? '1px solid rgba(50,50,70,0.4)' : `1px solid ${episode.color}40`,
        boxShadow: isComplete ? `0 0 20px ${episode.color}30` : 'none',
        filter: isLocked ? 'blur(1px)' : 'none',
      }}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center" style={{ background:'rgba(5,5,12,0.7)', backdropFilter:'blur(3px)' }}>
          <Lock size={22} style={{ color:'rgba(100,100,140,0.6)' }} />
          <div className="font-mono text-xs text-gray-700 mt-2 tracking-widest">LOCKED</div>
          <div className="font-mono text-gray-800 mt-0.5" style={{ fontSize:9 }}>Complete Ep {episode.id - 1} to unlock</div>
        </div>
      )}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom:`1px solid ${episode.color}20` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="font-mono font-black" style={{ color:episode.color, fontSize:9 }}>EPISODE {episode.id}</div>
            <div className="font-mono text-gray-700" style={{ fontSize:9 }}>{episode.subtitle}</div>
          </div>
          {isComplete && (
            <motion.div animate={{ scale:[1,1.2,1] }} transition={{ repeat:Infinity, duration:2 }}>
              <CheckCircle size={14} style={{ color:episode.color }} />
            </motion.div>
          )}
        </div>
        <div className="font-mono text-sm font-black" style={{ color: isLocked ? 'rgba(80,80,100,0.5)' : episode.color, textShadow: isLocked ? 'none' : `0 0 10px ${episode.color}60` }}>{episode.title}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'#0a1020' }}>
            <motion.div className="h-full rounded-full" style={{ background:episode.color, boxShadow:`0 0 4px ${episode.color}` }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }} />
          </div>
          <span className="font-mono" style={{ color:episode.color, fontSize:9 }}>{completedInEpisode}/{totalInEpisode}</span>
        </div>
      </div>
      <div className="px-3 py-2 space-y-1">
        {episode.chapters.map((ch, idx) => {
          const key          = `${ch.subject}::${ch.name}`;
          const isCompleted  = completedChapters.includes(key);
          const seqUnlocked  = isChapterSequentiallyUnlocked(episode, idx, completedChapters);
          const isDeployed   = deployedNames.some(d => d.subject === ch.subject && d.name === ch.name);
          const sc           = SUBJECT_CONFIG[ch.subject];
          const dc           = DIFF_CONFIG[[ch.subject]?.find(s => s.name === ch.name)?.diff || 'M'];
          const SubIcon      = sc?.icon || BookOpen;
          const visuallyLocked = isLocked || (!isCompleted && !seqUnlocked);
          return (
            <motion.div key={ch.name} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:idx*0.05 }}
              className={`flex items-center gap-2 py-1.5 px-2 rounded relative ${visuallyLocked ? 'chapter-locked' : ''}`}
              style={{ background: isCompleted ? 'rgba(0,0,0,0.3)' : 'transparent' }}
            >
              {isCompleted ? <CheckCircle size={11} style={{ color:'#00ff41', flexShrink:0 }} />
               : visuallyLocked ? <Lock size={11} style={{ color:'rgba(120,120,160,0.5)', flexShrink:0 }} />
               : <div style={{ width:11, height:11, flexShrink:0, border:`1px solid ${dc.color}`, borderRadius:'50%' }} />}
              <SubIcon size={10} style={{ color:sc?.color, flexShrink:0 }} />
              <span className="text-xs flex-1 font-mono" style={{ color: isCompleted ? '#3a5060' : visuallyLocked ? '#2a3040' : '#c0d8f0', textDecoration: isCompleted ? 'line-through' : 'none', textDecorationColor:'#ff00ff' }}>{ch.name}</span>
              <span className="font-mono" style={{ color:sc?.color, fontSize:8 }}>{ch.subject.slice(0,3).toUpperCase()}</span>
              {!isCompleted && !isDeployed && !isLocked && seqUnlocked && (
                <motion.button whileTap={{ scale:0.88 }} onClick={() => onDeployChapter(ch)}
                  className="px-1.5 py-0.5 font-mono font-black"
                  style={{ background:`${episode.color}18`, border:`1px solid ${episode.color}60`, color:episode.color, fontSize:8 }}
                >+ADD</motion.button>
              )}
              {isDeployed && !isCompleted && <span className="font-mono" style={{ color:'#4a8060', fontSize:8 }}>QUEUED</span>}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 6 — MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {

  // ── NEURAL ALARM REF ────────────────────────────────────────────
  const alarmRef = useRef(null);

  // ── PWA INSTALL PROMPT ───────────────────────────────────────────
  const [installPrompt,   setInstallPrompt]   = useState(null);
  const [isAppInstalled,  setIsAppInstalled]  = useState(false);

  useEffect(() => {
    // Detect if already running as installed PWA.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();           // Block the default mini-infobar.
      setInstallPrompt(e);          // Save the event for later.
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled',        handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled',        handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    const { outcome } = await installPrompt.prompt();
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsAppInstalled(true);
    }
  };

  // Resonance level bridge (reads from localStorage set by ResonanceSiege)
const [resonanceLevelForSanctum, setResonanceLevelForSanctum] = useState(
() => JSON.parse(localStorage.getItem('resonanceLevel') || '0')
);
// Poll every 5s — bridge between ResonanceSiege and NeuralSanctum
useEffect(() => {
const id = setInterval(() => {
const v = JSON.parse(localStorage.getItem('resonanceLevel') || '0');
setResonanceLevelForSanctum(v);
}, 5_000);
return () => clearInterval(id);
}, []);
// Sanctum hook — MUST be at top level (Rules of Hooks)
const sanctum = useSanctumState(resonanceLevelForSanctum);
// Ghost ping count for daily log
const [ghostPingCount, setGhostPingCount] = useState(() => {
try {
const saved = JSON.parse(localStorage.getItem('ghost_ping_day') || 'null');
if (saved?.day === new Date().toDateString()) return saved.count;
} catch {}
return 0;
});

  // ── BOOT SEQUENCE STATE ─────────────────────────────────────────
  const [showBoot,    setShowBoot]    = useState(false);
  const [appReady,    setAppReady]    = useState(false);
  const [bootChecked, setBootChecked] = useState(false);

  const storyStarted = appReady;

  useEffect(() => {
    const lastLogin = LS.get('last_login_epoch', null);
    const needsBoot = isNewGameDay(lastLogin);
    if (needsBoot) {
      setShowBoot(true);
    } else {
      setAppReady(true);
    }
    setBootChecked(true);
    LS.set('last_login_epoch', Date.now());
  }, []);

  // ── RPG STATS STATE ─────────────────────────────────────────────
  const [totalXP,  setTotalXP]  = useState(() => LS.get('total_xp', 0));
  const [rpgStats, setRpgStats] = useState(() => LS.get('rpg_stats', { strength: 0, dexterity: 0, intelligence: 0 }));

  const userLevel   = getUserLevel(totalXP);
  const systemTheme = getSystemTheme(userLevel);

  // ── WAR START DATE ──────────────────────────────────────────────
  const [warStartDate, setWarStartDate] = useState(() => {
    const saved = LS.get('war_start_date', null);
    if (saved) return saved;
    return Date.now();
  });

  // ── POWER HOUR STATE ────────────────────────────────────────────
  const [powerHourEnd, setPowerHourEnd] = useState(() => {
    const saved = LS.get('power_hour_end', null);
    if (saved && isPowerHourActive(saved)) return saved;
    return null;
  });
  const isInPowerHour = isPowerHourActive(powerHourEnd);

  // ── ENTERTAINMENT / DAILY PYQs ──────────────────────────────────
  const [dailyPyqsSolved, setDailyPyqsSolved] = useState(() => {
    const savedDay  = LS.get('daily_pyq_day',    null);
    const savedPyqs = LS.get('daily_pyqs_solved', 0);
    if (savedDay === getGameDay()) return savedPyqs;
    return 0;
  });

  // ── SYSTEM INTEGRITY ────────────────────────────────────────────
  const [systemIntegrity, setSystemIntegrity] = useState(() => LS.get('system_integrity', 100));

  // ── ALARM BANNER DISMISS ────────────────────────────────────────
  const [alarmBannerDismissed, setAlarmBannerDismissed] = useState(false);
  const prevIntegrityRef = useRef(systemIntegrity);

  // ── CORE APP STATE ──────────────────────────────────────────────
const [completedChapters, setCompletedChapters] = useState(() => LS.get('completed_chapters', []));
const [missions,          setMissions]          = useState(() => LS.get('missions', []));

// ── BOSS MODE — must come after completedChapters is declared ──
const { isBossMode, bossThemeStyle } = useBossModeTheme(completedChapters.length);

  // ── REVISIONS ───────────────────────────────────────────────────
  const [revisions, setRevisions] = useState(() => {
    const saved = LS.get('revisions', []);
    if (!saved.length) return [];
    const isOldFormat = saved.some((r) => 'dueDate' in r && !('milestones' in r));
    if (!isOldFormat) return saved;
    const grouped = {};
    saved.forEach((r) => {
      const key = `${r.subject}::${r.chapterName}`;
      if (!grouped[key]) {
        grouped[key] = {
          id:          `migrated_${key}_${Date.now()}`,
          chapterName: r.chapterName,
          subject:     r.subject,
          completedAt: Date.now() - 8 * 86400000,
          milestones:  { d1: null, d3: null, d7: null },
        };
      }
      const milestoneKey = r.revNum === 1 ? 'd1' : r.revNum === 2 ? 'd3' : r.revNum === 3 ? 'd7' : null;
      if (milestoneKey && r.done) grouped[key].milestones[milestoneKey] = Date.now();
    });
    return Object.values(grouped);
  });

  const [warArchives,   setWarArchives]   = useState(() => LS.get('WAR_ARCHIVES', []));
  const [vigilanceMode, setVigilanceMode] = useState(() => LS.get('vigilance_mode', false));

  // ── MICRO-MISSION STATE ─────────────────────────────────────────
  const [gachaRefresh, setGachaRefresh] = useState(0);
  // ── PROJECT ECHO STATE ──────────────────────────────────────────
  const [echoModalNarrative,  setEchoModalNarrative]  = useState(null);
  const [echoFragmentSeen,    setEchoFragmentSeen]    = useState(
    () => LS.get('echo_fragment_seen', 0)
  );
  const [echoLatestNarrative, setEchoLatestNarrative] = useState(() => {
    const lastSeen = LS.get('echo_fragment_seen', 0);
    return lastSeen > 0 ? getNarrativeByChapter(lastSeen) : null;
  });
  const consecutiveChaptersRef = useRef(0);
  const lastTabHiddenRef       = useRef(false);
  const rescueToastTimerRef    = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [resonanceLevelForSanctum, setResonanceLevelForSanctum] = useState( () => JSON.parse(localStorage.getItem('resonanceLevel') || '0') );
  const sanctum = useSanctumState(resonanceLevelForSanctum);
  const [ghostPingCount, setGhostPingCount] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('ghost_ping_day') || 'null');
    if (saved?.day === new Date().toDateString()) return saved.count;
  } catch {}
  return 0;
});
  const [showMorningIntro, setShowMorningIntro] = useState(true);
  const [showDailyReward,  setShowDailyReward]  = useState(false);
  const day2RewardShownRef = useRef(false);
  const [showMicroMission,     setShowMicroMission]     = useState(false);
  const [microMissionParentId, setMicroMissionParentId] = useState(null);

  // ── TIMER STATE ─────────────────────────────────────────────────
  const [timerTaskId,            setTimerTaskId]            = useState(() => LS.get('ptimer_taskId', null));
  const [timerSecondsLeft,       setTimerSecondsLeft]       = useState(() => LS.get('ptimer_secondsLeft', POMODORO_WORK));
  const [timerTotalSeconds,      setTimerTotalSeconds]      = useState(() => LS.get('ptimer_totalSeconds', POMODORO_WORK));
  const [timerIsRunning,         setTimerIsRunning]         = useState(false);
  const [timerIsBreak,           setTimerIsBreak]           = useState(() => LS.get('ptimer_isBreak', false));
  const [timerCompletedSessions, setTimerCompletedSessions] = useState(() => LS.get('ptimer_sessions', 0));
  const sessionStartEpochRef = useRef(null);

  // ── UI STATE ────────────────────────────────────────────────────
  const [modalOpen,        setModalOpen]       = useState(false);
  const [xpFloatData,      setXpFloatData]     = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // ── MISSION BUILDER FORM ────────────────────────────────────────
  const [formSubject,  setFormSubject]  = useState('Physics');
  const [formChapter,  setFormChapter]  = useState('');
  const [formDiff,     setFormDiff]     = useState('M');
  const [formPyqCount, setFormPyqCount] = useState(0);

// ✅ FIXED — correctly finds the first incomplete Physics chapter
useEffect(() => {
  const first = SYLLABUS['Physics'].find(
    (ch) => !completedChapters.includes(`Physics::${ch.name}`)
  );
  if (first) {
    setFormChapter(first.name);
    setFormDiff(first.diff);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // ── PERSISTENCE ─────────────────────────────────────────────────
  useEffect(() => { LS.set('completed_chapters', completedChapters); }, [completedChapters]);
  useEffect(() => { LS.set('total_xp',           totalXP);           }, [totalXP]);
  useEffect(() => { LS.set('rpg_stats',           rpgStats);          }, [rpgStats]);
  useEffect(() => { LS.set('missions',            missions);          }, [missions]);
  useEffect(() => { LS.set('revisions',           revisions);         }, [revisions]);
  useEffect(() => { LS.set('vigilance_mode',      vigilanceMode);     }, [vigilanceMode]);
  useEffect(() => { LS.set('system_integrity',    systemIntegrity);   }, [systemIntegrity]);
  useEffect(() => { LS.set('ptimer_secondsLeft',  timerSecondsLeft);  }, [timerSecondsLeft]);
  useEffect(() => { LS.set('ptimer_totalSeconds', timerTotalSeconds); }, [timerTotalSeconds]);
  useEffect(() => { LS.set('ptimer_isBreak',      timerIsBreak);      }, [timerIsBreak]);
  useEffect(() => { LS.set('ptimer_sessions',     timerCompletedSessions); }, [timerCompletedSessions]);
  useEffect(() => { LS.set('ptimer_taskId',       timerTaskId);       }, [timerTaskId]);
  useEffect(() => { LS.set('echo_fragment_seen', echoFragmentSeen); }, [echoFragmentSeen]);
  useEffect(() => { const id = setInterval(() => { const v = JSON.parse(localStorage.getItem('resonanceLevel') || '0');
  setResonanceLevelForSanctum(v);
  }, 5_000);
  return () => clearInterval(id);
}, []);
  useEffect(() => { LS.set('power_hour_end',      powerHourEnd);      }, [powerHourEnd]);
  useEffect(() => { LS.set('war_start_date',      warStartDate);      }, [warStartDate]);
  useEffect(() => {
    LS.set('daily_pyqs_solved', dailyPyqsSolved);
    LS.set('daily_pyq_day',     getGameDay());
  }, [dailyPyqsSolved]);

// ── DYNAMIC DAILY VICTORY CHECK ────────────────────────────────────
useEffect(() => {
  if (day2RewardShownRef.current) return;

  const currentDay = getCampaignCurrentDay();
  if (currentDay < 1 || currentDay > 8) return;

  // Today's episode index = currentDay - 1 (Episodes array is 0-indexed)
  const todayEpisodeIndex = currentDay - 1;
  const todayEpisode = EPISODES[todayEpisodeIndex];
  if (!todayEpisode) return;

  const todayChapterKeys = todayEpisode.chapters.map(c => `${c.subject}::${c.name}`);
  const allDone = todayChapterKeys.every(k => completedChapters.includes(k));
  if (!allDone) return;

  // Check we haven't shown the reward for today already
  const rewardShownDay = LS.get('daily_reward_shown_day', null);
  if (rewardShownDay === getTodayDateString()) return;

  day2RewardShownRef.current = true;
  LS.set('daily_reward_shown_day', getTodayDateString());

  playVictoryOSTSafe();
  setTimeout(() => setShowDailyReward(true), 1800);
}, [completedChapters]);
  
  // ── 6 AM DAILY RESET ────────────────────────────────────────────
  useEffect(() => {
    let lastKnownDay = getGameDay();
    const id = setInterval(() => {
      const currentDay = getGameDay();
      if (currentDay !== lastKnownDay) {
        lastKnownDay = currentDay;
        setDailyPyqsSolved(0);
        LS.set('daily_leisure_redeemed', 0);
        setPowerHourEnd((prev) => {
          if (prev && !isPowerHourActive(prev)) return null;
          return prev;
        });
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ════════════════════════════════════════════════════════════════
  // INTEGRITY DECAY SYSTEM — REWRITTEN
  //
  // Strategy: use a ref that mirrors timerIsRunning so that the
  // setInterval and visibilitychange callbacks never capture a stale
  // closure value.  State updates from both effects trigger the alarm
  // useEffect automatically because they change `systemIntegrity`.
  // ════════════════════════════════════════════════════════════════

  // Ref that always reflects the live timerIsRunning value.
  const timerIsRunningRef = useRef(timerIsRunning);
  useEffect(() => {
    timerIsRunningRef.current = timerIsRunning;
  }, [timerIsRunning]);

  // Timestamp of when the browser tab was hidden (null = tab is visible).
  const tabHiddenAtRef = useRef(null);

  // ── PASSIVE DECAY — 1-minute interval ──────────────────────────
  // Runs once on mount; reads timerIsRunning via ref to avoid staleness.
  // Formula: 5 % / 60 min ≈ 0.0833 % per minute.
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only decay when the timer is NOT running.
      if (timerIsRunningRef.current) return;

      setSystemIntegrity((prev) => {
        const next = Math.max(0, prev - INTEGRITY_DECAY_PER_MINUTE);
        LS.set('system_integrity', next);   // keep LS in sync immediately
        return next;
      });
    }, 60_000); // every 60 seconds

    return () => clearInterval(intervalId);
  }, []); // intentionally empty — reads live state via ref

  // ── TAB-AWAY SLASH — visibilitychange ──────────────────────────
  // When the user hides the tab (alt-tab, K-drama, etc.) we record
  // when they left.  On returning we calculate hours away and slash
  // the integrity immediately by the equivalent decay amount.
  // Guard: if the timer is running while away, no slash is applied
  // (they might be studying with the tab in the background).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab just became hidden — record departure time.
        tabHiddenAtRef.current = Date.now();
      } else {
        // Tab became visible again.
        if (tabHiddenAtRef.current === null) return; // safety guard

        const awayMs    = Date.now() - tabHiddenAtRef.current;
        tabHiddenAtRef.current = null;

        // Only slash if the timer was not running during the absence.
        if (timerIsRunningRef.current) return;

        const awayHours  = awayMs / 3_600_000;            // ms → hours
        const slashAmount = awayHours * INTEGRITY_DECAY_PER_HOUR; // 5 %/hr

        if (slashAmount <= 0) return;

        setSystemIntegrity((prev) => {
          const next = Math.max(0, prev - slashAmount);
          LS.set('system_integrity', next);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // intentionally empty — reads live state via ref

// ── ECHO RESCUE BONUS — visibility tracker ───────────────────
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        lastTabHiddenRef.current = true;
        consecutiveChaptersRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  
  // ════════════════════════════════════════════════════════════════
  // NEURAL ALARM — reacts to systemIntegrity + timerIsRunning.
  // No changes needed here: the decay effects above update state,
  // which re-triggers this effect automatically.
  //
  // Condition: integrity < 60 AND timer NOT running AND story started.
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!alarmRef.current) return;

    const alarmShouldFire = systemIntegrity < ALARM_INTEGRITY_THRESHOLD
                            && !timerIsRunning
                            && storyStarted;

    if (alarmShouldFire) {
      // Re-show banner if integrity just crossed into critical tier.
      const wasAboveVignette = prevIntegrityRef.current >= VIGNETTE_INTEGRITY_THRESHOLD;
      const nowBelowVignette = systemIntegrity < VIGNETTE_INTEGRITY_THRESHOLD;
      if (wasAboveVignette && nowBelowVignette) {
        setAlarmBannerDismissed(false);
      }
      prevIntegrityRef.current = systemIntegrity;

      alarmRef.current.play().catch(() => {
        // Autoplay may be blocked; banner still shows.
      });
    } else {
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }
      prevIntegrityRef.current = systemIntegrity;
    }
  }, [systemIntegrity, timerIsRunning, storyStarted]);

  // ── TIMER TICK ───────────────────────────────────────────────────
  const tickRef = useRef(null);

  useEffect(() => {
    if (!timerIsRunning) {
      clearInterval(tickRef.current);
      tickRef.current = null;
      if (sessionStartEpochRef.current !== null && timerTaskId) {
        const elapsed  = Math.floor((Date.now() - sessionStartEpochRef.current) / 1000);
        const previous = LS.get(`time_spent_${timerTaskId}`, 0);
        LS.set(`time_spent_${timerTaskId}`, previous + elapsed);
        sessionStartEpochRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tickRef.current);
          tickRef.current = null;
          setTimerIsRunning(false);
          setTimerIsBreak((wasBreak) => {
            const nextIsBreak      = !wasBreak;
            const nextTotalSeconds = nextIsBreak ? POMODORO_BREAK : POMODORO_WORK;
            setTimerTotalSeconds(nextTotalSeconds);
            if (!wasBreak) setTimerCompletedSessions((s) => s + 1);
            return nextIsBreak;
          });
          return timerTotalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(tickRef.current); tickRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerIsRunning]);

  // ── TIMER CALLBACKS ─────────────────────────────────────────────
  const handleToggleTimer = useCallback(() => {
    setTimerIsRunning((prev) => {
      if (!prev) {
        // Timer starting — restore integrity, silence alarm.
        sessionStartEpochRef.current = Date.now();
        setSystemIntegrity((si) => {
          const next = Math.min(100, si + INTEGRITY_RESTORE_AMOUNT);
          LS.set('system_integrity', next);
          return next;
        });
        // The alarm useEffect reacts to timerIsRunning → true and silences automatically.
      } else {
        if (sessionStartEpochRef.current !== null && timerTaskId) {
          const elapsed  = Math.floor((Date.now() - sessionStartEpochRef.current) / 1000);
          const previous = LS.get(`time_spent_${timerTaskId}`, 0);
          LS.set(`time_spent_${timerTaskId}`, previous + elapsed);
          sessionStartEpochRef.current = null;
        }
      }
      return !prev;
    });
  }, [timerTaskId]);

  const handleAbortTimer = useCallback(() => {
    if (sessionStartEpochRef.current !== null && timerTaskId) {
      const elapsed  = Math.floor((Date.now() - sessionStartEpochRef.current) / 1000);
      const previous = LS.get(`time_spent_${timerTaskId}`, 0);
      LS.set(`time_spent_${timerTaskId}`, previous + elapsed);
      sessionStartEpochRef.current = null;
    }
    setTimerIsRunning(false);
    setTimerSecondsLeft(POMODORO_WORK);
    setTimerTotalSeconds(POMODORO_WORK);
    setTimerIsBreak(false);
    setTimerCompletedSessions(0);
  }, [timerTaskId]);

  const handleApplyPreset = useCallback((presetSeconds) => {
    if (sessionStartEpochRef.current !== null && timerTaskId) {
      const elapsed  = Math.floor((Date.now() - sessionStartEpochRef.current) / 1000);
      const previous = LS.get(`time_spent_${timerTaskId}`, 0);
      LS.set(`time_spent_${timerTaskId}`, previous + elapsed);
      sessionStartEpochRef.current = null;
    }
    setTimerIsRunning(false);
    setTimerSecondsLeft(presetSeconds);
    setTimerTotalSeconds(presetSeconds);
    setTimerIsBreak(false);
  }, [timerTaskId]);

  const handleApplyCustomMinutes = useCallback((minutes) => {
    handleApplyPreset(minutes * 60);
  }, [handleApplyPreset]);

  const handleOpenTimer = useCallback((task) => {
    if (timerTaskId !== task.id) {
      handleAbortTimer();
      setTimerTaskId(task.id);
    }
    setModalOpen(true);
  }, [timerTaskId, handleAbortTimer]);

  const handleCloseModal = useCallback(() => setModalOpen(false), []);
  const activeTimerTask  = missions.find((m) => m.id === timerTaskId) || null;

  // ── BOOT INITIALIZE HANDLER ─────────────────────────────────────
  const handleInitialize = useCallback(() => {
    try {
      const audio = new Audio('/smoke-detector-1.mp3');
      audio.loop = true;
      audio.load();
      alarmRef.current = audio;
    } catch (e) {
      console.warn('Neural Alarm: Audio init failed', e);
    }

    setShowBoot(false);
    setAppReady(true);

    const existingStart = LS.get('war_start_date', null);
    if (!existingStart) {
      const startEpoch = Date.now();
      setWarStartDate(startEpoch);
      LS.set('war_start_date', startEpoch);
    }

    const end = Date.now() + POWER_HOUR_DURATION_MS;
    setPowerHourEnd(end);
    LS.set('power_hour_end', end);
    firePowerHourConfetti();
    playNeuralSync();
  }, []);

  // Cleanup alarm audio on unmount.
  useEffect(() => {
    return () => {
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.src = '';
      }
    };
  }, []);

  // ── EPISODE UNLOCK HELPER ───────────────────────────────────────
  const getEpisodeUnlocked = useCallback((episodeId) => {
    if (episodeId === 1) return true;
    const prevEpisode = EPISODES.find(e => e.id === episodeId - 1);
    if (!prevEpisode) return false;
    return prevEpisode.chapters.every(c => completedChapters.includes(`${c.subject}::${c.name}`));
  }, [completedChapters]);

  // ── DERIVED PROGRESS ────────────────────────────────────────────
  const progressPercent     = (completedChapters.length / TOTAL_CHAPTERS) * 100;
  const currentRank         = getRank(totalXP);
  const nextRank            = RANK_THRESHOLDS.find((r) => r.min > totalXP) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
  const rankProgressPercent = Math.min(
    100,
    ((totalXP - currentRank.min) / (Math.max(nextRank.min, currentRank.min + 1) - currentRank.min)) * 100
  );
  // ── GHOST PACING METRICS ────────────────────────────────────────
  // completedChapters.length is the live count; ghost metrics recompute
  // inside GhostPacingBar on its own 30s interval, but we pass the
  // count as a prop so any annihilation immediately re-renders it.
  const ghostMetrics = getGhostMetrics(completedChapters.length);
  
  const activeMemoryNodes  = [...revisions].sort((a, b) => a.completedAt - b.completedAt);
const availableChapters  = (SYLLABUS[formSubject] || []).filter(
    (ch) => !completedChapters.includes(`${formSubject}::${ch.name}`)
  );
  const alreadyQueuedNames = missions
    .filter((m) => m.subject === formSubject && !m.isMicro)
    .map((m) => m.name);

  const deployedMissionRefs = missions.map(m => ({ subject: m.subject, name: m.name }));

  const printGeneratedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  const printTotalPyqs  = warArchives.reduce((s, a) => s + (a.finalPyqCount    || 0), 0);
  const printTotalMins  = warArchives.reduce((s, a) => s + (a.timeSpentMinutes || 0), 0);
  const printTotalHours = (printTotalMins / 60).toFixed(1);

  const handleDownloadPDF = () => window.print();

  // ── EVENT HANDLERS ──────────────────────────────────────────────
  const handleSubjectChange = (newSubject) => {
    const first = SYLLABUS[newSubject].find((ch) => !completedChapters.includes(`${newSubject}::${ch.name}`));
    setFormSubject(newSubject);
    setFormChapter(first?.name || '');
    setFormDiff(first?.diff   || 'M');
  };

  const handleChapterChange = (chapterName) => {
    const chapter = SYLLABUS[formSubject].find((ch) => ch.name === chapterName);
    setFormChapter(chapterName);
    if (chapter) setFormDiff(chapter.diff);
  };

  const handleAddMission = () => {
    if (!formChapter) return;
    if (missions.some((m) => m.subject === formSubject && m.name === formChapter)) return;
    const newMission = {
      id: Date.now().toString(), name: formChapter, subject: formSubject,
      diff: formDiff, pyqs: Number(formPyqCount) || 0, createdAt: Date.now(),
    };
    setMissions((prev) => [newMission, ...prev]);
    const next = SYLLABUS[formSubject].find((ch) => !completedChapters.includes(`${formSubject}::${ch.name}`) && ch.name !== formChapter);
    setFormChapter(next?.name || '');
    setFormDiff(next?.diff   || 'M');
    setFormPyqCount(0);
  };

  const handleDeployFromEpisode = (ch) => {
    const alreadyQueued = missions.some(m => m.subject === ch.subject && m.name === ch.name);
    if (alreadyQueued) return;
    const syllabusEntry = SYLLABUS[ch.subject]?.find(s => s.name === ch.name);
    if (!syllabusEntry) return;
    const newMission = {
      id: Date.now().toString(), name: ch.name, subject: ch.subject,
      diff: syllabusEntry.diff, pyqs: 0, createdAt: Date.now(),
    };
    setMissions((prev) => [newMission, ...prev]);
  };

  const handleActivateOverride = useCallback((task) => {
    setMicroMissionParentId(task.id);
    setShowMicroMission(true);
  }, []);

  const handleMicroMissionComplete = useCallback(() => {
    setShowMicroMission(false);
    setMicroMissionParentId(null);
    setDailyPyqsSolved((prev) => prev + MICRO_MISSION_TARGET_PYQS);
  }, []);

  const handleMicroMissionAbort = useCallback(() => {
    setShowMicroMission(false);
    setMicroMissionParentId(null);
  }, []);

  // ── MEMORY NODE: CHECK MILESTONE ────────────────────────────────
  const handleCheckMilestone = useCallback((nodeId, milestone) => {
    const now = Date.now();
    setRevisions((prev) => {
      const node = prev.find((n) => n.id === nodeId);
      if (!node) return prev;
      if (node.milestones[milestone]) return prev;
      if (milestone === 'd3' && !node.milestones.d1) return prev;
      if (milestone === 'd7' && !node.milestones.d3) return prev;

      const newMilestones   = { ...node.milestones, [milestone]: now };
      const isFullyHardened = newMilestones.d1 && newMilestones.d3 && newMilestones.d7;

      if (isFullyHardened) {
        const archiveEntry = {
          id:               `rev_hardened_${nodeId}`,
          chapterName:      node.chapterName,
          subject:          node.subject,
          difficulty:       '—',
          finalPyqCount:    0,
          timeSpentMinutes: 0,
          xpEarned:         75,
          isRevisionNode:   true,
          completedAt:   now,
          completedDate: new Date(now).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          completedTime: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        const existingArchives = LS.get('WAR_ARCHIVES', []);
        const newArchives      = [archiveEntry, ...existingArchives];
        LS.set('WAR_ARCHIVES', newArchives);
        setTimeout(() => {
          setWarArchives(newArchives);
          setTotalXP((xp) => {
            const next = xp + 75;
            LS.set('total_xp', next);
            return next;
          });
          setXpFloatData({ xpAmount: 75, hasVelocityBonus: false, isPowerHour: false, id: Date.now() });
          fireGodModeConfetti();
          playNeuralSync();
        }, 350);
        return prev.filter((n) => n.id !== nodeId);
      }
      return prev.map((n) => (n.id === nodeId ? { ...n, milestones: newMilestones } : n));
    });
  }, []);

const fireRescueToast = useCallback(() => {
    const existing = document.getElementById('echo-rescue-toast');
    if (existing) existing.remove();
    clearTimeout(rescueToastTimerRef.current);
    const toast = document.createElement('div');
    toast.id = 'echo-rescue-toast';
    toast.className = 'echo-rescue-toast';
    toast.textContent = '⟳ Syncing with ECHO... Connection Stabilized. (+1.5× Resonance)';
    document.body.appendChild(toast);
    rescueToastTimerRef.current = setTimeout(() => toast.remove(), 3600);
  }, []);
  
  // ── ANNIHILATE MISSION ──────────────────────────────────────────
  const handleAnnihilate = (task, comboLevel, velocityMultiplier) => {
// STEP 1: Audio — only chapter_completion.mp3, acts as modal OST
playChapterCompletion();

// STEP 2: Update completed chapters state
const chapterKey = `${task.subject}::${task.name}`;
setMissions((prev) => prev.filter((m) => m.id !== task.id));
if (!task.isMicro && !completedChapters.includes(chapterKey)) {
  setCompletedChapters((prev) => [...prev, chapterKey]);
}

// STEP 3: XP calculations
const baseXP      = XP_MAP[task.diff] || 150;
const hadVelocity = comboLevel > 0;
const powerBonus  = isInPowerHour ? POWER_HOUR_MULTIPLIER : 1;
const godBonus    = systemTheme === 'god' ? 1.25 : 1;
const xpEarned    = Math.round(
  (hadVelocity ? baseXP * velocityMultiplier : baseXP) * powerBonus * godBonus
);

setTotalXP((prev) => prev + xpEarned);
setXpFloatData({ xpAmount: xpEarned, hasVelocityBonus: hadVelocity, isPowerHour: isInPowerHour, id: Date.now() });

if (!task.isMicro) {
  const statKey = SUBJECT_CONFIG[task.subject]?.stat;
  if (statKey) setRpgStats((prev) => ({ ...prev, [statKey]: (prev[statKey] || 0) + xpEarned }));

  const pyqsSolved = LS.get(`solved_${task.id}`, 0);
  if (pyqsSolved > 0) setDailyPyqsSolved((prev) => prev + pyqsSolved);

  const timeSpentSeconds = LS.get(`time_spent_${task.id}`, 0);
  const archiveEntry = {
    id: task.id, chapterName: task.name, subject: task.subject,
    difficulty: task.diff, finalPyqCount: pyqsSolved,
    timeSpentMinutes: Math.round(timeSpentSeconds / 60),
    xpEarned, hadVelocityBonus: hadVelocity, hadPowerHour: isInPowerHour,
    completedAt: Date.now(),
    completedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    completedTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
  const existing = LS.get('WAR_ARCHIVES', []);
  LS.set('WAR_ARCHIVES', [archiveEntry, ...existing]);
  setWarArchives((prev) => [archiveEntry, ...prev]);

  const nowMs = Date.now();
  setRevisions((prev) => [{
    id: `${task.id}_node`, chapterName: task.name, subject: task.subject,
    completedAt: nowMs, milestones: { d1: null, d3: null, d7: null },
  }, ...prev]);

  // STEP 4: Open MemoryFragmentModal (typewriter starts inside)
  const chapterIndex   = getChapterIndexFromKey(chapterKey, SYLLABUS_FLAT);
  if (chapterIndex !== null) {
    const narrativeEntry = getNarrativeByChapter(chapterIndex);
    if (narrativeEntry) {
      if (!lastTabHiddenRef.current) {
        consecutiveChaptersRef.current += 1;
      } else {
        consecutiveChaptersRef.current = 1;
        lastTabHiddenRef.current = false;
      }
      if (consecutiveChaptersRef.current >= 2) fireRescueToast();

      const prevSeen = LS.get('echo_fragment_seen', 0);
      if (chapterIndex > prevSeen) {
        LS.set('echo_fragment_seen', chapterIndex);
        setEchoFragmentSeen(chapterIndex);
        setEchoLatestNarrative(narrativeEntry);
      }
      // Delay so XP float renders first
      setTimeout(() => setEchoModalNarrative(narrativeEntry), 600);
    }
  }
}

// STEP 5: Timer cleanup
if (timerTaskId === task.id) {
  handleAbortTimer();
  setTimerTaskId(null);
  setModalOpen(false);
}
LS.remove(`timer_${task.id}`);
LS.remove(`solved_${task.id}`);
LS.remove(`time_spent_${task.id}`);

// STEP 6: Confetti (no audio here — already fired above)
if (systemTheme === 'god') fireGodModeConfetti();
else if (isInPowerHour) firePowerHourConfetti();
else fireConfetti(task.diff);

  // ── COMPUTED ALARM/GLITCH STATE ─────────────────────────────────
  const alarmIsActive    = storyStarted && systemIntegrity < ALARM_INTEGRITY_THRESHOLD && !timerIsRunning;
  const vignetteIsActive = alarmIsActive && systemIntegrity < VIGNETTE_INTEGRITY_THRESHOLD;
  const showAlarmBanner  = alarmIsActive && !alarmBannerDismissed;

  const glitchCSS = getGlitchStyles(systemIntegrity);

  const containerClasses = [
    'min-h-screen pb-20',
    alarmIsActive ? 'glitch-body glitch-scanlines glitch-color-shift' : '',
    vignetteIsActive ? 'vignette-overlay' : '',
  ].filter(Boolean).join(' ');

  // ── HEADER / BG STYLE ───────────────────────────────────────────
  const headerStyle = systemTheme === 'god'
    ? { background: 'rgba(20,12,0,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,215,0,0.4)' }
    : systemTheme === 'neon'
    ? { background: 'rgba(5,10,14,0.97)', backdropFilter: 'blur(12px)', borderColor: '#1a2f4a' }
    : { background: 'rgba(8,8,12,0.97)',  backdropFilter: 'blur(12px)', borderColor: '#1a1a22' };

  const bgStyle = systemTheme === 'god'
    ? 'linear-gradient(180deg, #0a0800 0%, #120f00 50%, #0a0800 100%)'
    : systemTheme === 'neon'
    ? 'linear-gradient(180deg, #020508 0%, #030810 50%, #020508 100%)'
    : 'linear-gradient(180deg, #050508 0%, #080810 50%, #050508 100%)';

  if (!bootChecked) return null;

  // ── JSX ─────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {showBoot && <BootSequence onInitialize={handleInitialize} />}
      </AnimatePresence>

<AnimatePresence>
  {showMorningIntro && appReady && (
    <MorningIntro
      onDismiss={() => setShowMorningIntro(false)}
      onAudioUnlock={() => setAudioUnlocked(true)}
    />
  )}
</AnimatePresence>

      <AnimatePresence>
        {appReady && (
         <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.6 }}
  className={[containerClasses, isBossMode ? 'boss-mode-active' : ''].filter(Boolean).join(' ')}
  style={{ background: isBossMode ? 'linear-gradient(180deg,#0a0202 0%,#120303 50%,#0a0202 100%)' : bgStyle, color: '#e0f0ff', ...bossThemeStyle }}
>
            <style>{`
              ${glitchCSS}
              ${NARRATIVE_CSS}
              ${systemTheme === 'god' ? `
                body::before {
                  content: '';
                  position: fixed;
                  inset: 0;
                  pointer-events: none;
                  z-index: 0;
                  background: radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.04), transparent 60%);
                  animation: god-pulse 4s ease-in-out infinite;
                }
                @keyframes god-pulse {
                  0%, 100% { opacity: 0.4; }
                  50% { opacity: 1; }
                }
              ` : ''}
              @media print {
                body * { visibility: hidden !important; background: none !important; }
                #archive-report, #archive-report * { visibility: visible !important; color: black !important; }
                #archive-report {
                  position: absolute !important; top: 0 !important; left: 0 !important;
                  width: 100% !important; display: block !important;
                }
                .no-print { display: none !important; }
                #archive-report { font-family: 'Courier New', Courier, monospace; padding: 32px; box-sizing: border-box; }
                .print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #222; padding-bottom: 16px; }
                .print-title  { font-size: 22px; font-weight: 900; letter-spacing: 4px; }
                .print-sub    { font-size: 11px; color: #555; margin-top: 4px; letter-spacing: 2px; }
                .print-stats  { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 12px; border: 1px solid #ccc; }
                .print-stat     { text-align: center; }
                .print-stat-val { font-size: 22px; font-weight: 900; }
                .print-stat-lbl { font-size: 9px; letter-spacing: 2px; color: #555; }
                .print-table    { width: 100%; border-collapse: collapse; font-size: 11px; }
                .print-table th { border-bottom: 2px solid #222; padding: 6px 8px; text-align: left; font-size: 9px; letter-spacing: 1px; background: #f5f5f5; }
                .print-table td { border-bottom: 1px solid #ddd; padding: 6px 8px; }
                .print-table tr:nth-child(even) td { background: #fafafa; }
                .print-footer { margin-top: 20px; font-size: 9px; color: #888; text-align: center; letter-spacing: 1px; }
                @page { margin: 1.5cm; }
              }
            `}</style>

<ResonanceSiege
  activeMission={missions[0] || null}
  completedCount={completedChapters.length}
  audioUnlocked={audioUnlocked}
  rpgStats={rpgStats}
  setRpgStats={setRpgStats}
  isBossMode={isBossMode}
/>
           <NeuralSanctum sanctum={sanctum} resonanceLevel={resonanceLevelForSanctum} />
<GhostCamOverlay />
           
            {/* Hidden print zone */}
            <div id="archive-report" style={{ display: 'none' }}>
              <div className="print-header">
                <div className="print-title">MHT-CET NEXUS — INTEL REPORT</div>
                <div className="print-sub">CLASSIFIED WAR ARCHIVES • GENERATED {printGeneratedDate}</div>
                <div className="print-sub" style={{ marginTop: 4 }}>OPERATIVE RANK: {currentRank.rank} • TOTAL XP: {totalXP.toLocaleString()} • LEVEL: {userLevel}</div>
              </div>
              <div className="print-stats">
                <div className="print-stat"><div className="print-stat-val">{warArchives.length}</div><div className="print-stat-lbl">MISSIONS COMPLETE</div></div>
                <div className="print-stat"><div className="print-stat-val">{printTotalPyqs}</div><div className="print-stat-lbl">TOTAL PYQs SOLVED</div></div>
                <div className="print-stat"><div className="print-stat-val">{printTotalHours}h</div><div className="print-stat-lbl">HOURS INVESTED</div></div>
                <div className="print-stat"><div className="print-stat-val">{totalXP.toLocaleString()}</div><div className="print-stat-lbl">XP EARNED</div></div>
              </div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>#</th><th>CHAPTER</th><th>SUBJECT</th><th>DIFFICULTY</th>
                    <th>PYQs SOLVED</th><th>TIME SPENT</th><th>XP EARNED</th><th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {warArchives.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td>{warArchives.length - idx}</td>
                      <td>{entry.chapterName}{entry.hadVelocityBonus ? ' ⚡' : ''}{entry.hadPowerHour ? ' 2×' : ''}{entry.isRevisionNode ? ' [HARDENED]' : ''}</td>
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
              <div className="print-footer">MHT-CET NEXUS • NEURAL-WARFARE: SEASON 1 • NEURO-WARFARE PROTOCOL v4.0</div>
            </div>

            {/* Floating XP */}
            <AnimatePresence>
              {xpFloatData && (
                <XPFloatAnimation
                  key={xpFloatData.id}
                  xpAmount={xpFloatData.xpAmount}
                  hasVelocityBonus={xpFloatData.hasVelocityBonus}
                  isPowerHour={xpFloatData.isPowerHour}
                  onAnimationDone={() => setXpFloatData(null)}
                  theme={systemTheme}
                />
              )}
            </AnimatePresence>

            {/* Micro-Mission Modal */}
            <AnimatePresence>
              {showMicroMission && (
                <MicroMissionModal
                  onComplete={handleMicroMissionComplete}
                  onAbort={handleMicroMissionAbort}
                />
              )}
            </AnimatePresence>

<AnimatePresence>
  {showDailyReward && (
    <DailyReward onClose={() => setShowDailyReward(false)} />
  )}
</AnimatePresence>

           {/* ── PROJECT ECHO MODAL ── */}
            <AnimatePresence>
              {echoModalNarrative && (
                <MemoryFragmentModal
  narrative={echoModalNarrative}
  audioUnlocked={audioUnlocked}
  isFinale={echoModalNarrative.chapter === 21}
  onClose={() => {
    stopCompletionAudio(2000);
    setEchoModalNarrative(null);
  }}
/>
              )}
            </AnimatePresence>
            
            {/* War Archive Modal */}
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

            {/* Timer Modal */}
            <AnimatePresence>
              {modalOpen && activeTimerTask && (
                <TimerModal
                  task={activeTimerTask} onClose={handleCloseModal}
                  timerSecondsLeft={timerSecondsLeft} timerTotalSeconds={timerTotalSeconds}
                  timerIsRunning={timerIsRunning} timerIsBreak={timerIsBreak}
                  timerCompletedSessions={timerCompletedSessions}
                  onToggleTimer={handleToggleTimer} onAbortTimer={handleAbortTimer}
                  onApplyPreset={handleApplyPreset} onApplyCustomMinutes={handleApplyCustomMinutes}
                  vigilanceMode={vigilanceMode}
                />
              )}
            </AnimatePresence>

            {/* Focus dimmer */}
            <AnimatePresence>
              {timerIsRunning && !modalOpen && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] pointer-events-none"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                />
              )}
            </AnimatePresence>

            {/* POWER HOUR BANNER */}
            <AnimatePresence>
              {isInPowerHour && <PowerHourBanner powerHourEnd={powerHourEnd} />}
            </AnimatePresence>

            {/* ══ NEURAL ALARM BANNER ══ */}
            <AnimatePresence>
              {showAlarmBanner && (
                <NeuralAlarmBanner
                  key="neural-alarm-banner"
                  integrity={systemIntegrity}
                  onDismiss={() => setAlarmBannerDismissed(true)}
                />
              )}
            </AnimatePresence>

            {/* HEADER */}
            {echoLatestNarrative && (
              <div className="echo-marquee-wrapper no-print sticky top-0 z-[51]">
                <EchoMarquee
                  latestNarrative={echoLatestNarrative}
                  systemTheme={systemTheme}
                />
              </div>
            )}
            <header className="no-print sticky top-0 z-50 border-b" style={headerStyle}>
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center relative"
                      style={{
                        background: systemTheme === 'god' ? 'rgba(255,215,0,0.1)' : 'rgba(0,245,255,0.1)',
                        border: `1px solid ${systemTheme === 'god' ? 'rgba(255,215,0,0.5)' : 'rgba(0,245,255,0.5)'}`,
                      }}>
                      {systemTheme === 'god' ? <Star size={16} color="#ffd700" /> : <Atom size={16} color="#00f5ff" />}
                    </div>
                    <div>
                      <div className="font-mono text-sm font-black tracking-widest"
                        style={{ color: systemTheme === 'god' ? '#ffd700' : '#00f5ff', textShadow: systemTheme === 'god' ? '0 0 10px #ffd700' : '0 0 10px #00f5ff' }}>
                        MHT-CET NEXUS
                      </div>
                      <div className="font-mono text-gray-600 tracking-widest" style={{ fontSize: 9 }}>
                        NEURAL-WARFARE: SEASON 1
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <SystemIntegrityBar integrity={systemIntegrity} />
                    <GachaStatusIcon key={gachaRefresh} />
                    
{/* ── PWA INSTALL BUTTON — only shows before install ── */}
                  {installPrompt && !isAppInstalled && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleInstallClick}
                      animate={{
                        boxShadow: [
                          '0 0 8px rgba(0,245,255,0.3)',
                          '0 0 20px rgba(0,245,255,0.7)',
                          '0 0 8px rgba(0,245,255,0.3)',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider"
                      style={{
                        background: 'rgba(0,245,255,0.12)',
                        border: '1px solid rgba(0,245,255,0.6)',
                        color: '#00f5ff',
                        fontSize: 10,
                      }}
                    >
                      <Download size={11} />
                      <span className="hidden sm:inline">INSTALL APP</span>
                    </motion.button>
                  )}
                    
                    {timerTaskId && (
                      <motion.button
                        animate={timerIsRunning ? { boxShadow: ['0 0 6px #00ff41', '0 0 18px #00ff41', '0 0 6px #00ff41'] } : {}}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        onClick={() => activeTimerTask ? setModalOpen(true) : null}
                        className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs font-black"
                        style={{
                          background: timerIsRunning ? 'rgba(0,255,65,0.12)' : 'rgba(30,30,30,0.4)',
                          border: `1px solid ${timerIsRunning ? '#00ff41' : '#2a3040'}`,
                          color: timerIsRunning ? '#00ff41' : '#4a6080'
                        }}
                      >
                        <Clock size={11} />
                        {String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0')}:{String(timerSecondsLeft % 60).padStart(2, '0')}
                        {timerIsRunning && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41' }} />}
                      </motion.button>
                    )}

                    {isInPowerHour && (
                      <motion.div
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="flex items-center gap-1 px-2 py-1.5 font-mono text-xs font-black"
                        style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.5)', color: '#ffd700' }}
                      >
                        <Zap size={10} /> 2× POWER
                      </motion.div>
                    )}

                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setShowArchiveModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider transition-all"
                      style={{ background: warArchives.length > 0 ? 'rgba(255,165,0,0.1)' : 'rgba(30,30,30,0.4)', border: `1px solid ${warArchives.length > 0 ? 'rgba(255,165,0,0.5)' : '#2a3040'}`, color: warArchives.length > 0 ? '#ffa500' : '#3a4a5a', fontSize: 10 }}
                    >
                      <FolderOpen size={11} />
                      <span className="hidden sm:inline">WAR ARCHIVES</span>
                      {warArchives.length > 0 && <span style={{ background: 'rgba(255,165,0,0.2)', color: '#ffa500', fontSize: 9, padding: '0 4px' }}>{warArchives.length}</span>}
                    </motion.button>

                    <button onClick={() => setVigilanceMode((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 font-mono font-black tracking-wider transition-all"
                      style={{ background: vigilanceMode ? 'rgba(0,255,65,0.12)' : 'rgba(30,30,30,0.5)', border: `1px solid ${vigilanceMode ? '#00ff41' : '#2a3f2a'}`, color: vigilanceMode ? '#00ff41' : '#3a5a3a', fontSize: 10 }}
                    >
                      {vigilanceMode ? <Eye size={11} /> : <EyeOff size={11} />} <span className="hidden sm:inline">VIGILANCE</span>
                    </button>

                    <div className="text-right hidden sm:block">
                      <div className="font-mono tracking-widest text-gray-500" style={{ fontSize: 10 }}>LVL {userLevel} RANK</div>
                      <div className="font-mono text-sm font-black" style={{ color: systemTheme === 'god' ? '#ffd700' : '#ff00ff', textShadow: systemTheme === 'god' ? '0 0 8px #ffd700' : '0 0 8px #ff00ff' }}>{currentRank.rank}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tracking-widest text-gray-500" style={{ fontSize: 10 }}>TOTAL XP</div>
                      <div className="font-mono text-sm font-black" style={{ color: '#00ff41', textShadow: '0 0 8px #00ff41' }}>{totalXP.toLocaleString()}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="font-mono text-gray-600 mb-1" style={{ fontSize: 9 }}>{completedChapters.length}/{TOTAL_CHAPTERS}</div>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2f4a' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: systemTheme === 'god' ? '#ffd700' : '#00ff41', boxShadow: systemTheme === 'god' ? '0 0 6px #ffd700' : '0 0 6px #00ff41' }}
                          animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrity warning in header when alarm active */}
                {alarmIsActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 px-3 py-1.5 flex items-center gap-2"
                    style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)' }}
                  >
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                      <AlertTriangle size={12} color="#ff4444" />
                    </motion.div>
                    <span className="font-mono text-red-400" style={{ fontSize: 9 }}>
                      ⚠ SYSTEM INTEGRITY {Math.round(systemIntegrity)}% — NEURAL DECAY ACTIVE — START A POMODORO TO RESTORE (+{INTEGRITY_RESTORE_AMOUNT}%)
                    </span>
                  </motion.div>
                )}
              </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

              {/* CYBER AVATAR CARD */}
              <AvatarStatsCard stats={rpgStats} totalXP={totalXP} theme={systemTheme} />

              {/* ENTERTAINMENT CLEARANCE */}
              <EntertainmentClearance
                dailyPyqsSolved={dailyPyqsSolved}
                onRedeem={(mins) => {}}
              />

              {/* NEURAL DESTINY RIFT */}
<NeuralDestinyGacha onPull={() => setGachaRefresh(r => r + 1)} />

              {/* SECTION 1: MISSION BUILDER */}
              <section style={{ opacity: timerIsRunning ? 0.5 : 1, transition: 'opacity 0.4s', pointerEvents: timerIsRunning ? 'none' : 'auto' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${systemTheme === 'god' ? '#ffd700' : '#00f5ff'}, transparent)` }} />
                  <span className="font-mono text-xs tracking-widest" style={{ color: systemTheme === 'god' ? '#ffd700' : '#00f5ff', textShadow: systemTheme === 'god' ? '0 0 8px #ffd700' : '0 0 8px #00f5ff' }}>◈ TODAY&apos;S MISSION BUILDER</span>
                  <div className="h-px flex-1" style={{ background: `linear-gradient(270deg, ${systemTheme === 'god' ? '#ffd700' : '#00f5ff'}, transparent)` }} />
                </div>

                <div className="p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0a1628, #060d1a)', border: '1px solid rgba(0,245,255,0.2)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-1">
                      <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>TARGET SUBJECT</label>
                      <div className="relative">
                        <select value={formSubject} onChange={(e) => handleSubjectChange(e.target.value)}
                          className="w-full px-3 py-2 font-mono text-sm focus:outline-none appearance-none pr-8"
                          style={{ background: 'rgba(0,245,255,0.06)', border: `1px solid ${SUBJECT_CONFIG[formSubject]?.color || '#00f5ff'}60`, color: SUBJECT_CONFIG[formSubject]?.color || '#00f5ff' }}
                        >
                          {Object.keys(SYLLABUS).map((subj) => (
                            <option key={subj} value={subj} style={{ background: '#060d1a', color: '#e0f0ff' }}>{subj}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: SUBJECT_CONFIG[formSubject]?.color || '#00f5ff' }} />
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>
                        TARGET CHAPTER <span className="text-gray-700">({availableChapters.length} remaining)</span>
                      </label>
                      <div className="relative">
                        {availableChapters.length === 0 ? (
                          <div className="w-full px-3 py-2 font-mono text-xs" style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.2)', color: '#00ff41' }}>✓ ALL CHAPTERS ANNIHILATED</div>
                        ) : (
                          <>
                            <select value={formChapter} onChange={(e) => handleChapterChange(e.target.value)}
                              className="w-full px-3 py-2 font-mono text-sm focus:outline-none appearance-none pr-8"
                              style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.25)', color: '#e0f0ff' }}
                            >
                              {availableChapters.map((ch) => {
                                const queued = alreadyQueuedNames.includes(ch.name);
                                return (
                                  <option key={ch.name} value={ch.name} style={{ background: '#060d1a', color: queued ? '#4a6080' : '#e0f0ff' }}>
                                    {queued ? `⟳ ${ch.name} (queued)` : ch.name}
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>
                        DIFFICULTY {formChapter && <span className="text-gray-700">(auto)</span>}
                      </label>
                      <div className="flex gap-1.5">
                        {['E', 'M', 'H'].map((dk) => {
                          const dc  = DIFF_CONFIG[dk];
                          const sel = formDiff === dk;
                          return (
                            <button key={dk} onClick={() => setFormDiff(dk)}
                              className="flex-1 py-2 font-mono text-xs font-black transition-all"
                              style={{ background: sel ? `${dc.color}20` : 'rgba(0,0,0,0.3)', border: `1px solid ${sel ? dc.color : '#1a2f4a'}`, color: sel ? dc.color : '#4a6080' }}>
                              {dk}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-gray-500 block mb-1 tracking-wider" style={{ fontSize: 10 }}>TARGET PYQs</label>
                      <div className="flex gap-2">
                        <input type="number" value={formPyqCount} onChange={(e) => setFormPyqCount(e.target.value)} min="0"
                          className="w-16 px-2 py-2 font-mono text-sm text-center focus:outline-none"
                          style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', color: '#e0f0ff' }}
                        />
                        <button onClick={handleAddMission} disabled={!formChapter}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 font-mono text-xs font-black tracking-wider transition-all"
                          style={{ background: formChapter ? 'rgba(0,245,255,0.15)' : 'rgba(20,30,40,0.4)', border: `1px solid ${formChapter ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.1)'}`, color: formChapter ? '#00f5ff' : '#2a4a5a', cursor: formChapter ? 'pointer' : 'not-allowed' }}
                        >
                          <Plus size={14} /> DEPLOY
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {missions.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 border border-dashed" style={{ borderColor: '#1a2f4a' }}>
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
                          onOpenTimer={handleOpenTimer}
                          onDelete={handleDeleteMission}
                          isActiveTimer={timerTaskId === task.id}
                          timerIsRunning={timerIsRunning}
                          onActivateOverride={handleActivateOverride}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </section>
              
             {/* SECTION 2: GLOBAL PROGRESS + RANK */}
              <section style={{ opacity: timerIsRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00ff41, transparent)' }} />
                  <span className="font-mono text-xs tracking-widest" style={{ color: '#00ff41', textShadow: '0 0 8px #00ff41' }}>◈ NEXUS CORE — GLOBAL PROGRESS</span>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00ff41, transparent)' }} />
                </div>

                <div className="p-6 mb-4" style={{ background: 'linear-gradient(135deg, #061a0f, #050a0e)', border: '1px solid rgba(0,255,65,0.25)' }}>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { val: completedChapters.length,                  label: 'ELIMINATED',  color: '#00ff41' },
                      { val: TOTAL_CHAPTERS - completedChapters.length, label: 'REMAINING',   color: '#ffffff' },
                      { val: `${Math.round(progressPercent)}%`,         label: 'ANNIHILATED', color: '#00f5ff' },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <div className="font-mono text-3xl font-black" style={{ color: s.color, textShadow: `0 0 8px ${s.color}` }}>{s.val}</div>
                        <div className="font-mono text-gray-500 tracking-widest" style={{ fontSize: 10 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-gray-500 tracking-widest" style={{ fontSize: 10 }}>SYLLABUS DOMINATION</span>
                      <span className="font-mono text-xs" style={{ color: '#00ff41' }}>{completedChapters.length} / {TOTAL_CHAPTERS}</span>
                    </div>
                    <div className="relative h-8 overflow-hidden" style={{ background: '#050f08', border: '1px solid rgba(0,255,65,0.2)' }}>
                      <motion.div className="absolute left-0 top-0 h-full"
                        style={{ background: systemTheme === 'god' ? 'linear-gradient(90deg, #ffd700, #ffa500)' : 'linear-gradient(90deg, #00ff41, #00f5ff)', boxShadow: systemTheme === 'god' ? '0 0 15px rgba(255,215,0,0.8)' : '0 0 15px rgba(0,255,65,0.8)' }}
                        animate={{ width: `${progressPercent}%` }} transition={{ duration: 1 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-xs font-black text-white" style={{ mixBlendMode: 'difference' }}>{Math.round(progressPercent)}% DOMINANCE</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t" style={{ borderColor: '#1a2f4a' }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Award size={14} color={systemTheme === 'god' ? '#ffd700' : '#ff00ff'} />
                        <span className="font-mono text-xs font-black" style={{ color: systemTheme === 'god' ? '#ffd700' : '#ff00ff', textShadow: systemTheme === 'god' ? '0 0 8px #ffd700' : '0 0 8px #ff00ff' }}>{currentRank.rank}</span>
                      </div>
                      <span className="font-mono text-xs text-gray-500">{totalXP} / {nextRank.min} XP → {nextRank.rank}</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#0a0810', border: '1px solid rgba(255,0,255,0.2)' }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: systemTheme === 'god' ? 'linear-gradient(90deg, #ffd700, #ffa500)' : 'linear-gradient(90deg, #ff00ff, #ff69b4)', boxShadow: systemTheme === 'god' ? '0 0 10px rgba(255,215,0,0.8)' : '0 0 10px rgba(255,0,255,0.8)' }}
                        animate={{ width: `${rankProgressPercent}%` }} transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </div>

                {/* ══ GHOST PACING BAR ══ */}
                <GhostPacingBar
                  completedCount={completedChapters.length}
                  systemTheme={systemTheme}
                />
              </section>

              {/* SECTION 2.5: MEMORY HACK NODES */}
              {activeMemoryNodes.length > 0 && (
                <section style={{ opacity: timerIsRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ffff00, transparent)' }} />
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="font-mono text-xs tracking-widest"
                        style={{ color: '#ffff00', textShadow: '0 0 8px #ffff00' }}
                      >◈ MEMORY HACK NODES</motion.span>
                      <span className="font-mono px-2 py-0.5"
                        style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700', fontSize: 9 }}>
                        {activeMemoryNodes.length}
                      </span>
                    </div>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ffff00, transparent)' }} />
                  </div>

                  <div className="flex items-center gap-4 mb-3 px-1 flex-wrap">
                    {[
                      { color: '#00f5ff', label: 'UNLOCKED' },
                      { color: '#ffd700', label: 'DUE TODAY' },
                      { color: '#ff6644', label: 'OVERDUE'   },
                      { color: '#00ff41', label: 'DONE'      },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
                        <span className="font-mono" style={{ color: 'rgba(120,140,160,0.7)', fontSize: 8, letterSpacing: '0.1em' }}>{label}</span>
                      </div>
                    ))}
                    <span className="font-mono ml-auto" style={{ color: 'rgba(80,100,120,0.6)', fontSize: 8 }}>
                      7-DAY = AUTO-ARCHIVES (+75 XP)
                    </span>
                  </div>

                  <AnimatePresence mode="popLayout">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {activeMemoryNodes.map((node) => (
                        <MemoryNode key={node.id} node={node} onCheck={handleCheckMilestone} />
                      ))}
                    </div>
                  </AnimatePresence>
                </section>
              )}

              {/* SECTION 3: EPISODE ROADMAP */}
              <section style={{ opacity: timerIsRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #ff00ff, transparent)' }} />
                  <span className="font-mono text-xs tracking-widest" style={{ color: '#ff00ff', textShadow: '0 0 8px #ff00ff' }}>◈ SEASON 1 — EPISODE ROADMAP</span>
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #ff00ff, transparent)' }} />
                </div>

                <div className="mb-3 px-1">
                  <div className="font-mono text-gray-600" style={{ fontSize: 10 }}>
                    Complete each episode to unlock the next. Add chapters directly from here or use the Mission Builder above.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {EPISODES.map((episode) => {
                    const isLocked = !getEpisodeUnlocked(episode.id);
                    return (
                     <EpisodeCardV2
  key={episode.id}
  episode={episode}
  isLocked={isLocked}
  completedChapters={completedChapters}
  onDeployChapter={handleDeployFromEpisode}
  deployedNames={deployedMissionRefs}
/>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {Object.entries(SUBJECT_CONFIG).map(([subject, sc]) => {
                    const total     = SYLLABUS[subject].length;
                    const completed = SYLLABUS[subject].filter(ch => completedChapters.includes(`${subject}::${ch.name}`)).length;
                    const pct       = (completed / total) * 100;
                    const SubIcon   = sc.icon;
                    return (
                      <div key={subject} className="p-3 flex items-center gap-3"
                        style={{ background: 'rgba(10,16,26,0.8)', border: `1px solid ${sc.color}20` }}>
                        <SubIcon size={16} style={{ color: sc.color, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-xs font-black" style={{ color: sc.color }}>{sc.label}</span>
                            <span className="font-mono" style={{ color: sc.color, fontSize: 9 }}>{completed}/{total}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#0a1020' }}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: sc.color, boxShadow: `0 0 4px ${sc.color}` }}
                              animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

{/* NEURAL SANCTUM: BREAK + STASIS */}
<BreakStasisPanel sanctum={sanctum} />

{/* SHARED VISION DECRYPTION */}
<MemoryCanvas decryptionPct={sanctum.decryptionPct} />

{/* ECHO DAILY LOG */}
<section style={{ opacity: timerIsRunning ? 0.45 : 1, transition: 'opacity 0.4s' }}>
  <div className="flex items-center gap-3 mb-4">
    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #00f5ff, transparent)' }} />
    <span className="font-mono text-xs tracking-widest"
      style={{ color: '#00f5ff', textShadow: '0 0 8px #00f5ff' }}>
      ◈ ECHO DAILY LOG — EOD DEBRIEF
    </span>
    <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #00f5ff, transparent)' }} />
  </div>
  <EchoDailyLog
    warArchives={warArchives}
    completedChapters={completedChapters}
    sanctumState={sanctum.sanctumState}
    pingCount={ghostPingCount}
  />
</section>
              
              {/* SECTION 4: TEMPORAL WAR-MAP */}
              <TemporalWarMap
                warStartDate={warStartDate}
                warArchives={warArchives}
                totalChapters={TOTAL_CHAPTERS}
                completedCount={completedChapters.length}
                systemTheme={systemTheme}
              />

              {/* FOOTER */}
              <footer className="text-center py-6">
                <div className="font-mono tracking-widest" style={{ color: systemTheme === 'god' ? 'rgba(255,215,0,0.2)' : '#1a2f4a', fontSize: 10 }}>
                  MHT-CET NEXUS • NEURAL-WARFARE: SEASON 1 • {TOTAL_CHAPTERS} CHAPTERS • 7 EPISODES
                </div>
                <div className="font-mono mt-1" style={{ color: '#111c2a', fontSize: 9 }}>
                  PERSISTENCE: localStorage • THEME: {systemTheme.toUpperCase()} • LEVEL: {userLevel} • SYS INTEGRITY: {Math.round(systemIntegrity)}% • DAILY PYQs: {dailyPyqsSolved}
                </div>
                <div className="font-mono mt-0.5" style={{ color: '#0d1520', fontSize: 9 }}>
                  WAR START: {new Date(warStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} • 8-DAY CAMPAIGN WINDOW
                </div>
                <div className="font-mono mt-0.5" style={{ color: '#0a1018', fontSize: 9 }}>
                  DECAY: {INTEGRITY_DECAY_PER_HOUR}%/hr passive • TAB-AWAY: immediate slash • ALARM: {alarmIsActive ? `ACTIVE (${Math.round(systemIntegrity)}%)` : 'NOMINAL'} • THRESHOLD: {ALARM_INTEGRITY_THRESHOLD}%
                </div>
              </footer>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
