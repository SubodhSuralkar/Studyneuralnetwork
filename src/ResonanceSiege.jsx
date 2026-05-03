/**
 * ═══════════════════════════════════════════════════════════════════
 * RESONANCE SIEGE — THE 4-PILLAR FOCUS SYSTEM
 * Drop this file alongside App.jsx and import it in.
 * ═══════════════════════════════════════════════════════════════════
 *
 * USAGE in App.jsx:
 *
 *   import ResonanceSiege, { useBossModeTheme } from './ResonanceSiege';
 *
 *   // Inside App(), near other state:
 *   const { isBossMode, bossThemeStyle } = useBossModeTheme(completedChapters.length);
 *
 *   // Inside JSX, just before </> closing fragment or as first child of motion.div:
 *   <ResonanceSiege
 *     activeMission={missions[0] || null}
 *     completedCount={completedChapters.length}
 *     audioUnlocked={audioUnlocked}
 *     rpgStats={rpgStats}
 *     setRpgStats={setRpgStats}
 *     isBossMode={isBossMode}
 *   />
 *
 *   // Wrap the main motion.div style with bossThemeStyle spread:
 *   style={{ background: bgStyle, color: '#e0f0ff', ...bossThemeStyle }}
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Shield, Brain, Sword, X } from 'lucide-react';

// ── CONSTANTS ────────────────────────────────────────────────────────
const RESONANCE_GAIN_INTERVAL_MS   = 30_000;   // gain 1% every 30s while visible
const RESONANCE_GAIN_AMOUNT        = 1;         // % per tick
const RESONANCE_DECAY_BLUR_AMOUNT  = 3;         // % lost on blur (tab switch)
const RESONANCE_PASSIVE_DECAY_MS   = 90_000;    // stagnation decay every 90s
const RESONANCE_PASSIVE_DECAY_AMT  = 1;         // % lost from stagnation
const CLIFFHANGER_INTERVAL_MS      = 45 * 60_000; // 45 minutes
const BOSS_CHAPTER_THRESHOLD       = 3;         // 3rd chapter triggers boss mode

const TICKER_MESSAGES = [
  'Analyzing Thermodynamics data streams...',
  'Ghost activity detected in YouTube.com nodes...',
  'Neural Link stabilizing... resonance nominal...',
  'Enemy signal detected in syllabus sector 7...',
  'Counter-intelligence protocol active...',
  'Ghost is recalculating trajectory — maintain pace...',
  'Electrochemical matrix online. Proceed with caution...',
  'Deep scan: consciousness at 98% operational capacity...',
  'Warning: Distraction nodes breached outer perimeter...',
  'Deploying cognitive firewall against entropy cascade...',
  'Synchronization confirmed. Chapter data locked in...',
  'Ghost trace: falling behind by 0.4 sectors...',
  'Momentum multiplier activated — maintain velocity...',
  'PYQ archive cross-referenced. Pattern match: 87%...',
  'Calculus subroutine overloaded. Recalibrating...',
  'Hostile interference detected: Instagram.com proxy...',
  'Integrity at nominal. Continue siege protocol...',
  'Neural bandwidth at peak. Exploit this window NOW...',
  'Ghost has entered panic mode. You are ahead...',
  'Resonance frequency locked. Siege continues...',
];

// Cliffhanger events — pairs of choices affecting different stats
const CLIFFHANGER_EVENTS = [
  {
    id: 'ghost_override',
    title: 'GHOST CORE OVERRIDE DETECTED',
    flavor: 'The Ghost is attempting to hijack your momentum vector. Decision window: 30 seconds.',
    choices: [
      {
        id: 'reroute',
        label: 'REROUTE POWER',
        icon: 'shield',
        effect: 'Rerouted 200 cycles to defensive matrix. Ghost frozen for 10 minutes.',
        stat: 'dexterity',
        statDelta: 120,
        buff: { name: 'GHOST FREEZE', durationMs: 10 * 60_000, color: '#00f5ff' },
      },
      {
        id: 'counter_hack',
        label: 'INITIATE COUNTER-HACK',
        icon: 'brain',
        effect: 'Counter-hack deployed. Intelligence core expanded by 200 cycles.',
        stat: 'intelligence',
        statDelta: 200,
        buff: { name: 'OVERCLOCK', durationMs: 8 * 60_000, color: '#ff00ff' },
      },
    ],
  },
  {
    id: 'entropy_cascade',
    title: 'ENTROPY CASCADE INCOMING',
    flavor: 'Syllabus entropy is destabilizing your sector. Choose your countermeasure.',
    choices: [
      {
        id: 'reinforce',
        label: 'REINFORCE STRUCTURE',
        icon: 'shield',
        effect: 'Structure reinforced. Strength core amplified. Entropy contained.',
        stat: 'strength',
        statDelta: 180,
        buff: { name: 'IRON CORE', durationMs: 12 * 60_000, color: '#ff6b00' },
      },
      {
        id: 'absorb',
        label: 'ABSORB ENTROPY',
        icon: 'brain',
        effect: 'Entropy absorbed into the intelligence matrix. +200 INT cycles.',
        stat: 'intelligence',
        statDelta: 200,
        buff: { name: 'ENTROPY SURGE', durationMs: 6 * 60_000, color: '#7fff00' },
      },
    ],
  },
  {
    id: 'signal_fork',
    title: 'NEURAL SIGNAL FORK',
    flavor: 'Your focus signal has split into two viable pathways. Choose one to amplify.',
    choices: [
      {
        id: 'precision',
        label: 'PRECISION PATH',
        icon: 'sword',
        effect: 'Precision amplifier online. Dexterity core surged by 150 cycles.',
        stat: 'dexterity',
        statDelta: 150,
        buff: { name: 'PRECISION MODE', durationMs: 15 * 60_000, color: '#ffd700' },
      },
      {
        id: 'brute',
        label: 'BRUTE FORCE PATH',
        icon: 'sword',
        effect: 'Brute force engaged. Strength matrix overcharged by 220 cycles.',
        stat: 'strength',
        statDelta: 220,
        buff: { name: 'BRUTE SURGE', durationMs: 5 * 60_000, color: '#ff2222' },
      },
    ],
  },
];

// ── LS HELPER (local, doesn't depend on App.jsx's LS) ────────────────
const LS = {
  get: (k, d) => { try { const r = localStorage.getItem(k); return r !== null ? JSON.parse(r) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── PILLAR 4 HOOK — Boss Mode ────────────────────────────────────────
export function useBossModeTheme(completedCount) {
  const [isBossMode, setIsBossMode] = useState(false);
  const prevCountRef = useRef(completedCount);

  useEffect(() => {
    // Activate on 3rd chapter completion (count goes from 2→3)
    if (completedCount >= BOSS_CHAPTER_THRESHOLD && !isBossMode) {
      // Check if it was just crossed
      if (prevCountRef.current < BOSS_CHAPTER_THRESHOLD) {
        setIsBossMode(true);
        LS.set('boss_mode_active', true);
      } else {
        // Already past threshold — restore from storage
        setIsBossMode(LS.get('boss_mode_active', false));
      }
    }
    // Reset if somehow below threshold (e.g., dev testing)
    if (completedCount < BOSS_CHAPTER_THRESHOLD) {
      setIsBossMode(false);
      LS.set('boss_mode_active', false);
    }
    prevCountRef.current = completedCount;
  }, [completedCount]);

  const bossThemeStyle = isBossMode ? {
    '--boss-red': '#cc1a1a',
    '--boss-charcoal': '#1a0808',
  } : {};

  return { isBossMode, bossThemeStyle, setIsBossMode };
}

// ── PILLAR 2 HOOK — Resonance Engine ─────────────────────────────────
function useResonanceEngine(audioUnlocked, isBossMode) {
  const [resonanceLevel, setResonanceLevel] = useState(() => LS.get('resonanceLevel', 0));
  const [activeBuffs, setActiveBuffs]       = useState([]);
  const [isVisible, setIsVisible]           = useState(!document.hidden);

  // Gain tick
  const gainRef = useRef(null);
  // Stagnation decay tick
  const decayRef = useRef(null);
  // Cliffhanger tracking
  const lastCliffhangerRef = useRef(LS.get('last_cliffhanger_epoch', Date.now()));
  const [pendingCliffhanger, setPendingCliffhanger] = useState(null);

  // Audio refs
  const ambientAudioRef = useRef(null);
  const bossAudioRef    = useRef(null);
  const prevResonanceForAudioRef = useRef(resonanceLevel);

  const addBuff = useCallback((buff) => {
    const buffWithId = { ...buff, id: Date.now(), expiresAt: Date.now() + buff.durationMs };
    setActiveBuffs(prev => [...prev.filter(b => b.name !== buff.name), buffWithId]);
  }, []);

  // Visibility tracking
  useEffect(() => {
    const onVisible = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Blur = decay (tab switch penalty)
  useEffect(() => {
    const onBlur = () => {
      setResonanceLevel(prev => {
        const next = Math.max(0, prev - RESONANCE_DECAY_BLUR_AMOUNT);
        LS.set('resonanceLevel', next);
        return next;
      });
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Gain tick — runs when tab is visible
  useEffect(() => {
    if (gainRef.current) clearInterval(gainRef.current);
    if (!isVisible) return;

    gainRef.current = setInterval(() => {
      setResonanceLevel(prev => {
        const next = Math.min(100, prev + RESONANCE_GAIN_AMOUNT);
        LS.set('resonanceLevel', next);

        // Check cliffhanger trigger
        const now = Date.now();
        if (now - lastCliffhangerRef.current >= CLIFFHANGER_INTERVAL_MS) {
          lastCliffhangerRef.current = now;
          LS.set('last_cliffhanger_epoch', now);
          // Pick a random event
          const event = CLIFFHANGER_EVENTS[Math.floor(Math.random() * CLIFFHANGER_EVENTS.length)];
          setPendingCliffhanger(event);
        }

        return next;
      });
    }, RESONANCE_GAIN_INTERVAL_MS);

    return () => clearInterval(gainRef.current);
  }, [isVisible]);

  // Stagnation passive decay
  useEffect(() => {
    decayRef.current = setInterval(() => {
      setResonanceLevel(prev => {
        if (prev <= 0) return prev;
        const next = Math.max(0, prev - RESONANCE_PASSIVE_DECAY_AMT);
        LS.set('resonanceLevel', next);
        return next;
      });
    }, RESONANCE_PASSIVE_DECAY_MS);
    return () => clearInterval(decayRef.current);
  }, []);

  // Buff expiry sweep
  useEffect(() => {
    const id = setInterval(() => {
      setActiveBuffs(prev => prev.filter(b => Date.now() < b.expiresAt));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  // PILLAR 4 — Audio management
  useEffect(() => {
    if (!audioUnlocked || !isBossMode) return;

    const prevLevel = prevResonanceForAudioRef.current;
    const curLevel  = resonanceLevel;
    prevResonanceForAudioRef.current = curLevel;

    const crossAt90 = prevLevel < 90 && curLevel >= 90;
    const dropBelow90 = prevLevel >= 90 && curLevel < 90;

    if (crossAt90) {
      // Crossfade: fade out ambient, start boss theme
      if (ambientAudioRef.current) {
        const fade = setInterval(() => {
          if (!ambientAudioRef.current) { clearInterval(fade); return; }
          ambientAudioRef.current.volume = Math.max(0, ambientAudioRef.current.volume - 0.04);
          if (ambientAudioRef.current.volume <= 0) {
            ambientAudioRef.current.pause();
            clearInterval(fade);
          }
        }, 100);
      }
      if (!bossAudioRef.current) {
        try {
          bossAudioRef.current = new Audio('/boss-theme.mp3');
          bossAudioRef.current.loop = true;
          bossAudioRef.current.volume = 0;
          bossAudioRef.current.play().catch(() => {});
          const fadeIn = setInterval(() => {
            if (!bossAudioRef.current) { clearInterval(fadeIn); return; }
            bossAudioRef.current.volume = Math.min(0.65, bossAudioRef.current.volume + 0.04);
            if (bossAudioRef.current.volume >= 0.65) clearInterval(fadeIn);
          }, 100);
        } catch {}
      }
    }

    if (dropBelow90) {
      // Crossfade back
      if (bossAudioRef.current) {
        const fade = setInterval(() => {
          if (!bossAudioRef.current) { clearInterval(fade); return; }
          bossAudioRef.current.volume = Math.max(0, bossAudioRef.current.volume - 0.04);
          if (bossAudioRef.current.volume <= 0) {
            bossAudioRef.current.pause();
            bossAudioRef.current = null;
            clearInterval(fade);
          }
        }, 100);
      }
    }
  }, [resonanceLevel, audioUnlocked, isBossMode]);

  // Start ambient when boss mode activates
  useEffect(() => {
    if (!audioUnlocked || !isBossMode) return;
    if (resonanceLevel >= 90) return; // boss theme takes over
    try {
      if (!ambientAudioRef.current) {
        ambientAudioRef.current = new Audio('/focus-ambient.mp3');
        ambientAudioRef.current.loop = true;
        ambientAudioRef.current.volume = 0.20;
        ambientAudioRef.current.play().catch(() => {});
      }
    } catch {}
    return () => {
      if (ambientAudioRef.current) { ambientAudioRef.current.pause(); ambientAudioRef.current = null; }
      if (bossAudioRef.current)    { bossAudioRef.current.pause();    bossAudioRef.current    = null; }
    };
  }, [isBossMode, audioUnlocked]);

  const applyManualDecay = useCallback((amount = 10) => {
    setResonanceLevel(prev => {
      const next = Math.max(0, prev - amount);
      LS.set('resonanceLevel', next);
      return next;
    });
  }, []);

  return {
    resonanceLevel,
    activeBuffs,
    pendingCliffhanger,
    setPendingCliffhanger,
    addBuff,
    applyManualDecay,
  };
}

// ── PILLAR 1 — Resonance Gauge (vertical bar, fixed left) ─────────────
function ResonanceGauge({ level, isBossMode, activeBuffs }) {
  const color = isBossMode
    ? (level >= 90 ? '#ff2222' : '#cc4444')
    : (level >= 90 ? '#00ff41' : level >= 50 ? '#00f5ff' : '#ff6b00');

  const glow = `0 0 12px ${color}, 0 0 28px ${color}60`;

  return (
    <div
      className="resonance-gauge-container"
      style={{
        position: 'fixed',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9888,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 6px',
        background: 'rgba(4,8,14,0.92)',
        borderRight: `1px solid ${color}40`,
        boxShadow: `2px 0 20px ${color}15`,
      }}
    >
      {/* Label top */}
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 7,
        color: color,
        letterSpacing: '0.2em',
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        textShadow: `0 0 8px ${color}`,
        marginBottom: 4,
      }}>RESONANCE</div>

      {/* Percentage display */}
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 10,
        color: color,
        textShadow: glow,
        fontWeight: 900,
      }}>{Math.round(level)}%</div>

      {/* The bar track */}
      <div style={{
        width: 14,
        height: 220,
        background: 'rgba(10,20,30,0.8)',
        border: `1px solid ${color}30`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Filled portion — grows from bottom */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: isBossMode
              ? `linear-gradient(0deg, #8b0000, ${color})`
              : `linear-gradient(0deg, #001a0a, ${color})`,
            boxShadow: `0 0 8px ${color}`,
          }}
          animate={{ height: `${level}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Scanning line — sweeps up/down over filled portion */}
        {level > 5 && (
          <motion.div
            className="resonance-scan-line"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              boxShadow: `0 0 6px ${color}`,
              bottom: `${level}%`,
            }}
            animate={{
              bottom: [`${Math.max(0, level - 2)}%`, `2%`, `${Math.max(0, level - 2)}%`],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />
        )}

        {/* Tick marks */}
        {[25, 50, 75, 90].map(tick => (
          <div key={tick} style={{
            position: 'absolute',
            bottom: `${tick}%`,
            left: 0,
            right: 0,
            height: 1,
            background: tick === 90 ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)',
          }} />
        ))}

        {/* 90% warning marker */}
        <div style={{
          position: 'absolute',
          bottom: '90%',
          left: -2,
          fontFamily: 'monospace',
          fontSize: 5,
          color: '#ffd700',
          transform: 'translateY(50%)',
          whiteSpace: 'nowrap',
        }}>90</div>
      </div>

      {/* Active buffs indicators */}
      {activeBuffs.map(buff => (
        <motion.div
          key={buff.id}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: buff.color,
            boxShadow: `0 0 6px ${buff.color}`,
          }}
          title={buff.name}
        />
      ))}

      {/* Label bottom */}
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 7,
        color: isBossMode ? '#cc4444' : '#1a3a4a',
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        letterSpacing: '0.15em',
        marginTop: 4,
      }}>SIEGE</div>
    </div>
  );
}

// ── PILLAR 1 — Sector Display (top header) ───────────────────────────
function SectorDisplay({ chapterName, isBossMode, resonanceLevel }) {
  const color = isBossMode ? '#ff4444' : '#00f5ff';
  const displayName = chapterName || 'NO ACTIVE MISSION';

  return (
    <div
      className="sector-display no-print"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9887,
        textAlign: 'center',
        pointerEvents: 'none',
        padding: '4px 20px 6px',
        background: isBossMode
          ? 'linear-gradient(180deg, rgba(26,8,8,0.97), rgba(10,3,3,0.9))'
          : 'linear-gradient(180deg, rgba(4,10,18,0.97), rgba(2,6,12,0.9))',
        border: `1px solid ${color}40`,
        borderTop: 'none',
        boxShadow: `0 4px 20px ${color}20`,
        maxWidth: 480,
        width: '80vw',
      }}
    >
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 8,
        color: 'rgba(100,140,160,0.6)',
        letterSpacing: '0.3em',
        marginBottom: 1,
      }}>ACTIVE SECTOR</div>
      <div
        className="sector-flicker"
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 'clamp(10px, 2vw, 13px)',
          fontWeight: 900,
          color: color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {isBossMode ? '⚠ BOSS MODE — ' : ''}SECTOR: {displayName}
      </div>
      {isBossMode && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.7 }}
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 7,
            color: '#ff2222',
            letterSpacing: '0.2em',
            marginTop: 1,
          }}
        >
          BOSS ENCOUNTER ACTIVE — RESONANCE {Math.round(resonanceLevel)}% / 100%
        </motion.div>
      )}
    </div>
  );
}

// ── PILLAR 1 — Mission Control Ticker (bottom marquee) ───────────────
function MissionTicker({ isBossMode, activeChapterName }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const color = isBossMode ? '#ff6644' : '#00f5ff';

  // Rotate through ticker messages
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % TICKER_MESSAGES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const enrichedMsg = TICKER_MESSAGES[msgIndex].replace(
    /\[ACTIVE CHAPTER\]/g,
    activeChapterName || 'UNKNOWN SECTOR'
  );

  return (
    <div
      className="mission-ticker no-print"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9886,
        overflow: 'hidden',
        background: isBossMode
          ? 'linear-gradient(0deg, rgba(20,4,4,0.97), rgba(12,2,2,0.9))'
          : 'linear-gradient(0deg, rgba(4,8,14,0.97), rgba(2,4,8,0.9))',
        borderTop: `1px solid ${color}30`,
        padding: '4px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Static label */}
        <div style={{
          flexShrink: 0,
          padding: '0 12px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 9,
          color: color,
          textShadow: `0 0 8px ${color}`,
          borderRight: `1px solid ${color}40`,
          whiteSpace: 'nowrap',
          letterSpacing: '0.15em',
        }}>
          ◈ MISSION CTRL
        </div>

        {/* Animated message */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: 18 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={msgIndex}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: isBossMode ? 'rgba(255,120,100,0.85)' : 'rgba(180,220,240,0.8)',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
                lineHeight: '18px',
              }}
            >
              {enrichedMsg}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live time */}
        <LiveClock color={color} />
      </div>
    </div>
  );
}

function LiveClock({ color }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      flexShrink: 0,
      padding: '0 12px',
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: 9,
      color,
      borderLeft: `1px solid ${color}40`,
      letterSpacing: '0.1em',
      opacity: 0.7,
    }}>{time}</div>
  );
}

// ── PILLAR 3 — Cliffhanger Modal ─────────────────────────────────────
function CliffhangerModal({ event, onChoice, rpgStats }) {
  const [countdown, setCountdown] = useState(30);
  const [chosen, setChosen]       = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(id);
          // Auto-pick random if timer expires
          if (!chosen) onChoice(event.choices[0]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleChoice = (choice) => {
    if (chosen) return;
    setChosen(choice);
    setTimeout(() => onChoice(choice), 1800);
  };

  const getIcon = (iconName, size = 20) => {
    if (iconName === 'shield') return <Shield size={size} />;
    if (iconName === 'brain')  return <Brain  size={size} />;
    if (iconName === 'sword')  return <Sword  size={size} />;
    return <Zap size={size} />;
  };

  const countdownColor = countdown < 10 ? '#ff2222' : '#ff6b00';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99850] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.82, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.82, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 22 }}
        style={{
          background: 'linear-gradient(135deg, #100005, #060010)',
          border: '2px solid #ff00ff',
          boxShadow: '0 0 50px rgba(255,0,255,0.4), 0 0 100px rgba(255,0,255,0.15)',
          maxWidth: 520,
          width: '94vw',
          padding: '36px 32px',
          position: 'relative',
        }}
      >
        {/* Countdown ring */}
        <div style={{
          position: 'absolute',
          top: 16, right: 16,
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 24,
          fontWeight: 900,
          color: countdownColor,
          textShadow: `0 0 12px ${countdownColor}`,
        }}>
          {countdown}s
        </div>

        {/* Scan line decoration */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(0deg, transparent 49%, rgba(255,0,255,0.06) 50%, transparent 51%)',
            pointerEvents: 'none',
          }}
          animate={{ backgroundPosition: ['0 0%', '0 200%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        />

        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 0.7 }}
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 9,
            color: '#ff00ff',
            letterSpacing: '0.3em',
            marginBottom: 8,
          }}
        >
          ⚠ STRATEGIC DECISION REQUIRED ⚠
        </motion.div>

        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 18,
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 0 12px rgba(255,0,255,0.6)',
          marginBottom: 8,
          letterSpacing: '0.06em',
        }}>
          {event.title}
        </div>

        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 11,
          color: 'rgba(180,160,200,0.8)',
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          {event.flavor}
        </div>

        {/* Choices */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {event.choices.map((choice) => {
            const isChosen = chosen?.id === choice.id;
            const isOther  = chosen && chosen.id !== choice.id;
            const buffColor = choice.buff.color;

            return (
              <motion.button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                disabled={!!chosen}
                whileHover={!chosen ? { scale: 1.03 } : {}}
                whileTap={!chosen ? { scale: 0.95 } : {}}
                animate={isChosen ? {
                  boxShadow: [`0 0 20px ${buffColor}`, `0 0 40px ${buffColor}`, `0 0 20px ${buffColor}`],
                } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
                style={{
                  padding: '20px 16px',
                  background: isChosen
                    ? `${buffColor}20`
                    : isOther
                    ? 'rgba(20,10,30,0.3)'
                    : 'rgba(40,10,60,0.4)',
                  border: `1.5px solid ${isChosen ? buffColor : isOther ? '#2a1a3a' : '#6a2a9a'}`,
                  color: isChosen ? buffColor : isOther ? '#3a2a4a' : '#c880ff',
                  fontFamily: 'Share Tech Mono, monospace',
                  cursor: chosen ? 'not-allowed' : 'pointer',
                  opacity: isOther ? 0.4 : 1,
                  transition: 'all 0.3s',
                  textAlign: 'left',
                }}
              >
                <div style={{ marginBottom: 8, color: isChosen ? buffColor : '#c880ff' }}>
                  {getIcon(choice.icon, 18)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', marginBottom: 4 }}>
                  {choice.label}
                </div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>
                  +{choice.statDelta} {choice.stat.toUpperCase()}
                </div>
                <div style={{ fontSize: 8, color: choice.buff.color, marginTop: 4 }}>
                  BUFF: {choice.buff.name}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Result message */}
        <AnimatePresence>
          {chosen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 20,
                padding: '12px 16px',
                background: `${chosen.buff.color}15`,
                border: `1px solid ${chosen.buff.color}60`,
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 11,
                color: chosen.buff.color,
                textShadow: `0 0 8px ${chosen.buff.color}`,
              }}
            >
              ✓ {chosen.effect}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── PILLAR 4 — Boss Mode Overlay Effects ─────────────────────────────
function BossModeOverlay({ resonanceLevel }) {
  const pct = resonanceLevel / 100;
  return (
    <>
      {/* Red vignette that intensifies as resonance climbs */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9885,
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(160,0,0,${(0.3 * pct).toFixed(3)}) 100%)`,
          transition: 'all 1s',
        }}
      />
      {/* Pulsing top/bottom bars */}
      <motion.div
        className="no-print"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 3,
          background: `linear-gradient(90deg, #8b0000, #cc1a1a, #8b0000)`,
          boxShadow: '0 0 12px #cc1a1a',
          pointerEvents: 'none',
          zIndex: 9886,
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 0.9 }}
      />
      <motion.div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 24, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, #8b0000, #cc1a1a, #8b0000)`,
          boxShadow: '0 0 8px #cc1a1a',
          pointerEvents: 'none',
          zIndex: 9886,
        }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      />
    </>
  );
}

