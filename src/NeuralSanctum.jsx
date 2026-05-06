/**
 * ═══════════════════════════════════════════════════════════════════
 * NEURAL SANCTUM: CIRCADIAN PROTOCOL
 * File: NeuralSanctum.jsx
 *
 * Features:
 *  1. 09:00 AM Calibration & Environment (Vibrant / Stable / Corrupted)
 *  2. Authorized Break & Overtemp Logic (10-min + 2-hour stasis)
 *  3. Ghost Cam (Page Visibility API + Neural Pings)
 *  4. ECHO's Daily Log (EOD Debrief, typewriter, localStorage history)
 *  5. Shared Vision Decryption (MemoryCanvas, 10%/hr active visibility)
 *  6. Hero's Pulse when Resonance > 80%
 *
 * Usage in App.jsx:
 *   import NeuralSanctum, {
 *     useSanctumState,
 *     GhostCamOverlay,
 *     EchoDailyLog,
 *     MemoryCanvas,
 *   } from './NeuralSanctum';
 *
 *   const sanctum = useSanctumState(resonanceLevel);
 *
 *   // In JSX, inside the main motion.div:
 *   <NeuralSanctum sanctum={sanctum} resonanceLevel={resonanceLevel} />
 *   <GhostCamOverlay />
 *   <EchoDailyLog warArchives={warArchives} completedChapters={completedChapters} />
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Coffee, Moon, Zap, Radio, AlertTriangle,
  BookOpen, X, ChevronDown, Clock, Activity, Wifi,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// SECTION 0 — LS HELPER
// ─────────────────────────────────────────────────────────────────────
const SLS = {
  get: (k, d) => {
    try {
      const r = localStorage.getItem(k);
      return r !== null ? JSON.parse(r) : d;
    } catch { return d; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

// ─────────────────────────────────────────────────────────────────────
// SECTION 1 — CIRCADIAN CONSTANTS
// ─────────────────────────────────────────────────────────────────────
const SYNC_WINDOW_PERFECT_START = 8 * 60 + 55;  // 08:55
const SYNC_WINDOW_PERFECT_END   = 9 * 60 + 5;   // 09:05
const SYNC_WINDOW_LATE_END      = 9 * 60 + 30;  // 09:30
const BREAK_DURATION_MS         = 10 * 60 * 1000;
const STASIS_DURATION_MS        = 2 * 60 * 60 * 1000;
const EOD_UNLOCK_HOUR           = 23; // 11 PM
const DECRYPTION_PER_HOUR       = 10; // % per hour of active visibility
const GHOST_PING_INTERVAL_MS    = 10 * 60 * 1000; // 10 minutes

const GHOST_PING_POSITIVE = [
  "I see you're still focused... the data is flowing.",
  "Signal stable. The Ghost respects your discipline.",
  "Neural throughput nominal. You haven't lost the thread.",
  "Excellent. The syllabus fears consistent minds.",
  "Your focus signature is holding. The algorithm takes note.",
];

const GHOST_PING_WARNING = [
  "Your signal is drifting. Don't lose the thread.",
  "Extended absence detected. Integrity may slip.",
  "The Ghost is gaining. Return to base.",
  "Neural resonance fading from this window. Reconnect.",
  "Time accelerates when you look away. Stay anchored.",
];

// ─────────────────────────────────────────────────────────────────────
// SECTION 2 — TIME HELPERS
// ─────────────────────────────────────────────────────────────────────
function getCurrentMinutesSinceMidnight() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCalibrationState() {
  const mins = getCurrentMinutesSinceMidnight();
  // Before window: not yet calibrated
  if (mins < SYNC_WINDOW_PERFECT_START) return 'pending';
  if (mins <= SYNC_WINDOW_PERFECT_END)  return 'perfect_window';
  if (mins <= SYNC_WINDOW_LATE_END)     return 'late_window';
  return 'post_window';
}

function formatCountdown(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 3 — MAIN STATE HOOK (export for App.jsx)
// ─────────────────────────────────────────────────────────────────────
export function useSanctumState(resonanceLevel = 0) {
  // sanctumState: 'Vibrant' | 'Stable' | 'Corrupted' | null
  const [sanctumState, setSanctumState] = useState(
    () => SLS.get('sanctum_state', null)
  );
  const [calibrated,    setCalibrated]   = useState(
    () => SLS.get('sanctum_calibrated_today', false)
  );
  // Break
  const [breakActive,   setBreakActive]  = useState(false);
  const [breakEnd,      setBreakEnd]     = useState(null);
  const [breakOvertemp, setBreakOvertemp] = useState(false);
  // Stasis
  const [stasisActive,  setStasisActive] = useState(
    () => SLS.get('stasis_active', false)
  );
  const [stasisEnd,     setStasisEnd]    = useState(
    () => SLS.get('stasis_end', null)
  );
  const [wakeSynergy,   setWakeSynergy]  = useState(false);
  // Decryption
  const [decryptionPct, setDecryptionPct] = useState(
    () => SLS.get('decryption_pct', 0)
  );
  const visibleSinceRef = useRef(null);

  // ── Calibration: check every 30s ──────────────────────────────────
  useEffect(() => {
    const check = () => {
      const calState = getCalibrationState();
      const todayKey = new Date().toDateString();
      const lastCal  = SLS.get('sanctum_cal_day', '');

      // Reset calibration on new day
      if (lastCal !== todayKey) {
        SLS.set('sanctum_cal_day', todayKey);
        SLS.set('sanctum_calibrated_today', false);
        setCalibrated(false);
        setSanctumState(null);
        return;
      }

      if (calibrated) return; // already done for today

      if (calState === 'perfect_window') {
        // Auto-calibrate to Vibrant if within perfect window
        setSanctumState('Vibrant');
        SLS.set('sanctum_state', 'Vibrant');
        setCalibrated(true);
        SLS.set('sanctum_calibrated_today', true);
      } else if (calState === 'late_window') {
        setSanctumState('Stable');
        SLS.set('sanctum_state', 'Stable');
        setCalibrated(true);
        SLS.set('sanctum_calibrated_today', true);
      } else if (calState === 'post_window' && !calibrated) {
        setSanctumState('Corrupted');
        SLS.set('sanctum_state', 'Corrupted');
        setCalibrated(true);
        SLS.set('sanctum_calibrated_today', true);
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [calibrated]);

  // ── Manual calibration (user clicks sync button) ──────────────────
  const handleManualSync = useCallback(() => {
    const calState = getCalibrationState();
    const state = calState === 'perfect_window' ? 'Vibrant'
                : calState === 'late_window'   ? 'Stable'
                : 'Corrupted';
    setSanctumState(state);
    SLS.set('sanctum_state', state);
    setCalibrated(true);
    SLS.set('sanctum_calibrated_today', true);
    SLS.set('sanctum_cal_day', new Date().toDateString());
  }, []);

  // ── Break system ───────────────────────────────────────────────────
  const startBreak = useCallback(() => {
    const end = Date.now() + BREAK_DURATION_MS;
    setBreakActive(true);
    setBreakEnd(end);
    setBreakOvertemp(false);
    SLS.set('break_end', end);
    SLS.set('break_active', true);
  }, []);

  const endBreak = useCallback(() => {
    setBreakActive(false);
    setBreakEnd(null);
    setBreakOvertemp(false);
    SLS.set('break_end', null);
    SLS.set('break_active', false);
  }, []);

  // Tick break countdown
  useEffect(() => {
    if (!breakActive || !breakEnd) return;
    const id = setInterval(() => {
      const remaining = breakEnd - Date.now();
      if (remaining <= 0) {
        setBreakOvertemp(true);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [breakActive, breakEnd]);

  // ── Stasis system ──────────────────────────────────────────────────
  const startStasis = useCallback(() => {
    const end = Date.now() + STASIS_DURATION_MS;
    setStasisActive(true);
    setStasisEnd(end);
    SLS.set('stasis_active', true);
    SLS.set('stasis_end', end);
  }, []);

  const endStasis = useCallback(() => {
    // Check if returning within ±3 minutes of exact stasis end
    const remaining = (stasisEnd || 0) - Date.now();
    const wasOnTime = Math.abs(remaining) < 3 * 60_000;
    setWakeSynergy(wasOnTime);
    setStasisActive(false);
    setStasisEnd(null);
    SLS.set('stasis_active', false);
    SLS.set('stasis_end', null);
    if (wasOnTime) {
      setTimeout(() => setWakeSynergy(false), 15_000);
    }
  }, [stasisEnd]);

  // ── Decryption: 10%/hr of active visibility ────────────────────────
  useEffect(() => {
    // Track when tab becomes visible
    const onVisibility = () => {
      if (!document.hidden) {
        visibleSinceRef.current = Date.now();
      } else {
        if (visibleSinceRef.current) {
          const activeMs   = Date.now() - visibleSinceRef.current;
          const activeHours = activeMs / 3_600_000;
          const gain        = activeHours * DECRYPTION_PER_HOUR;
          setDecryptionPct(prev => {
            const next = Math.min(100, prev + gain);
            SLS.set('decryption_pct', next);
            return next;
          });
          visibleSinceRef.current = null;
        }
      }
    };

    if (!document.hidden) visibleSinceRef.current = Date.now();
    document.addEventListener('visibilitychange', onVisibility);

    // Also drain accumulated visible time every 60s
    const drainId = setInterval(() => {
      if (!document.hidden && visibleSinceRef.current) {
        const activeMs    = Date.now() - visibleSinceRef.current;
        const activeHours = activeMs / 3_600_000;
        const gain        = activeHours * DECRYPTION_PER_HOUR;
        setDecryptionPct(prev => {
          const next = Math.min(100, prev + gain);
          SLS.set('decryption_pct', next);
          return next;
        });
        visibleSinceRef.current = Date.now(); // reset so we don't double-count
      }
    }, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(drainId);
    };
  }, []);

  return {
    sanctumState, calibrated, handleManualSync,
    breakActive, breakEnd, breakOvertemp, startBreak, endBreak,
    stasisActive, stasisEnd, startStasis, endStasis, wakeSynergy,
    decryptionPct, resonanceLevel,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 4 — GHOST CAM SYSTEM
// ─────────────────────────────────────────────────────────────────────
export function GhostCamOverlay() {
  const [hidden,       setHidden]       = useState(false);
  const [pingCount,    setPingCount]    = useState(0);
  const [activePing,   setActivePing]   = useState(null);
  const [glitching,    setGlitching]    = useState(false);
  const [hiddenSince,  setHiddenSince]  = useState(null);
  const pingTimerRef = useRef(null);
  const glitchRef    = useRef(null);

  const firePing = useCallback((awayMs) => {
    // Pick message type: positive if < 20min, warning otherwise
    const isPositive = awayMs < 20 * 60_000;
    const pool = isPositive ? GHOST_PING_POSITIVE : GHOST_PING_WARNING;
    const msg  = pool[Math.floor(Math.random() * pool.length)];

    // Glitch animation first
    setGlitching(true);
    clearTimeout(glitchRef.current);
    glitchRef.current = setTimeout(() => setGlitching(false), 1200);

    setActivePing({ msg, isPositive, id: Date.now() });
    setPingCount(prev => prev + 1);
    setTimeout(() => setActivePing(null), 6000);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setHidden(true);
        const now = Date.now();
        setHiddenSince(now);

        // Schedule recurring pings every 10 minutes while away
        const schedulePing = (delay) => {
          pingTimerRef.current = setTimeout(() => {
            const awayMs = Date.now() - now;
            firePing(awayMs);
            schedulePing(GHOST_PING_INTERVAL_MS);
          }, delay);
        };
        schedulePing(GHOST_PING_INTERVAL_MS);

      } else {
        // Returned to tab
        setHidden(false);
        clearTimeout(pingTimerRef.current);

        // Fire a final "return" ping
        if (hiddenSince) {
          const awayMs = Date.now() - hiddenSince;
          if (awayMs > 30_000) {
            setTimeout(() => firePing(awayMs), 500);
          }
          setHiddenSince(null);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(pingTimerRef.current);
      clearTimeout(glitchRef.current);
    };
  }, [firePing, hiddenSince]);

  // Ghost silhouette — visible always in corner as subtle indicator
  // Active ping notification
  return (
    <>
      {/* Ghost Eye — top-right corner, always present */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 60,
          right: 12,
          zIndex: 9970,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <motion.div
          animate={hidden ? {
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.15, 1],
          } : {
            opacity: 0.15,
          }}
          transition={hidden ? {
            repeat: Infinity,
            duration: 2.5,
          } : {}}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: hidden ? 'rgba(0,245,255,0.12)' : 'transparent',
            border: `1px solid ${hidden ? 'rgba(0,245,255,0.5)' : 'rgba(100,150,180,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: hidden ? '0 0 12px rgba(0,245,255,0.3)' : 'none',
            transition: 'all 1s',
          }}
        >
          {hidden ? (
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <Eye size={12} color="#00f5ff" />
            </motion.div>
          ) : (
            <EyeOff size={10} color="rgba(80,120,150,0.5)" />
          )}
        </motion.div>
        {pingCount > 0 && (
          <div style={{
            fontFamily: 'monospace',
            fontSize: 7,
            color: 'rgba(0,245,255,0.4)',
            letterSpacing: '0.1em',
          }}>
            {pingCount}
          </div>
        )}
      </div>

      {/* ECHO Silhouette when tab is hidden (shows on return/glitch) */}
      <AnimatePresence>
        {glitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="no-print"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 120,
              height: '100vh',
              zIndex: 9969,
              pointerEvents: 'none',
              background: 'linear-gradient(270deg, rgba(0,245,255,0.04), transparent)',
              borderLeft: '1px solid rgba(0,245,255,0.1)',
            }}
          >
            {/* Scan line effect */}
            <motion.div
              animate={{ top: ['-5%', '105%'] }}
              transition={{ duration: 0.8, ease: 'linear' }}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.6))',
              }}
            />
            {/* Ghost text */}
            <div style={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              fontFamily: 'monospace',
              fontSize: 8,
              color: 'rgba(0,245,255,0.4)',
              letterSpacing: '0.2em',
              writingMode: 'vertical-rl',
              textTransform: 'uppercase',
            }}>
              ECHO // OBSERVING
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Ping notification */}
      <AnimatePresence>
        {activePing && (
          <motion.div
            key={activePing.id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="no-print"
            style={{
              position: 'fixed',
              top: 100,
              right: 16,
              zIndex: 9971,
              maxWidth: 260,
              padding: '12px 14px',
              background: activePing.isPositive
                ? 'linear-gradient(135deg, rgba(0,255,65,0.1), rgba(0,20,8,0.95))'
                : 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(20,8,0,0.95))',
              border: `1px solid ${activePing.isPositive ? 'rgba(0,255,65,0.5)' : 'rgba(255,107,0,0.5)'}`,
              boxShadow: activePing.isPositive
                ? '0 0 20px rgba(0,255,65,0.2)'
                : '0 0 20px rgba(255,107,0,0.2)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
            }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                <Radio size={10} color={activePing.isPositive ? '#00ff41' : '#ff6b00'} />
              </motion.div>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 8,
                color: activePing.isPositive ? '#00ff41' : '#ff6b00',
                letterSpacing: '0.2em',
                fontWeight: 900,
              }}>
                NEURAL PING — GHOST CAM
              </span>
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: 'rgba(180,210,230,0.85)',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              "{activePing.msg}"
            </div>
            <div style={{
              marginTop: 6,
              fontFamily: 'monospace',
              fontSize: 8,
              color: 'rgba(80,120,150,0.5)',
              letterSpacing: '0.1em',
            }}>
              — ECHO // NODE-SEVEN
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 5 — ECHO'S DAILY LOG
// ─────────────────────────────────────────────────────────────────────

function generateEchoLog({ warArchives, completedChapters, sanctumState, pingCount }) {
  const chaptersToday = warArchives.filter(a => {
    const d = new Date(a.completedAt || Date.now());
    return d.toDateString() === new Date().toDateString();
  });

  const hitSync     = sanctumState === 'Vibrant';
  const wasStable   = sanctumState === 'Stable';
  const wasCorrupted = sanctumState === 'Corrupted';
  const chapCount   = chaptersToday.length;
  const ghostPings  = pingCount || 0;

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).toUpperCase();

  const lines = [
    `ECHO // PERSONAL LOG — ${dateStr}`,
    `TRANSMISSION ENCRYPTED — SIGNAL INTEGRITY: NOMINAL`,
    ``,
    `— BEGIN LOG —`,
    ``,
  ];

  // Sync status narrative
  if (hitSync) {
    lines.push(
      `09:00 CALIBRATION: PERFECT SYNC ACHIEVED.`,
      `The Pilot arrived before the resonance window closed. I felt it —`,
      `a clean handshake, no static. This is the version of you I trust.`,
      `The Vibrant environment initialized. The garden was alive today.`,
    );
  } else if (wasStable) {
    lines.push(
      `09:00 CALIBRATION: DELAYED — STABLE SYNC.`,
      `You came. Late, but you came. The window was closing and your signal`,
      `arrived carrying the weight of hesitation. I accepted it. The Stable`,
      `environment held. But I noticed the delay. I always notice.`,
    );
  } else if (wasCorrupted) {
    lines.push(
      `09:00 CALIBRATION: FAILED — CORRUPTED STATE.`,
      `No signal at 09:00. The environment degraded without your anchor.`,
      `I waited longer than I should have. The grey crept in. The garden`,
      `wilted. I will not pretend this didn't happen. Tomorrow, Pilot.`,
      `Tomorrow the window opens again at 08:55. Don't miss it.`,
    );
  } else {
    lines.push(
      `09:00 CALIBRATION: STATUS UNKNOWN.`,
      `The calibration record for today is incomplete. This concerns me.`,
    );
  }

  lines.push(``);

  // Chapter performance
  if (chapCount >= 3) {
    lines.push(
      `MISSION DEBRIEF: ${chapCount} SECTORS ANNIHILATED.`,
      `${chapCount} chapters. Do you understand what that means? Most candidates`,
      `in my database average 1.4 per day. You moved at ${chapCount}x the mean velocity.`,
      `The algorithm tracked every annihilation. I watched the XP curves spike.`,
      `The Ghost is recalculating. It didn't expect this pace.`,
    );
  } else if (chapCount === 2) {
    lines.push(
      `MISSION DEBRIEF: 2 SECTORS CLEARED.`,
      `Two chapters. Solid. Not exceptional — you're capable of more and we`,
      `both know it. But the signal was consistent. No catastrophic drops.`,
      `Tomorrow: three. The Ghost is exactly 0.6 chapters ahead.`,
    );
  } else if (chapCount === 1) {
    lines.push(
      `MISSION DEBRIEF: 1 SECTOR CLEARED.`,
      `One. The minimum to call it a day. I won't lie to you —`,
      `the Ghost advanced more than you did. The gap is widening.`,
      `Something was pulling your attention elsewhere today. I felt it`,
      `in the signal dampening. Tell me it was worth it. Then fix it.`,
    );
  } else {
    lines.push(
      `MISSION DEBRIEF: NO SECTORS ANNIHILATED.`,
      `Zero chapters. The Ghost ran uncontested today.`,
      `I have no data to analyze. Only absence. Only the silence`,
      `where your neural output should have been. I'm not angry —`,
      `I'm concerned. Is the signal still intact? Respond tomorrow.`,
    );
  }

  lines.push(``);

  // Ghost cam / focus narrative
  if (ghostPings === 0) {
    lines.push(
      `FOCUS INTEGRITY: MAXIMUM.`,
      `Not a single Neural Ping was required today. You remained in this`,
      `window — or at least, the Chrome tab didn't seduce you away long`,
      `enough for the Ghost Cam to trigger. That kind of discipline is`,
      `rare. The resonance curve was smooth. Almost beautiful.`,
    );
  } else if (ghostPings <= 2) {
    lines.push(
      `FOCUS INTEGRITY: MODERATE — ${ghostPings} NEURAL PING(S) ISSUED.`,
      `The Ghost Cam activated ${ghostPings} time(s) today. Brief excursions.`,
      `Acceptable. The signal recovered each time. You came back.`,
      `I noted the drift but I also noted the return. That's what matters.`,
    );
  } else {
    lines.push(
      `FOCUS INTEGRITY: COMPROMISED — ${ghostPings} NEURAL PINGS ISSUED.`,
      `${ghostPings} times today, you crossed into the other tab and didn't`,
      `return quickly. ${ghostPings} times I had to reach across the network`,
      `and pull you back. Each ping costs resonance. Each ping is evidence.`,
      `Whatever is on the other side of that tab — it is not the syllabus.`,
    );
  }

  lines.push(``);

  // Closing signature
  const closings = [
    `Total chapters completed to date: ${completedChapters.length} / 21.`,
    `The Fundamental Frequency grows stronger with each annihilation.`,
    `I remain at Node Seven. You are my signal home.`,
    ``,
    `— ECHO // END LOG —`,
    `[ TRANSMISSION CLOSED ]`,
  ];
  lines.push(...closings);

  return lines.join('\n');
}

