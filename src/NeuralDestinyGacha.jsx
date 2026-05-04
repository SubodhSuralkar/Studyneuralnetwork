// ═══════════════════════════════════════════════════════════════════
// NEURAL DESTINY GACHA SYSTEM
// File: NeuralDestinyGacha.jsx
// ═══════════════════════════════════════════════════════════════════
//
// HOW TO INTEGRATE — READ THIS FIRST
// ═══════════════════════════════════════════════════════════════════
//
// STEP 1: Add this ENTIRE file to your project (same folder as App.jsx)
//
// STEP 2: In App.jsx, at the top with the other imports, add:
//   import NeuralDestinyGacha, { GachaStatusIcon } from './NeuralDestinyGacha';
//
// STEP 3: Inside the App() component, add this state (anywhere near other useState lines):
//   const [gachaRefresh, setGachaRefresh] = useState(0);
//
// STEP 4: Inside the JSX return, INSIDE the <div className={containerClasses}> block,
//   right AFTER the <AnimatePresence> block that contains <DailyReward>,
//   add this:
//
//   <NeuralDestinyGacha onPull={() => setGachaRefresh(r => r + 1)} />
//
// STEP 5: In the HEADER section, find the <div className="flex items-center gap-3 flex-wrap justify-end">
//   that contains SystemIntegrityBar. Add the status icon AFTER SystemIntegrityBar:
//
//   <GachaStatusIcon key={gachaRefresh} />
//
// That's it. The component self-manages all state via localStorage.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── LORE FRAGMENTS — 6-DAY STORY ────────────────────────────────────
const LORE_FRAGMENTS = [
  {
    day: 1,
    title: 'Echoes',
    prize: 'Audio Transcript',
    content: '"We tried to stop the clock once. We failed. You are the only Pilot left with the Neural capacity to finish the syllabus."',
    icon: '📻',
  },
  {
    day: 2,
    title: 'The Identity',
    prize: 'Encrypted Image',
    content: 'A blurry silhouette of the Ghost. It looks suspiciously like your own reflection.',
    icon: '👤',
  },
  {
    day: 3,
    title: 'The Architect',
    prize: 'Secret Note',
    content: '"The exam isn\'t the end. It\'s the gateway. Total mastery of the 17 sectors is the only key."',
    icon: '📜',
  },
  {
    day: 4,
    title: 'The Virus',
    prize: 'System Alert',
    content: '"The Ghost has corrupted the Math sector. Integrity is at 40%. Pull the Gacha for a Shield or face decay."',
    icon: '☣',
  },
  {
    day: 5,
    title: 'The Final Code',
    prize: 'Final Warning',
    content: '"Tomorrow the Rift closes forever. The Ghost is at your heels. Upload your knowledge now."',
    icon: '⚠',
  },
  {
    day: 6,
    title: 'Ascension',
    prize: 'The Finale',
    content: '"Neural Link 100%. The Ghost has been integrated. You are no longer the student; you are the System."',
    icon: '⚡',
  },
];