// ── Lore Fragment with blur tied to resonance ─────────────────────────
export function ResonanceLoreFragment({ children, resonanceLevel }) {
  const blurAmount = Math.max(0, ((100 - resonanceLevel) / 100) * 12);
  return (
    <div style={{
      filter: `blur(${blurAmount.toFixed(1)}px)`,
      transition: 'filter 1.5s ease',
      userSelect: blurAmount > 2 ? 'none' : 'auto',
    }}>
      {children}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────
export default function ResonanceSiege({
  activeMission,
  completedCount,
  audioUnlocked,
  rpgStats,
  setRpgStats,
  isBossMode,
}) {
  const chapterName = activeMission?.name || null;

  const {
    resonanceLevel,
    activeBuffs,
    pendingCliffhanger,
    setPendingCliffhanger,
    addBuff,
    applyManualDecay,
  } = useResonanceEngine(audioUnlocked, isBossMode);

  const handleCliffhangerChoice = useCallback((choice) => {
    // Apply stat delta
    setRpgStats(prev => ({
      ...prev,
      [choice.stat]: (prev[choice.stat] || 0) + choice.statDelta,
    }));
    // Apply buff
    addBuff(choice.buff);
    // Persist last choice
    LS.set('last_choice_made', {
      choiceId: choice.id,
      eventId: pendingCliffhanger?.id,
      epoch: Date.now(),
    });
    // Close modal after short delay
    setTimeout(() => setPendingCliffhanger(null), 2000);
  }, [pendingCliffhanger, setRpgStats, addBuff, setPendingCliffhanger]);

  return (
    <>
      {/* PILLAR 1 — Peripheral Monitor */}
      <ResonanceGauge
        level={resonanceLevel}
        isBossMode={isBossMode}
        activeBuffs={activeBuffs}
      />
      <SectorDisplay
        chapterName={chapterName}
        isBossMode={isBossMode}
        resonanceLevel={resonanceLevel}
      />
      <MissionTicker
        isBossMode={isBossMode}
        activeChapterName={chapterName}
      />

      {/* PILLAR 4 — Boss Mode visual overlay */}
      {isBossMode && <BossModeOverlay resonanceLevel={resonanceLevel} />}

      {/* PILLAR 3 — Cliffhanger Modal */}
      <AnimatePresence>
        {pendingCliffhanger && (
          <CliffhangerModal
            key={pendingCliffhanger.id}
            event={pendingCliffhanger}
            rpgStats={rpgStats}
            onChoice={handleCliffhangerChoice}
          />
        )}
      </AnimatePresence>

      {/* Active Buff Toast */}
      <AnimatePresence>
        {activeBuffs.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: 40,
            right: 16,
            zIndex: 9884,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {activeBuffs.map(buff => {
              const secsLeft = Math.max(0, Math.round((buff.expiresAt - Date.now()) / 1000));
              const minsLeft = Math.floor(secsLeft / 60);
              const secRem   = secsLeft % 60;
              return (
                <motion.div
                  key={buff.id}
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  style={{
                    padding: '6px 12px',
                    background: `${buff.color}18`,
                    border: `1px solid ${buff.color}60`,
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 9,
                    color: buff.color,
                    textShadow: `0 0 6px ${buff.color}`,
                    letterSpacing: '0.1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <motion.div
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: buff.color, boxShadow: `0 0 6px ${buff.color}`,
                    }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                  {buff.name}
                  <span style={{ opacity: 0.6 }}>
                    {minsLeft}:{String(secRem).padStart(2, '0')}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