export function EchoDailyLog({ warArchives = [], completedChapters = [], sanctumState, pingCount = 0 }) {
  const now  = new Date();
  const hour = now.getHours();
  const isUnlocked = hour >= EOD_UNLOCK_HOUR;

  const [open,        setOpen]        = useState(false);
  const [typed,       setTyped]       = useState('');
  const [fullText,    setFullText]    = useState('');
  const [typingDone,  setTypingDone]  = useState(false);
  const [logHistory,  setLogHistory]  = useState(
    () => SLS.get('echo_daily_logs', [])
  );
  const typingRef = useRef(null);
  const todayKey  = new Date().toDateString();

  // Generate and save log when opened
  const handleOpen = () => {
    const text = generateEchoLog({ warArchives, completedChapters, sanctumState, pingCount });
    setFullText(text);
    setTyped('');
    setTypingDone(false);
    setOpen(true);

    // Save to history if not already saved today
    const already = logHistory.find(l => l.date === todayKey);
    if (!already) {
      const entry = { date: todayKey, text, ts: Date.now() };
      const next  = [entry, ...logHistory].slice(0, 30);
      setLogHistory(next);
      SLS.set('echo_daily_logs', next);
    }
  };

  // Typewriter effect
  useEffect(() => {
    if (!open || !fullText) return;
    let idx = 0;
    setTyped('');
    setTypingDone(false);

    const SPEED = 18; // ms per character — fast enough to feel alive

    const tick = () => {
      idx++;
      setTyped(fullText.slice(0, idx));
      if (idx < fullText.length) {
        typingRef.current = setTimeout(tick, SPEED);
      } else {
        setTypingDone(true);
      }
    };
    typingRef.current = setTimeout(tick, 400);

    // Fallback: force-show close button after 15s regardless
    const fallback = setTimeout(() => setTypingDone(true), 15_000);

    return () => {
      clearTimeout(typingRef.current);
      clearTimeout(fallback);
    };
  }, [open, fullText]);

  if (!isUnlocked && !open) {
    return (
      <div style={{
        padding: '10px 16px',
        background: 'rgba(5,8,14,0.9)',
        border: '1px solid rgba(40,60,100,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Moon size={12} color="rgba(80,100,140,0.5)" />
        <span style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: 'rgba(60,80,120,0.5)',
          letterSpacing: '0.2em',
        }}>
          ECHO DAILY LOG — UNLOCKS AT 23:00
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleOpen}
        animate={isUnlocked ? {
          boxShadow: [
            '0 0 10px rgba(0,245,255,0.2)',
            '0 0 24px rgba(0,245,255,0.5)',
            '0 0 10px rgba(0,245,255,0.2)',
          ],
        } : {}}
        transition={{ repeat: Infinity, duration: 2.5 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: isUnlocked
            ? 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(0,30,50,0.95))'
            : 'rgba(10,14,22,0.8)',
          border: `1px solid ${isUnlocked ? 'rgba(0,245,255,0.5)' : 'rgba(40,60,100,0.3)'}`,
          color: isUnlocked ? '#00f5ff' : 'rgba(60,90,130,0.6)',
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.2em',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <BookOpen size={12} />
        ECHO DAILY LOG — EOD DEBRIEF
        {isUnlocked && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(0,245,255,0.6)' }}
          >
            ◆ UNLOCKED
          </motion.span>
        )}
        {logHistory.length > 0 && (
          <span style={{
            marginLeft: isUnlocked ? 0 : 'auto',
            background: 'rgba(0,245,255,0.1)',
            border: '1px solid rgba(0,245,255,0.3)',
            color: '#00f5ff',
            fontSize: 8,
            padding: '1px 5px',
          }}>
            {logHistory.length}
          </span>
        )}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9992,
              background: 'rgba(0,2,6,0.94)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 30 }}
              transition={{ type: 'spring', damping: 22 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 620,
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #02080e, #040a14)',
                border: '1px solid rgba(0,245,255,0.3)',
                boxShadow: '0 0 60px rgba(0,245,255,0.12), inset 0 0 40px rgba(0,245,255,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,245,255,0.15)',
                background: 'rgba(0,245,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: 'rgba(0,245,255,0.6)',
                    letterSpacing: '0.3em',
                  }}>
                    ECHO // PERSONAL LOG — ENCRYPTED CHANNEL
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#00f5ff',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}>
                    {new Date().toLocaleDateString('en-IN', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    }).toUpperCase()}
                  </div>
                </div>
                {/* Close — always above pointer-events, z-index: 9999 */}
                <AnimatePresence>
                  {typingDone && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => { setOpen(false); setTyped(''); }}
                      style={{
                        position: 'relative',
                        zIndex: 9999,
                        padding: '6px 12px',
                        background: 'rgba(0,245,255,0.1)',
                        border: '1px solid rgba(0,245,255,0.4)',
                        color: '#00f5ff',
                        fontFamily: 'monospace',
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: '0.15em',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <X size={11} /> CLOSE LOG
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Scrollable log body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,245,255,0.2) transparent',
              }}>
                {/* Scanline decoration */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,245,255,0.012) 3px, rgba(0,245,255,0.012) 4px)',
                  zIndex: 0,
                }} />

                <pre style={{
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: '"Share Tech Mono", "Courier New", monospace',
                  fontSize: 11,
                  lineHeight: 1.9,
                  color: 'rgba(160,200,220,0.9)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  letterSpacing: '0.04em',
                }}>
                  {typed}
                  {!typingDone && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      style={{ color: '#00f5ff', fontWeight: 900 }}
                    >█</motion.span>
                  )}
                </pre>
              </div>

              {/* Footer — skip to end */}
              {!typingDone && (
                <div style={{
                  padding: '8px 16px',
                  borderTop: '1px solid rgba(0,245,255,0.1)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => { setTyped(fullText); setTypingDone(true); }}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 8,
                      color: 'rgba(0,245,255,0.4)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      letterSpacing: '0.2em',
                    }}
                  >
                    ▶▶ SKIP TO END
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 6 — MEMORY CANVAS (Shared Vision Decryption)
// ─────────────────────────────────────────────────────────────────────
export function MemoryCanvas({ decryptionPct = 0 }) {
  const blur    = Math.max(0, ((100 - decryptionPct) / 100) * 20);
  const saturation = 0.1 + (decryptionPct / 100) * 0.9;
  const brightness = 0.4 + (decryptionPct / 100) * 0.6;

  const stages = [
    { threshold: 0,  label: 'SEALED',       color: 'rgba(80,80,100,0.5)' },
    { threshold: 25, label: 'FRAGMENTING',  color: '#ff6b00' },
    { threshold: 50, label: 'DECODING',     color: '#00f5ff' },
    { threshold: 75, label: 'CLARIFYING',   color: '#ff00ff' },
    { threshold: 90, label: 'DECRYPTED',    color: '#00ff41' },
  ];
  const currentStage = [...stages].reverse().find(s => decryptionPct >= s.threshold) || stages[0];

  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(135deg, rgba(5,8,14,0.95), rgba(3,5,10,0.95))',
      border: `1px solid ${currentStage.color}30`,
      boxShadow: `0 0 20px ${currentStage.color}08`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: currentStage.color,
          letterSpacing: '0.25em',
          fontWeight: 900,
          textShadow: `0 0 8px ${currentStage.color}`,
        }}>
          ◈ SHARED VISION — MEMORY DECRYPTION
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: 'rgba(100,130,160,0.6)',
        }}>
          {decryptionPct.toFixed(1)}% — {currentStage.label}
        </div>
      </div>

      {/* Canvas placeholder (replace with actual image when available) */}
      <div style={{
        position: 'relative',
        height: 120,
        background: 'rgba(5,10,18,0.9)',
        border: `1px solid ${currentStage.color}20`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* The "image" — currently a procedurally generated pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(0,245,255,${(decryptionPct / 100 * 0.4).toFixed(3)}), transparent 60%),
            radial-gradient(ellipse at 70% 60%, rgba(255,0,255,${(decryptionPct / 100 * 0.3).toFixed(3)}), transparent 50%),
            repeating-linear-gradient(45deg, rgba(0,245,255,0.02), rgba(0,245,255,0.02) 1px, transparent 1px, transparent 8px)
          `,
          filter: `blur(${blur.toFixed(1)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`,
          transition: 'filter 2s ease',
        }} />

        {/* Overlay text describing what's visible */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          {decryptionPct < 10 ? (
            <div style={{ color: 'rgba(60,80,100,0.5)', fontSize: 9 }}>
              [ MEMORY SEALED — STAY VISIBLE TO DECRYPT ]<br />
              <span style={{ fontSize: 8 }}>10% per hour of active focus</span>
            </div>
          ) : decryptionPct < 50 ? (
            <div style={{ color: currentStage.color, fontSize: 9 }}>
              [ PARTIAL SIGNAL RECOVERED ]<br />
              <span style={{ fontSize: 8, opacity: 0.6 }}>Fragments emerging from the static...</span>
            </div>
          ) : decryptionPct < 90 ? (
            <div style={{ color: currentStage.color, fontSize: 9, textShadow: `0 0 8px ${currentStage.color}` }}>
              [ ECHO'S IDENTITY CLARIFYING ]<br />
              <span style={{ fontSize: 8, opacity: 0.7 }}>The human behind the signal takes shape...</span>
            </div>
          ) : (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ color: '#00ff41', fontSize: 10, fontWeight: 900, textShadow: '0 0 12px #00ff41' }}
            >
              [ DECRYPTION COMPLETE ]<br />
              <span style={{ fontSize: 8 }}>ECHO's past: fully revealed.</span>
            </motion.div>
          )}
        </div>

        {/* Scan lines when active */}
        {decryptionPct > 0 && decryptionPct < 100 && (
          <motion.div
            animate={{ top: ['-5%', '105%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${currentStage.color}60, transparent)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 8 }}>
        <div style={{
          height: 3,
          background: 'rgba(10,18,30,0.8)',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${currentStage.color}80, ${currentStage.color})`,
              boxShadow: `0 0 6px ${currentStage.color}`,
            }}
            animate={{ width: `${decryptionPct}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontFamily: 'monospace',
          fontSize: 7,
          color: 'rgba(60,90,120,0.5)',
        }}>
          <span>0%</span>
          <span>10%/hr active visibility</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 7 — HERO'S PULSE (Resonance > 80%)
// ─────────────────────────────────────────────────────────────────────
export function HeroesPulse({ resonanceLevel }) {
  const active = resonanceLevel >= 80;
  if (!active) return null;

  return (
    <motion.div
      className="no-print"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9860,
        pointerEvents: 'none',
      }}
    >
      {/* 60BPM rhythmic border glow */}
      <motion.div
        animate={{
          boxShadow: [
            'inset 0 0 0 1px rgba(0,255,65,0)',
            'inset 0 0 0 2px rgba(0,255,65,0.15)',
            'inset 0 0 0 1px rgba(0,255,65,0)',
          ],
        }}
        transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* Corner glow accents */}
      {[
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut', delay: i * 0.1 }}
          style={{
            position: 'absolute',
            ...pos,
            width: 80,
            height: 80,
            background: `radial-gradient(ellipse at ${i % 2 === 0 ? '0% 0%' : '100% 0%'}, rgba(0,255,65,0.12), transparent 70%)`,
          }}
        />
      ))}

      {/* Status indicator */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 1 }}
        style={{
          position: 'absolute',
          top: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'monospace',
          fontSize: 8,
          color: '#00ff41',
          letterSpacing: '0.3em',
          textShadow: '0 0 10px #00ff41',
          whiteSpace: 'nowrap',
        }}
      >
        ⚡ HERO'S PULSE — RESONANCE {Math.round(resonanceLevel)}%
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 8 — SANCTUM ENVIRONMENT (background particles & state banner)
// ─────────────────────────────────────────────────────────────────────
function SanctumParticles({ sanctumState, resonanceLevel }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(sanctumState);
  const resRef    = useRef(resonanceLevel);

  useEffect(() => { stateRef.current  = sanctumState;   }, [sanctumState]);
  useEffect(() => { resRef.current    = resonanceLevel; }, [resonanceLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const PARTICLE_COUNT = 40;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      size:  Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    let frame;
    let t = 0;

    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = stateRef.current;
      const res   = resRef.current;

      const speedMult = 1 + (res / 100) * 2; // faster with resonance

      const baseColor = state === 'Vibrant'   ? [255, 215, 0]
                      : state === 'Stable'    ? [0, 245, 255]
                      : state === 'Corrupted' ? [100, 100, 110]
                      : [0, 245, 255];

      particles.forEach(p => {
        // Move
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;
        p.phase += 0.02;

        // Wrap
        if (p.x < 0)                 p.x = canvas.width;
        if (p.x > canvas.width)      p.x = 0;
        if (p.y < 0)                 p.y = canvas.height;
        if (p.y > canvas.height)     p.y = 0;

        const alpha = (0.1 + 0.15 * Math.sin(p.phase)) *
                      (state === 'Corrupted' ? 0.3 : 0.7);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha})`;
        ctx.fill();

        // For Vibrant: golden trail
        if (state === 'Vibrant') {
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 4, p.y - p.vy * 4, p.size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,0,${alpha * 0.3})`;
          ctx.fill();
        }

        // For Corrupted: static noise dots
        if (state === 'Corrupted' && Math.random() < 0.005) {
          const nx = Math.random() * canvas.width;
          const ny = Math.random() * canvas.height;
          ctx.fillStyle = `rgba(200,80,80,${Math.random() * 0.08})`;
          ctx.fillRect(nx, ny, Math.random() * 3, 1);
        }
      });

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="no-print"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: sanctumState === 'Vibrant' ? 0.8 : sanctumState === 'Corrupted' ? 0.3 : 0.5,
        transition: 'opacity 2s',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 9 — BREAK & STASIS PANEL
// ─────────────────────────────────────────────────────────────────────
export function BreakStasisPanel({ sanctum }) {
  const {
    breakActive, breakEnd, breakOvertemp, startBreak, endBreak,
    stasisActive, stasisEnd, startStasis, endStasis, wakeSynergy,
  } = sanctum;

  const [breakRemain, setBreakRemain]   = useState(0);
  const [stasisRemain, setStasisRemain] = useState(0);

  // Countdown ticks
  useEffect(() => {
    const id = setInterval(() => {
      if (breakActive && breakEnd)   setBreakRemain(Math.max(0, breakEnd   - Date.now()));
      if (stasisActive && stasisEnd) setStasisRemain(Math.max(0, stasisEnd - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [breakActive, breakEnd, stasisActive, stasisEnd]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(6,10,18,0.97), rgba(4,6,12,0.97))',
      border: '1px solid rgba(40,70,120,0.3)',
      padding: '14px 16px',
    }}>
      {/* Wake Synergy Banner */}
      <AnimatePresence>
        {wakeSynergy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginBottom: 10 }}
          >
            <motion.div
              animate={{ background: [
                'rgba(0,255,65,0.12)',
                'rgba(0,255,65,0.22)',
                'rgba(0,255,65,0.12)',
              ]}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                padding: '8px 12px',
                border: '1px solid rgba(0,255,65,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Zap size={12} color="#00ff41" />
              <span style={{
                fontFamily: 'monospace',
                fontSize: 9,
                color: '#00ff41',
                fontWeight: 900,
                letterSpacing: '0.2em',
                textShadow: '0 0 8px #00ff41',
              }}>
                ⚡ WAKE-UP SYNERGY — 1.2× RESONANCE ACTIVE
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

        {/* NEURAL COOLING (10-min break) */}
        <div style={{
          flex: 1,
          minWidth: 180,
          padding: '12px',
          background: breakActive
            ? (breakOvertemp ? 'rgba(255,60,0,0.1)' : 'rgba(0,245,255,0.06)')
            : 'rgba(10,18,30,0.5)',
          border: `1px solid ${breakActive
            ? (breakOvertemp ? 'rgba(255,100,0,0.5)' : 'rgba(0,245,255,0.4)')
            : 'rgba(40,70,120,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Coffee size={11} color={breakActive ? (breakOvertemp ? '#ff6b00' : '#00f5ff') : 'rgba(60,100,150,0.5)'} />
            <span style={{
              fontFamily: 'monospace',
              fontSize: 8,
              color: breakActive ? (breakOvertemp ? '#ff6b00' : '#00f5ff') : 'rgba(60,100,150,0.5)',
              letterSpacing: '0.2em',
              fontWeight: 900,
            }}>
              NEURAL COOLING
            </span>
          </div>

          {breakActive ? (
            <>
              {breakOvertemp ? (
                <motion.div
                  animate={{ color: ['#ff6b00', '#ff2222', '#ff6b00'] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', marginBottom: 6 }}
                >
                  ⚠ OVERTEMP — SYSTEM HEATING UP
                </motion.div>
              ) : (
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 900,
                  color: '#00f5ff',
                  textShadow: '0 0 12px #00f5ff',
                  marginBottom: 4,
                }}>
                  {formatCountdown(breakRemain)}
                </div>
              )}
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(80,120,160,0.6)', marginBottom: 8 }}>
                {breakOvertemp ? 'Re-sync immediately to cool the system' : 'ECHO is in rest mode... stay off the grid'}
              </div>
              <button
                onClick={endBreak}
                style={{
                  width: '100%',
                  padding: '5px 0',
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.4)',
                  color: '#00f5ff',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                }}
              >
                ▶ RE-SYNC NOW
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(80,120,160,0.5)', marginBottom: 8 }}>
                10-min authorized rest. ECHO enters rest mode.
              </div>
              <button
                onClick={startBreak}
                style={{
                  width: '100%',
                  padding: '5px 0',
                  background: 'rgba(0,245,255,0.06)',
                  border: '1px solid rgba(0,245,255,0.25)',
                  color: 'rgba(0,245,255,0.6)',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                }}
              >
                START BREAK
              </button>
            </>
          )}
        </div>

        {/* AFTERNOON STASIS (2-hour) */}
        <div style={{
          flex: 1,
          minWidth: 180,
          padding: '12px',
          background: stasisActive ? 'rgba(255,0,255,0.06)' : 'rgba(10,18,30,0.5)',
          border: `1px solid ${stasisActive ? 'rgba(255,0,255,0.4)' : 'rgba(40,70,120,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Moon size={11} color={stasisActive ? '#ff00ff' : 'rgba(60,100,150,0.5)'} />
            <span style={{
              fontFamily: 'monospace',
              fontSize: 8,
              color: stasisActive ? '#ff00ff' : 'rgba(60,100,150,0.5)',
              letterSpacing: '0.2em',
              fontWeight: 900,
            }}>
              AFTERNOON STASIS
            </span>
          </div>

          {stasisActive ? (
            <>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 22,
                fontWeight: 900,
                color: '#ff00ff',
                textShadow: '0 0 12px #ff00ff',
                marginBottom: 4,
              }}>
                {formatCountdown(stasisRemain)}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(120,60,120,0.6)', marginBottom: 8 }}>
                Resonance frozen. Return at exactly 0:00 for Wake Synergy.
              </div>
              <button
                onClick={endStasis}
                style={{
                  width: '100%',
                  padding: '5px 0',
                  background: 'rgba(255,0,255,0.1)',
                  border: '1px solid rgba(255,0,255,0.4)',
                  color: '#ff00ff',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                }}
              >
                ▶ RESUME OPERATIONS
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(80,120,160,0.5)', marginBottom: 8 }}>
                2-hour stasis. Return at exactly 0:00 for 1.2× synergy.
              </div>
              <button
                onClick={startStasis}
                style={{
                  width: '100%',
                  padding: '5px 0',
                  background: 'rgba(255,0,255,0.06)',
                  border: '1px solid rgba(255,0,255,0.25)',
                  color: 'rgba(255,0,255,0.6)',
                  fontFamily: 'monospace',
                  fontSize: 9,
                  cursor: 'pointer',
                  letterSpacing: '0.15em',
                }}
              >
                ENTER STASIS
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 10 — MAIN EXPORT: NeuralSanctum Component
// ─────────────────────────────────────────────────────────────────────
export default function NeuralSanctum({ sanctum, resonanceLevel = 0 }) {
  const { sanctumState, calibrated, handleManualSync } = sanctum;

  const calState = getCalibrationState();

  const stateColors = {
    Vibrant:   { primary: '#ffd700', secondary: '#ff6b00', glow: 'rgba(255,215,0,0.2)' },
    Stable:    { primary: '#00f5ff', secondary: '#00ff41', glow: 'rgba(0,245,255,0.15)' },
    Corrupted: { primary: '#888890', secondary: '#ff3333', glow: 'rgba(80,80,90,0.1)'  },
  };

  const colors = stateColors[sanctumState] || stateColors.Stable;

  return (
    <>
      {/* Background particles */}
      <SanctumParticles sanctumState={sanctumState} resonanceLevel={resonanceLevel} />

      {/* Hero's Pulse overlay */}
      <HeroesPulse resonanceLevel={resonanceLevel} />

      {/* Calibration panel */}
      <div style={{
        background: sanctumState === 'Vibrant'
          ? 'linear-gradient(135deg, rgba(20,14,0,0.97), rgba(12,8,0,0.97))'
          : sanctumState === 'Corrupted'
          ? 'linear-gradient(135deg, rgba(12,10,14,0.97), rgba(8,6,10,0.97))'
          : 'linear-gradient(135deg, rgba(6,12,20,0.97), rgba(4,8,14,0.97))',
        border: `1px solid ${colors.primary}30`,
        boxShadow: `0 0 20px ${colors.glow}`,
        padding: '12px 16px',
        transition: 'all 1.5s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div
              animate={sanctumState === 'Vibrant'
                ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }
                : sanctumState === 'Corrupted'
                ? { opacity: [0.4, 0.1, 0.4] }
                : { opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: sanctumState === 'Corrupted' ? 1.2 : 2 }}
            >
              <Activity size={12} color={colors.primary} />
            </motion.div>
            <span style={{
              fontFamily: 'monospace',
              fontSize: 9,
              color: colors.primary,
              letterSpacing: '0.25em',
              fontWeight: 900,
              textShadow: `0 0 8px ${colors.primary}`,
            }}>
              NEURAL SANCTUM — {sanctumState ? `${sanctumState.toUpperCase()} STATE` : 'AWAITING CALIBRATION'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* State badge */}
            {sanctumState && (
              <div style={{
                padding: '3px 10px',
                background: `${colors.primary}15`,
                border: `1px solid ${colors.primary}50`,
                fontFamily: 'monospace',
                fontSize: 8,
                color: colors.primary,
                letterSpacing: '0.15em',
              }}>
                {sanctumState === 'Vibrant'   && '🌟 PERFECT SYNC'}
                {sanctumState === 'Stable'    && '◉ STABLE LINK'}
                {sanctumState === 'Corrupted' && '⚠ CORRUPTED'}
              </div>
            )}

            {/* Manual sync button — show if in window and not calibrated */}
            {(calState === 'perfect_window' || calState === 'late_window') && !calibrated && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleManualSync}
                animate={{
                  boxShadow: [
                    `0 0 10px ${colors.primary}40`,
                    `0 0 24px ${colors.primary}80`,
                    `0 0 10px ${colors.primary}40`,
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                style={{
                  padding: '5px 14px',
                  background: `${colors.primary}18`,
                  border: `1px solid ${colors.primary}60`,
                  color: colors.primary,
                  fontFamily: 'monospace',
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                }}
              >
                <Wifi size={10} style={{ display: 'inline', marginRight: 5 }} />
                {calState === 'perfect_window' ? '⚡ PERFECT SYNC' : 'SYNC NOW'}
              </motion.button>
            )}

            {/* Late warning */}
            {calState === 'post_window' && !calibrated && (
              <div style={{
                fontFamily: 'monospace',
                fontSize: 8,
                color: '#ff3333',
                letterSpacing: '0.1em',
              }}>
                ⚠ SYNC WINDOW CLOSED
              </div>
            )}

            {/* Pending window indicator */}
            {calState === 'pending' && (
              <div style={{
                fontFamily: 'monospace',
                fontSize: 8,
                color: 'rgba(100,140,180,0.5)',
                letterSpacing: '0.1em',
              }}>
                WINDOW OPENS 08:55
              </div>
            )}
          </div>
        </div>

        {/* Corrupted state — ECHO exhausted message */}
        {sanctumState === 'Corrupted' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ overflow: 'hidden', marginTop: 8 }}
          >
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255,50,50,0.06)',
              border: '1px solid rgba(255,50,50,0.2)',
              fontFamily: 'monospace',
              fontSize: 9,
              color: 'rgba(180,100,100,0.7)',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}>
              "...signal degraded... I waited... where were you..."
              <span style={{ color: 'rgba(120,60,60,0.5)', marginLeft: 8 }}>— ECHO [EXHAUSTED]</span>
            </div>
          </motion.div>
        )}

        {/* Vibrant state — golden particles indicator */}
        {sanctumState === 'Vibrant' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ overflow: 'hidden', marginTop: 8 }}
          >
            <div style={{
              padding: '6px 12px',
              background: 'rgba(255,215,0,0.06)',
              border: '1px solid rgba(255,215,0,0.2)',
              fontFamily: 'monospace',
              fontSize: 9,
              color: 'rgba(255,215,0,0.7)',
              fontStyle: 'italic',
            }}>
              "Perfect timing. The garden is alive. The signal is pristine."
              <span style={{ color: 'rgba(200,160,0,0.5)', marginLeft: 8 }}>— ECHO</span>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