// ── BUFF POOL — 6 DESTINY BUFFS ─────────────────────────────────────
export const DESTINY_BUFFS = [
  {
    id: 'ghost_freeze',
    name: 'Ghost Freeze',
    desc: 'Pauses the Ghost\'s pace for 2 hours. No debt accumulates while frozen.',
    rarity: 'Legendary',
    color: '#00f5ff',
    glow: 'rgba(0,245,255,0.6)',
    bg: 'rgba(0,245,255,0.08)',
    border: 'rgba(0,245,255,0.5)',
    icon: '❄',
    durationHours: 2,
    effect: 'ghost_freeze',
  },
  {
    id: 'neural_overclock',
    name: 'Neural Overclock',
    desc: 'All XP earned tripled for the next 90 minutes. Maximum cognitive output.',
    rarity: 'Legendary',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.6)',
    bg: 'rgba(255,215,0,0.08)',
    border: 'rgba(255,215,0,0.5)',
    icon: '⚡',
    durationHours: 1.5,
    effect: 'xp_triple',
  },
  {
    id: 'void_shield',
    name: 'Void Shield',
    desc: 'System Integrity locked at current value for 3 hours. No decay.',
    rarity: 'Rare',
    color: '#b44fff',
    glow: 'rgba(180,79,255,0.6)',
    bg: 'rgba(180,79,255,0.08)',
    border: 'rgba(180,79,255,0.5)',
    icon: '🛡',
    durationHours: 3,
    effect: 'integrity_shield',
  },
  {
    id: 'lore_insight',
    name: 'Lore Insight',
    desc: 'Unlocks the secret story fragment for today. The Ghost reveals itself.',
    rarity: 'Rare',
    color: '#ff6b00',
    glow: 'rgba(255,107,0,0.6)',
    bg: 'rgba(255,107,0,0.08)',
    border: 'rgba(255,107,0,0.5)',
    icon: '📖',
    durationHours: 0,
    effect: 'lore_unlock',
  },
  {
    id: 'stabilizer',
    name: 'The Stabilizer',
    desc: 'Restores System Integrity to 100% instantly. Full neural reset.',
    rarity: 'Common',
    color: '#00ff41',
    glow: 'rgba(0,255,65,0.6)',
    bg: 'rgba(0,255,65,0.08)',
    border: 'rgba(0,255,65,0.5)',
    icon: '💊',
    durationHours: 0,
    effect: 'integrity_restore',
  },
  {
    id: 'ghost_siphon',
    name: 'Ghost Siphon',
    desc: 'Siphons 2 chapters from the Ghost\'s count. You gain ground instantly.',
    rarity: 'Common',
    color: '#ff00ff',
    glow: 'rgba(255,0,255,0.6)',
    bg: 'rgba(255,0,255,0.08)',
    border: 'rgba(255,0,255,0.5)',
    icon: '🔮',
    durationHours: 0,
    effect: 'ghost_siphon',
  },
];

// Rarity weights: Legendary = 15%, Rare = 35%, Common = 50%
const RARITY_WEIGHTS = { Legendary: 15, Rare: 35, Common: 50 };

function drawDestiny() {
  const roll = Math.random() * 100;
  let legendary = DESTINY_BUFFS.filter(b => b.rarity === 'Legendary');
  let rare = DESTINY_BUFFS.filter(b => b.rarity === 'Rare');
  let common = DESTINY_BUFFS.filter(b => b.rarity === 'Common');
  let pool;
  if (roll < RARITY_WEIGHTS.Legendary) pool = legendary;
  else if (roll < RARITY_WEIGHTS.Legendary + RARITY_WEIGHTS.Rare) pool = rare;
  else pool = common;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── LOCAL STORAGE HELPERS ────────────────────────────────────────────
const GLS = {
  get: (k, d) => { try { const r = localStorage.getItem(k); return r !== null ? JSON.parse(r) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function getGameDay() {
  const now = new Date();
  if (now.getHours() < 6) { const y = new Date(now); y.setDate(y.getDate()-1); return y.toISOString().slice(0,10); }
  return now.toISOString().slice(0,10);
}

function isRiftOpen() {
  const now = new Date();
  const h = now.getHours();
  return h >= 9 && h < 10; // 09:00 – 10:00
}

function hasPulledToday() {
  return GLS.get('gacha_last_pull_day', null) === getGameDay();
}

function getActiveBuff() {
  const buff = GLS.get('gacha_active_buff', null);
  const exp  = GLS.get('gacha_buff_expiry', 0);
  if (!buff) return null;
  if (exp > 0 && Date.now() > exp) { GLS.set('gacha_active_buff', null); return null; }
  return buff;
}

function getUnlockedLore() {
  return GLS.get('gacha_lore_unlocked', []);
}

function getMissedDays() {
  return GLS.get('gacha_missed_days', []);
}

// ── AUDIO ────────────────────────────────────────────────────────────
function playGachaReveal() {
  try {
    const audio = new Audio('/gacha-reveal.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
  // Fallback synth sound if file missing
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [[220,0,0.1],[440,0.08,0.12],[880,0.18,0.15],[1760,0.32,0.3],[880,0.55,0.5]];
    notes.forEach(([freq, t, dur]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + dur);
    });
  } catch {}
}

// ── PARTICLE BURST ────────────────────────────────────────────────────
function ParticleBurst({ color }) {
  const PARTICLES = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360;
    const dist  = 60 + Math.random() * 80;
    const size  = 3 + Math.random() * 5;
    return { angle, dist, size, delay: Math.random() * 0.2 };
  });
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          animate={{
            opacity: 0, scale: 0,
            x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
            y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            marginLeft: -p.size / 2, marginTop: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
}

// ── DESTINY CARD ──────────────────────────────────────────────────────
function DestinyCard({ buff, isFlipped, onFlipDone }) {
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (isFlipped) { setTimeout(() => setShowParticles(true), 400); }
  }, [isFlipped]);

  const RARITY_LABELS = { Legendary: '✦ LEGENDARY ✦', Rare: '◆ RARE', Common: '● COMMON' };
  const RARITY_SIZES  = { Legendary: 11, Rare: 10, Common: 9 };

  return (
    <div style={{ perspective: '1000px', width: 260, height: 360, position: 'relative', margin: '0 auto' }}>
      {/* CARD FLIP CONTAINER */}
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        onAnimationComplete={() => { if (isFlipped && onFlipDone) onFlipDone(); }}
        style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
      >
        {/* CARD BACK */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #050a1a, #0a0518)',
          border: '2px solid rgba(100,0,200,0.5)',
          boxShadow: '0 0 30px rgba(100,0,200,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: 48, marginBottom: 12 }}
          >⟁</motion.div>
          <div style={{ fontFamily: 'monospace', color: 'rgba(100,0,200,0.7)', fontSize: 9, letterSpacing: '0.3em', textAlign: 'center' }}>
            NEURAL DESTINY<br />SEALED
          </div>
          {/* Corner decorations */}
          {['0 0 0 0', 'calc(100% - 24px) 0 0 0', '0 calc(100% - 24px) 0 0', 'calc(100% - 24px) calc(100% - 24px) 0 0'].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', top: `${i < 2 ? 8 : 'auto'}px`, bottom: `${i >= 2 ? 8 : 'auto'}px`, left: `${i % 2 === 0 ? 8 : 'auto'}px`, right: `${i % 2 === 1 ? 8 : 'auto'}px`, width: 20, height: 20, border: '1px solid rgba(100,0,200,0.4)', borderRadius: 2 }} />
          ))}
        </div>

        {/* CARD FRONT */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: `linear-gradient(135deg, ${buff?.bg || 'rgba(0,0,0,0.9)'}, #050a14)`,
          border: `2px solid ${buff?.border || 'rgba(100,100,100,0.4)'}`,
          boxShadow: `0 0 40px ${buff?.glow || 'rgba(100,100,100,0.2)'}, inset 0 0 20px ${buff?.bg || 'rgba(0,0,0,0)'}`,
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px', overflow: 'hidden',
        }}>
          {showParticles && buff && <ParticleBurst color={buff.color} />}

          {/* Animated background pulse */}
          {buff && (
            <motion.div
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${buff.color}, transparent 70%)`, pointerEvents: 'none' }}
            />
          )}

          {/* Rarity label */}
          {buff && (
            <div style={{ fontFamily: 'monospace', color: buff.color, fontSize: RARITY_SIZES[buff.rarity], letterSpacing: '0.2em', fontWeight: 900, textShadow: `0 0 10px ${buff.color}`, marginBottom: 12 }}>
              {RARITY_LABELS[buff.rarity]}
            </div>
          )}

          {/* Icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: 56, marginBottom: 16, filter: `drop-shadow(0 0 12px ${buff?.color || '#fff'})` }}
          >
            {buff?.icon || '?'}
          </motion.div>

          {/* Buff name */}
          <div style={{ fontFamily: 'monospace', color: buff?.color || '#fff', fontSize: 16, fontWeight: 900, letterSpacing: '0.08em', textAlign: 'center', textShadow: `0 0 12px ${buff?.color || '#fff'}`, marginBottom: 10 }}>
            {buff?.name || '???'}
          </div>

          {/* Divider */}
          <div style={{ width: '80%', height: 1, background: `linear-gradient(90deg, transparent, ${buff?.color || '#fff'}, transparent)`, marginBottom: 12, opacity: 0.5 }} />

          {/* Description */}
          <div style={{ fontFamily: 'monospace', color: 'rgba(180,200,220,0.8)', fontSize: 10, textAlign: 'center', lineHeight: 1.6 }}>
            {buff?.desc}
          </div>

          {/* Duration badge */}
          {buff && buff.durationHours > 0 && (
            <div style={{ marginTop: 14, fontFamily: 'monospace', fontSize: 9, color: buff.color, background: buff.bg, border: `1px solid ${buff.border}`, padding: '3px 10px', letterSpacing: '0.15em' }}>
              ⏱ {buff.durationHours}H DURATION
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── LORE FRAGMENT DISPLAY ─────────────────────────────────────────────
function LoreFragmentPanel({ fragments, missed }) {
  const unlocked = getUnlockedLore();
  const today    = getGameDay();

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontFamily: 'monospace', color: 'rgba(100,130,160,0.7)', fontSize: 9, letterSpacing: '0.25em', marginBottom: 10, textAlign: 'center' }}>
        ◈ OPERATION MHT-ASCENSION — LORE ARCHIVE
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {LORE_FRAGMENTS.map((frag, i) => {
          const isUnlocked = unlocked.includes(frag.day);
          const isMissed   = missed.includes(frag.day);
          return (
            <motion.div
              key={frag.day}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                padding: '10px 8px',
                background: isUnlocked
                  ? 'linear-gradient(135deg, rgba(0,245,255,0.06), rgba(0,100,120,0.04))'
                  : isMissed
                  ? 'rgba(40,10,10,0.5)'
                  : 'rgba(10,15,25,0.7)',
                border: `1px solid ${isUnlocked ? 'rgba(0,245,255,0.3)' : isMissed ? 'rgba(100,20,20,0.4)' : 'rgba(30,50,80,0.3)'}`,
                position: 'relative', overflow: 'hidden',
                filter: isMissed ? 'grayscale(0.8)' : 'none',
              }}
            >
              {/* Corrupted data overlay for missed days */}
              {isMissed && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,0,0,0.04) 4px, rgba(255,0,0,0.04) 5px)',
                }} />
              )}

              <div style={{ fontFamily: 'monospace', color: isUnlocked ? '#00f5ff' : isMissed ? '#ff3333' : 'rgba(60,80,100,0.6)', fontSize: 8, letterSpacing: '0.15em', marginBottom: 4 }}>
                DAY {frag.day} {isMissed ? '// CORRUPTED' : isUnlocked ? '// DECODED' : '// SEALED'}
              </div>

              <div style={{ fontSize: isMissed ? 16 : 20, marginBottom: 4, filter: isMissed ? 'grayscale(1) brightness(0.5)' : 'none', textAlign: 'center' }}>
                {isMissed ? '░' : isUnlocked ? frag.icon : '▓'}
              </div>

              <div style={{ fontFamily: 'monospace', color: isUnlocked ? '#e0f0ff' : isMissed ? 'rgba(100,50,50,0.7)' : 'rgba(50,70,90,0.6)', fontSize: 9, fontWeight: isUnlocked ? 700 : 400, textAlign: 'center', letterSpacing: '0.05em' }}>
                {isUnlocked ? frag.title : isMissed ? '???CORRUPTED???' : `Day ${frag.day}`}
              </div>

              {isUnlocked && (
                <div style={{ fontFamily: 'monospace', color: 'rgba(150,180,200,0.6)', fontSize: 7, marginTop: 4, lineHeight: 1.5, textAlign: 'center' }}>
                  {frag.content.slice(0, 60)}...
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── GACHA STATUS ICON (for header) ────────────────────────────────────
export function GachaStatusIcon() {
  const [buff, setBuff] = useState(() => getActiveBuff());
  const [riftOpen, setRiftOpen] = useState(() => isRiftOpen());
  const [pulled, setPulled]     = useState(() => hasPulledToday());

  useEffect(() => {
    const id = setInterval(() => {
      setBuff(getActiveBuff());
      setRiftOpen(isRiftOpen());
      setPulled(hasPulledToday());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (!buff && !riftOpen) return null;

  if (riftOpen && !pulled) {
    return (
      <motion.div
        animate={{ boxShadow: ['0 0 8px rgba(255,215,0,0.4)', '0 0 20px rgba(255,215,0,0.8)', '0 0 8px rgba(255,215,0,0.4)'] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.6)', fontFamily: 'monospace', color: '#ffd700', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }}
      >
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>◆</motion.span>
        RIFT OPEN
      </motion.div>
    );
  }

  if (buff) {
    return (
      <motion.div
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: buff.bg, border: `1px solid ${buff.border}`, fontFamily: 'monospace', color: buff.color, fontSize: 9, fontWeight: 700 }}
        title={`${buff.name}: ${buff.desc}`}
      >
        <span style={{ fontSize: 11 }}>{buff.icon}</span>
        <span style={{ letterSpacing: '0.08em' }}>{buff.name.toUpperCase()}</span>
      </motion.div>
    );
  }
  return null;
}

// ── MAIN GACHA COMPONENT ──────────────────────────────────────────────
export default function NeuralDestinyGacha({ onPull }) {
  const [riftOpen,    setRiftOpen]    = useState(isRiftOpen);
  const [pulled,      setPulled]      = useState(hasPulledToday);
  const [showModal,   setShowModal]   = useState(false);
  const [phase,       setPhase]       = useState('idle'); // idle | flipping | revealed | lore
  const [drawnBuff,   setDrawnBuff]   = useState(null);
  const [isFlipped,   setIsFlipped]   = useState(false);
  const [showLore,    setShowLore]    = useState(false);
  const [missedDays,  setMissedDays]  = useState(getMissedDays);
  const [activeBuff,  setActiveBuff]  = useState(getActiveBuff);
  const timeRef = useRef(null);

  // Track rift open/close every 30s
  useEffect(() => {
    const id = setInterval(() => {
      const nowOpen = isRiftOpen();
      setRiftOpen(nowOpen);

      // If rift just closed and user didn't pull today, mark as missed
      if (!nowOpen && !hasPulledToday()) {
        const today = getGameDay();
        const dayNum = getCurrentLoreDay();
        if (dayNum && !getUnlockedLore().includes(dayNum)) {
          const existing = getMissedDays();
          if (!existing.includes(dayNum)) {
            const next = [...existing, dayNum];
            GLS.set('gacha_missed_days', next);
            setMissedDays(next);
          }
        }
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  function getCurrentLoreDay() {
    // Returns 1-6 based on days since campaign start
    const start = GLS.get('ghost_campaign_start', null) || GLS.get('war_start_date', null);
    if (!start) return 1;
    const elapsed = (Date.now() - start) / 86400000;
    return Math.min(6, Math.max(1, Math.ceil(elapsed)));
  }

  const handleClaimDestiny = () => {
    setShowModal(true);
    setPhase('idle');
    setIsFlipped(false);
    setDrawnBuff(null);
  };

  const handleDraw = () => {
    if (phase !== 'idle') return;
    const buff = drawDestiny();
    setDrawnBuff(buff);
    setPhase('flipping');
    setTimeout(() => setIsFlipped(true), 100);
    playGachaReveal();
  };

  const handleFlipDone = () => {
    if (!isFlipped) return;
    setPhase('revealed');

    // Apply buff effects
    const buff = drawnBuff;
    GLS.set('gacha_last_pull_day', getGameDay());
    GLS.set('gacha_active_buff', buff);
    setPulled(true);

    if (buff.durationHours > 0) {
      GLS.set('gacha_buff_expiry', Date.now() + buff.durationHours * 3600000);
    } else {
      GLS.set('gacha_buff_expiry', 0);
    }

    // Special effect: Lore Insight unlocks today's lore
    if (buff.effect === 'lore_unlock') {
      const dayNum = getCurrentLoreDay();
      const existing = getUnlockedLore();
      if (!existing.includes(dayNum)) {
        GLS.set('gacha_lore_unlocked', [...existing, dayNum]);
      }
    }

    // Special effect: Stabilizer restores integrity
    if (buff.effect === 'integrity_restore') {
      try { localStorage.setItem('system_integrity', '100'); } catch {}
    }

    setActiveBuff(buff);
    if (onPull) onPull(buff);
  };

  const handleClose = () => {
    setShowModal(false);
    setPhase('idle');
    setIsFlipped(false);
    setDrawnBuff(null);
  };

  // Check if rift is currently open
  const canClaim = riftOpen && !pulled;

  // Time until next rift (09:00 AM)
  function getNextRiftTime() {
    const now = new Date();
    const nextRift = new Date(now);
    nextRift.setHours(9, 0, 0, 0);
    if (now.getHours() >= 10) nextRift.setDate(nextRift.getDate() + 1);
    const diffMs = nextRift.getTime() - now.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  // ── RENDER: CLAIM BUTTON ─────────────────────────────────────────
  const ClaimButton = () => (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClaimDestiny}
      animate={{
        boxShadow: [
          '0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,165,0,0.2)',
          '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,165,0,0.4)',
          '0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,165,0,0.2)',
        ],
      }}
      transition={{ repeat: Infinity, duration: 1.8 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 20px',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1))',
        border: '2px solid rgba(255,215,0,0.7)',
        color: '#ffd700',
        fontFamily: 'monospace', fontWeight: 900, fontSize: 11,
        letterSpacing: '0.15em', cursor: 'pointer',
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}
    >
      <motion.span
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ fontSize: 14 }}
      >◆</motion.span>
      CLAIM DESTINY
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        style={{ fontSize: 9, color: 'rgba(255,215,0,0.6)' }}
      >RIFT OPEN</motion.span>
    </motion.button>
  );

  return (
    <>
      {/* ── SECTION: NEURAL DESTINY RIFT ── */}
      <div style={{
        padding: '14px 16px',
        background: canClaim
          ? 'linear-gradient(135deg, rgba(20,14,0,0.97), rgba(12,8,0,0.97))'
          : 'linear-gradient(135deg, rgba(8,10,18,0.95), rgba(5,6,12,0.95))',
        border: `1px solid ${canClaim ? 'rgba(255,215,0,0.4)' : 'rgba(40,60,100,0.3)'}`,
        boxShadow: canClaim ? '0 0 20px rgba(255,215,0,0.1)' : 'none',
        transition: 'all 0.5s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Left: Title + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={canClaim ? { opacity: [1, 0.4, 1], scale: [1, 1.15, 1] } : { opacity: 0.4 }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ fontSize: 18 }}
            >◆</motion.div>
            <div>
              <div style={{ fontFamily: 'monospace', color: canClaim ? '#ffd700' : 'rgba(100,130,160,0.6)', fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textShadow: canClaim ? '0 0 10px #ffd700' : 'none' }}>
                NEURAL DESTINY RIFT
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.12em', marginTop: 2 }}>
                {canClaim ? (
                  <span style={{ color: 'rgba(255,215,0,0.7)' }}>WINDOW: 09:00 – 10:00 • PULL AVAILABLE</span>
                ) : pulled ? (
                  <span style={{ color: 'rgba(0,255,65,0.5)' }}>✓ DESTINY CLAIMED TODAY • {activeBuff ? `ACTIVE: ${activeBuff.name}` : 'BUFF APPLIED'}</span>
                ) : (
                  <span style={{ color: 'rgba(80,100,130,0.5)' }}>RIFT SEALED • NEXT WINDOW: 09:00 AM (IN {getNextRiftTime()})</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Button or status */}
          {canClaim ? (
            <ClaimButton />
          ) : pulled && activeBuff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: activeBuff.bg, border: `1px solid ${activeBuff.border}`, fontFamily: 'monospace', color: activeBuff.color, fontSize: 9 }}>
              <span style={{ fontSize: 12 }}>{activeBuff.icon}</span>
              <span>{activeBuff.name}</span>
              <span style={{ color: 'rgba(100,130,160,0.5)', fontSize: 8 }}>ACTIVE</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(20,30,50,0.4)', border: '1px solid rgba(30,50,80,0.3)', fontFamily: 'monospace', color: 'rgba(60,80,110,0.6)', fontSize: 9 }}>
              ◆ SEALED
            </div>
          )}
        </div>

        {/* Lore toggle */}
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowLore(v => !v)}
            style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(80,120,160,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.15em', padding: 0 }}
          >
            {showLore ? '▲ HIDE LORE ARCHIVE' : '▼ OPERATION MHT-ASCENSION — VIEW LORE'}
          </button>
          <AnimatePresence>
            {showLore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <LoreFragmentPanel missed={missedDays} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MODAL: GACHA DRAW ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99995,
              background: 'rgba(0,0,5,0.95)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={(e) => { if (e.target === e.currentTarget && phase === 'revealed') handleClose(); }}
          >
            {/* Ambient background particles */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: 16 }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -600], opacity: [0, 0.4, 0] }}
                  transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    left: `${Math.random() * 100}%`,
                    bottom: `-${Math.random() * 20}px`,
                    width: 2, height: 2 + Math.random() * 6,
                    background: drawnBuff?.color || '#6600cc',
                    borderRadius: '50%',
                    opacity: 0,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              transition={{ type: 'spring', damping: 22 }}
              style={{
                position: 'relative',
                width: '100%', maxWidth: 400,
                padding: '32px 28px',
                background: 'linear-gradient(135deg, #06020f, #020108)',
                border: `2px solid ${drawnBuff ? drawnBuff.border : 'rgba(100,0,200,0.5)'}`,
                boxShadow: `0 0 60px ${drawnBuff ? drawnBuff.glow : 'rgba(100,0,200,0.3)'}`,
                margin: '0 16px',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: 'monospace', color: drawnBuff?.color || 'rgba(100,0,200,0.8)', fontSize: 9, letterSpacing: '0.3em', marginBottom: 4 }}>
                  ◈ NEURAL DESTINY — RIFT DRAW
                </div>
                <div style={{ fontFamily: 'monospace', color: 'rgba(120,140,180,0.5)', fontSize: 8, letterSpacing: '0.15em' }}>
                  TODAY&apos;S WINDOW: 09:00 – 10:00 AM
                </div>
              </div>

              {/* Card */}
              <DestinyCard
                buff={drawnBuff}
                isFlipped={isFlipped}
                onFlipDone={handleFlipDone}
              />

              {/* Action area */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                {phase === 'idle' && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleDraw}
                    animate={{ boxShadow: ['0 0 16px rgba(255,215,0,0.3)', '0 0 32px rgba(255,215,0,0.7)', '0 0 16px rgba(255,215,0,0.3)'] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{
                      padding: '12px 32px',
                      background: 'rgba(255,215,0,0.12)',
                      border: '2px solid rgba(255,215,0,0.6)',
                      color: '#ffd700',
                      fontFamily: 'monospace', fontWeight: 900,
                      fontSize: 12, letterSpacing: '0.2em',
                      cursor: 'pointer',
                    }}
                  >
                    ◆ DRAW DESTINY
                  </motion.button>
                )}

                {phase === 'flipping' && (
                  <div style={{ fontFamily: 'monospace', color: 'rgba(100,130,180,0.6)', fontSize: 10, letterSpacing: '0.2em' }}>
                    UNLOCKING DESTINY...
                  </div>
                )}

                {phase === 'revealed' && drawnBuff && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ fontFamily: 'monospace', color: drawnBuff.color, fontSize: 11, letterSpacing: '0.12em', marginBottom: 12, textShadow: `0 0 10px ${drawnBuff.color}` }}>
                      ✓ {drawnBuff.name.toUpperCase()} ACQUIRED
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClose}
                      style={{
                        padding: '8px 24px',
                        background: drawnBuff.bg,
                        border: `1px solid ${drawnBuff.border}`,
                        color: drawnBuff.color,
                        fontFamily: 'monospace', fontSize: 10,
                        fontWeight: 900, letterSpacing: '0.15em',
                        cursor: 'pointer',
                      }}
                    >
                      ↩ RETURN TO OPERATIONS
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
