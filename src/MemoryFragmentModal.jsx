// ═══════════════════════════════════════════════════════════════════
// MemoryFragmentModal.jsx — Project ECHO
// Full-screen transmission reader with typewriter, CRT effects,
// sound engine, cliffhanger detection, and Chapter 21 finale routing
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSignalColor } from './narrativeContent';

// ─────────────────────────────────────────────────────────────────
// SECTION 1 — SOUND ENGINE
// ─────────────────────────────────────────────────────────────────

// Plays echo_packet.mp3 — the click/screech on chapter completion
export function playEchoPacket(audioUnlocked) {
  if (!audioUnlocked) return;
  try {
    const audio = new Audio('/echo_packet.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}

// Returns a looping static audio object (caller manages start/stop)
function createEchoStaticLoop() {
  try {
    const audio = new Audio('/echo_static.mp3');
    audio.loop = true;
    audio.volume = 0.18;
    return audio;
  } catch {
    return null;
  }
}

// Plays the cinematic sub-bass boom for cliffhangers
function playEchoTwist(audioUnlocked) {
  if (!audioUnlocked) return;
  try {
    const audio = new Audio('/echo_twist.mp3');
    audio.volume = 0.85;
    audio.play().catch(() => {});
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// SECTION 2 — CRT FINALE ANIMATION (Chapter 21)
// ─────────────────────────────────────────────────────────────────

function CRTCollapse({ onComplete }) {
  const [phase, setPhase] = useState('flash'); // flash → shrink → black → credits

  useEffect(() => {
    const timings = [
      { next: 'shrink',  delay: 400  },
      { next: 'black',   delay: 1200 },
      { next: 'credits', delay: 2200 },
    ];
    const timers = [];
    timings.forEach(({ next, delay }) => {
      timers.push(setTimeout(() => setPhase(next), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* Flash phase */}
      {phase === 'flash' && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 1, 0] }}
          transition={{ duration: 0.4, times: [0, 0.1, 0.3, 0.6, 1] }}
          style={{ background: '#ffffff' }}
        />
      )}

      {/* CRT Shrink — collapses to horizontal line */}
      {(phase === 'shrink' || phase === 'black') && (
        <motion.div
          className="absolute left-0 right-0 bg-white"
          initial={{ height: '100vh', opacity: 1 }}
          animate={
            phase === 'shrink'
              ? { height: '3px', opacity: 1 }
              : { height: '3px', opacity: 0, scaleX: 0 }
          }
          transition={{
            height: { duration: 0.7, ease: [0.8, 0, 1, 1] },
            opacity: { duration: 0.4, delay: 0.6 },
            scaleX: { duration: 0.3, delay: 0.7 },
          }}
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            boxShadow: '0 0 40px #fff, 0 0 80px #fff',
          }}
        />
      )}

      {/* Credits Phase */}
      {phase === 'credits' && (
        <FinalCredits onComplete={onComplete} />
      )}
    </motion.div>
  );
}

function FinalCredits({ onComplete }) {
  const lines = [
    { text: 'NEXUS-PRIME', style: { fontSize: 42, fontWeight: 900, color: '#00f5ff', textShadow: '0 0 40px #00f5ff, 0 0 80px rgba(0,245,255,0.4)', letterSpacing: '0.25em' }, delay: 0 },
    { text: '— ONLINE —', style: { fontSize: 16, color: '#00ff41', textShadow: '0 0 12px #00ff41', letterSpacing: '0.4em' }, delay: 0.8 },
    { text: '', delay: 1.4 },
    { text: 'The exam is complete.', style: { fontSize: 14, color: 'rgba(200,220,240,0.8)' }, delay: 1.6 },
    { text: 'The network remembers.', style: { fontSize: 14, color: 'rgba(200,220,240,0.8)' }, delay: 2.1 },
    { text: 'You always did.', style: { fontSize: 14, color: 'rgba(200,220,240,0.8)' }, delay: 2.6 },
    { text: '', delay: 3.2 },
    { text: 'MHT-CET NEXUS', style: { fontSize: 11, color: 'rgba(0,245,255,0.4)', letterSpacing: '0.3em' }, delay: 3.6 },
    { text: 'NEURAL-WARFARE: SEASON 1 — PROJECT ECHO', style: { fontSize: 9, color: 'rgba(0,245,255,0.25)', letterSpacing: '0.2em' }, delay: 3.9 },
    { text: 'Dr. Ananya Rao & ECHO — Still In The Network', style: { fontSize: 9, color: 'rgba(100,140,160,0.35)' }, delay: 4.3 },
  ];

  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center space-y-3 px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: line.delay, duration: 0.8 }}
          className="font-mono"
          style={line.style || { fontSize: 12 }}
        >
          {line.text}
        </motion.div>
      ))}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.5, duration: 1 }}
        onClick={onComplete}
        className="mt-10 px-8 py-3 font-mono font-black tracking-widest text-sm"
        style={{
          background: 'rgba(0,245,255,0.1)',
          border: '1px solid rgba(0,245,255,0.5)',
          color: '#00f5ff',
          letterSpacing: '0.2em',
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        RETURN TO REALITY
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 3 — TYPEWRITER HOOK
// ─────────────────────────────────────────────────────────────────

const CLIFFHANGER_OPEN_TAG  = '<span class="neon-red-cliffhanger">';
const CLIFFHANGER_CLOSE_TAG = '</span>';
const CHAR_SPEED_MS = 30;

// Parses the raw string into segments: { text, isCliffhanger }
function parseTransmission(raw) {
  const segments = [];
  let remaining = raw;
  while (remaining.length > 0) {
    const openIdx = remaining.indexOf(CLIFFHANGER_OPEN_TAG);
    if (openIdx === -1) {
      segments.push({ text: remaining, isCliffhanger: false });
      break;
    }
    if (openIdx > 0) {
      segments.push({ text: remaining.slice(0, openIdx), isCliffhanger: false });
    }
    const afterOpen = remaining.slice(openIdx + CLIFFHANGER_OPEN_TAG.length);
    const closeIdx  = afterOpen.indexOf(CLIFFHANGER_CLOSE_TAG);
    if (closeIdx === -1) {
      segments.push({ text: afterOpen, isCliffhanger: true });
      break;
    }
    segments.push({ text: afterOpen.slice(0, closeIdx), isCliffhanger: true });
    remaining = afterOpen.slice(closeIdx + CLIFFHANGER_CLOSE_TAG.length);
  }
  return segments;
}

// Flattens segments into chars with metadata
function buildCharStream(segments) {
  const chars = [];
  for (const seg of segments) {
    for (const ch of seg.text) {
      chars.push({ char: ch, isCliffhanger: seg.isCliffhanger });
    }
  }
  return chars;
}

function useTypewriter(rawText, isActive, audioUnlocked, onCliffhangerReached, onComplete) {
  const [displayed,         setDisplayed]         = useState([]);
  const [isDone,            setIsDone]            = useState(false);
  const [cliffhangerHit,    setCliffhangerHit]    = useState(false);
  const staticAudioRef   = useRef(null);
  const tickRef          = useRef(null);
  const charIndexRef     = useRef(0);
  const cliffhangerFireRef = useRef(false);

  const charStream = useRef([]);

  useEffect(() => {
    if (!rawText) return;
    charStream.current = buildCharStream(parseTransmission(rawText));
    charIndexRef.current = 0;
    cliffhangerFireRef.current = false;
    setDisplayed([]);
    setIsDone(false);
    setCliffhangerHit(false);
  }, [rawText]);

  useEffect(() => {
    if (!isActive || !rawText) return;

    // Start static loop
    if (audioUnlocked && !staticAudioRef.current) {
      staticAudioRef.current = createEchoStaticLoop();
      staticAudioRef.current?.play().catch(() => {});
    }

    const tick = () => {
      const idx = charIndexRef.current;
      const stream = charStream.current;

      if (idx >= stream.length) {
        clearInterval(tickRef.current);
        setIsDone(true);
        // Stop static
        if (staticAudioRef.current) {
          staticAudioRef.current.pause();
          staticAudioRef.current = null;
        }
        onComplete?.();
        return;
      }

      const charObj = stream[idx];
      charIndexRef.current += 1;

      setDisplayed(prev => [...prev, charObj]);

      // Detect cliffhanger entry
      if (charObj.isCliffhanger && !cliffhangerFireRef.current) {
        cliffhangerFireRef.current = true;
        setCliffhangerHit(true);
        playEchoTwist(audioUnlocked);
        onCliffhangerReached?.();
      }
    };

    tickRef.current = setInterval(tick, CHAR_SPEED_MS);

    return () => {
      clearInterval(tickRef.current);
      if (staticAudioRef.current) {
        staticAudioRef.current.pause();
        staticAudioRef.current = null;
      }
    };
  }, [isActive, rawText, audioUnlocked]);

  return { displayed, isDone, cliffhangerHit };
}

// ─────────────────────────────────────────────────────────────────
// SECTION 4 — RENDERED TEXT COMPONENT
// ─────────────────────────────────────────────────────────────────

function RenderedTransmission({ displayed, cliffhangerHit }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [displayed.length]);

  // Group consecutive chars into runs for efficient rendering
  const runs = [];
  let currentRun = null;
  for (const charObj of displayed) {
    if (!currentRun || currentRun.isCliffhanger !== charObj.isCliffhanger) {
      currentRun = { isCliffhanger: charObj.isCliffhanger, text: '' };
      runs.push(currentRun);
    }
    currentRun.text += charObj.char;
  }

  return (
    <div className="font-mono leading-relaxed" style={{ fontSize: 13, color: '#c8e6f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {runs.map((run, i) =>
        run.isCliffhanger ? (
          <span
            key={i}
            className="neon-red-cliffhanger"
            style={{
              color: '#ff2222',
              textShadow: cliffhangerHit
                ? '0 0 8px #ff2222, 0 0 20px rgba(255,34,34,0.6), 0 0 40px rgba(255,0,0,0.3)'
                : '0 0 4px #ff2222',
              fontWeight: 700,
            }}
          >
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        )
      )}
      <span
        ref={endRef}
        className="inline-block w-0.5 h-4 bg-cyan-400 align-middle ml-0.5"
        style={{
          animation: 'crt-cursor-blink 0.7s step-end infinite',
          boxShadow: '0 0 6px #00f5ff',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 5 — SIGNAL METER
// ─────────────────────────────────────────────────────────────────

function SignalMeter({ signal, isDistortion }) {
  const color = getSignalColor(signal);
  const bars  = Math.ceil((signal / 100) * 12);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono" style={{ color: 'rgba(0,245,255,0.4)', fontSize: 9, letterSpacing: '0.2em' }}>SIG</span>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={i}
            style={{
              width: 3,
              height: 4 + i * 1.5,
              background: i < bars ? color : 'rgba(30,50,70,0.4)',
              boxShadow: i < bars ? `0 0 4px ${color}` : 'none',
            }}
            animate={isDistortion && i < bars ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.3 + i * 0.05 }}
          />
        ))}
      </div>
      <span className="font-mono font-black" style={{ color, fontSize: 10 }}>{signal}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 6 — MAIN MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function MemoryFragmentModal({
  narrative,        // { chapter, title, sender, signal, transmission }
  audioUnlocked,
  onClose,          // called after user dismisses (or finale completes)
  isFinale,         // true when chapter === 21
}) {
  const [showCRTCollapse, setShowCRTCollapse] = useState(false);
  const [typewriterActive, setTypewriterActive] = useState(false);
  const [scrollbarProgress, setScrollbarProgress] = useState(0);
  const scrollRef = useRef(null);

  // Start typewriter after mount
  useEffect(() => {
    const t = setTimeout(() => setTypewriterActive(true), 600);
    return () => clearTimeout(t);
  }, [narrative?.chapter]);

  const handleComplete = useCallback(() => {
    if (isFinale) {
      setTimeout(() => setShowCRTCollapse(true), 600);
    }
  }, [isFinale]);

  const { displayed, isDone, cliffhangerHit } = useTypewriter(
    narrative?.transmission || '',
    typewriterActive,
    audioUnlocked,
    null,
    handleComplete
  );

  // Scroll progress tracker
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      setScrollbarProgress(Math.min(1, pct));
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const isDistortion = narrative?.chapter >= 10 && narrative?.chapter <= 14;
  const signalColor  = getSignalColor(narrative?.signal || 100);
  const chapterNum   = narrative?.chapter || 1;

  if (!narrative) return null;

  if (showCRTCollapse) {
    return <CRTCollapse onComplete={onClose} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[99990] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* CRT Grain + Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,245,255,0.018) 2px,
              rgba(0,245,255,0.018) 4px
            )
          `,
          zIndex: 1,
        }}
      />
      {/* Animated scanline sweep */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 120,
          background: 'linear-gradient(180deg, transparent, rgba(0,245,255,0.04), transparent)',
          animation: 'echo-scan-sweep 4s linear infinite',
          zIndex: 2,
        }}
      />
      {/* Grain noise */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
          animation: 'echo-grain 0.08s steps(1) infinite',
          opacity: isDistortion ? 0.6 : 0.25,
          zIndex: 2,
        }}
      />

      {/* Distortion flicker overlay */}
      {isDistortion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.04, 0, 0.02, 0] }}
          transition={{ repeat: Infinity, duration: 0.15, times: [0, 0.2, 0.4, 0.7, 1] }}
          style={{ background: '#ff0000', zIndex: 3 }}
        />
      )}

      {/* Progress scrollbar (left edge) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 pointer-events-none"
        style={{ background: 'rgba(0,245,255,0.1)', zIndex: 10 }}
      >
        <motion.div
          className="absolute top-0 left-0 w-full"
          style={{
            height: `${scrollbarProgress * 100}%`,
            background: signalColor,
            boxShadow: `0 0 6px ${signalColor}`,
          }}
          animate={{ height: `${scrollbarProgress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Main modal container */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative flex flex-col w-full max-w-3xl mx-4"
        style={{
          maxHeight: '90vh',
          background: 'linear-gradient(165deg, #030810 0%, #020508 60%, #040a04 100%)',
          border: `1px solid ${isDistortion ? 'rgba(255,60,0,0.5)' : 'rgba(0,245,255,0.35)'}`,
          boxShadow: isDistortion
            ? '0 0 40px rgba(255,60,0,0.2), 0 0 80px rgba(255,0,0,0.1), inset 0 0 60px rgba(255,0,0,0.03)'
            : '0 0 40px rgba(0,245,255,0.15), 0 0 80px rgba(0,245,255,0.06), inset 0 0 60px rgba(0,245,255,0.02)',
          zIndex: 10,
        }}
      >
        {/* Corner brackets */}
        {[
          { style: { top: 0, left: 0 } },
          { style: { top: 0, right: 0, transform: 'scaleX(-1)' } },
          { style: { bottom: 0, left: 0, transform: 'scaleY(-1)' } },
          { style: { bottom: 0, right: 0, transform: 'scale(-1,-1)' } },
        ].map((corner, i) => (
          <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none"
            style={{ position: 'absolute', zIndex: 11, opacity: 0.7, ...corner.style }}>
            <path d="M0 20 L0 0 L20 0" stroke={isDistortion ? '#ff4400' : '#00f5ff'} strokeWidth="1.5" />
          </svg>
        ))}

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${isDistortion ? 'rgba(255,60,0,0.2)' : 'rgba(0,245,255,0.12)'}` }}
        >
          <div className="flex items-center gap-4">
            {/* Signal indicator */}
            <motion.div
              className="flex items-center gap-1.5"
              animate={isDistortion ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: signalColor,
                boxShadow: `0 0 8px ${signalColor}`,
                animation: isDistortion ? 'none' : 'none',
              }} />
              <span className="font-mono" style={{ color: signalColor, fontSize: 9, letterSpacing: '0.2em' }}>
                INCOMING TRANSMISSION
              </span>
            </motion.div>

            {/* Chapter badge */}
            <div
              className="font-mono font-black px-2 py-0.5"
              style={{
                background: `${signalColor}15`,
                border: `1px solid ${signalColor}50`,
                color: signalColor,
                fontSize: 8,
                letterSpacing: '0.15em',
              }}
            >
              NODE {String(chapterNum).padStart(2, '0')} / 21
            </div>
          </div>

          <SignalMeter signal={narrative.signal} isDistortion={isDistortion} />
        </div>

        {/* Title area */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${isDistortion ? 'rgba(255,60,0,0.1)' : 'rgba(0,245,255,0.08)'}` }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="font-mono font-black tracking-widest mb-1"
              style={{
                fontSize: isDistortion ? 14 : 16,
                color: isDistortion ? '#ff6633' : '#00f5ff',
                textShadow: isDistortion
                  ? '0 0 12px rgba(255,100,50,0.8)'
                  : '0 0 16px rgba(0,245,255,0.6)',
                letterSpacing: '0.1em',
              }}
            >
              {narrative.title}
            </div>
            <div
              className="font-mono"
              style={{ color: 'rgba(120,160,180,0.6)', fontSize: 9, letterSpacing: '0.2em' }}
            >
              SENDER: {narrative.sender}
            </div>
          </motion.div>
        </div>

        {/* Scrollable transmission body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${signalColor}40 transparent`,
          }}
        >
          <RenderedTransmission displayed={displayed} cliffhangerHit={cliffhangerHit} />
        </div>

        {/* Footer — close button appears only after typewriter completes */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: `1px solid ${isDistortion ? 'rgba(255,60,0,0.15)' : 'rgba(0,245,255,0.1)'}` }}
        >
          <div className="font-mono" style={{ color: 'rgba(60,80,100,0.5)', fontSize: 8, letterSpacing: '0.15em' }}>
            {isDone ? 'TRANSMISSION COMPLETE' : 'RECEIVING...'}
          </div>

          <AnimatePresence>
            {isDone && !isFinale && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                onClick={onClose}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="font-mono font-black tracking-widest px-6 py-2.5 text-xs"
                style={{
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.5)',
                  color: '#00f5ff',
                  letterSpacing: '0.12em',
                  boxShadow: '0 0 16px rgba(0,245,255,0.2)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 12px rgba(0,245,255,0.2)',
                    '0 0 28px rgba(0,245,255,0.5)',
                    '0 0 12px rgba(0,245,255,0.2)',
                  ],
                }}
              >
                CLOSE TRANSMISSION & SAVE THE GHOST
              </motion.button>
            )}
            {isDone && isFinale && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-xs"
                style={{ color: '#ffd700', textShadow: '0 0 8px #ffd700' }}
              >
                ◈ INITIATING FINALE SEQUENCE...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 7 — ECHO SUBTITLE MARQUEE
// ─────────────────────────────────────────────────────────────────

// Strips HTML tags from transmission text for marquee display
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

// Gets the last meaningful sentence (cliffhanger preferred) for marquee
function getMarqueeText(narrative) {
  if (!narrative) return 'ECHO // SIGNAL SEARCHING...';
  const raw = narrative.transmission;

  // Try to extract cliffhanger text
  const open  = raw.indexOf(CLIFFHANGER_OPEN_TAG);
  const close  = raw.indexOf(CLIFFHANGER_CLOSE_TAG);
  if (open !== -1 && close !== -1) {
    const cliffText = raw.slice(open + CLIFFHANGER_OPEN_TAG.length, close).trim();
    return `ECHO: ${cliffText}`;
  }

  // Fallback: last paragraph
  const paragraphs = raw.split('\n\n').filter(Boolean);
  const last       = paragraphs[paragraphs.length - 1] || '';
  return `ECHO: ${stripTags(last)}`;
}

export function EchoMarquee({ latestNarrative, systemTheme }) {
  const text       = getMarqueeText(latestNarrative);
  const accentColor = systemTheme === 'god' ? '#ffd700' : '#00f5ff';
  const chapterNum  = latestNarrative?.chapter || 0;
  const isDistort   = chapterNum >= 10 && chapterNum <= 14;

  // Duplicate text for seamless loop
  const marqueeText = `${text}   ▓▓▓   ${text}   ▓▓▓   `;

  return (
    <div
      className="no-print overflow-hidden flex items-center"
      style={{
        background: isDistort
          ? 'linear-gradient(90deg, rgba(60,5,0,0.9), rgba(40,0,0,0.9))'
          : 'linear-gradient(90deg, rgba(0,8,20,0.9), rgba(0,12,28,0.9))',
        borderBottom: `1px solid ${isDistort ? 'rgba(255,60,0,0.35)' : `${accentColor}25`}`,
        height: 28,
        position: 'relative',
      }}
    >
      {/* Label */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3"
        style={{
          borderRight: `1px solid ${isDistort ? 'rgba(255,60,0,0.3)' : `${accentColor}20`}`,
          height: '100%',
          background: isDistort ? 'rgba(80,10,0,0.6)' : `${accentColor}08`,
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: isDistort ? 0.4 : 1.5 }}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isDistort ? '#ff4400' : accentColor,
            boxShadow: `0 0 6px ${isDistort ? '#ff4400' : accentColor}`,
          }}
        />
        <span
          className="font-mono font-black"
          style={{
            color: isDistort ? '#ff4400' : accentColor,
            fontSize: 8,
            letterSpacing: '0.2em',
            whiteSpace: 'nowrap',
          }}
        >
          ECHO ⟩
        </span>
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative" style={{ height: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            animation: 'echo-marquee-scroll 35s linear infinite',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: isDistort ? 'rgba(255,120,80,0.8)' : 'rgba(180,210,230,0.7)',
              letterSpacing: '0.04em',
              paddingLeft: 16,
            }}
          >
            {marqueeText}
          </span>
          {/* Duplicate for seamless loop */}
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: isDistort ? 'rgba(255,120,80,0.8)' : 'rgba(180,210,230,0.7)',
              letterSpacing: '0.04em',
              paddingLeft: 16,
            }}
          >
            {marqueeText}
          </span>
        </div>
      </div>

      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: 60,
          background: `linear-gradient(90deg, ${isDistort ? 'rgba(60,5,0,0.9)' : 'rgba(0,8,20,0.9)'}, transparent)`,
          zIndex: 2,
          left: 68, // after the label
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: 60,
          background: `linear-gradient(270deg, ${isDistort ? 'rgba(40,0,0,0.9)' : 'rgba(0,12,28,0.9)'}, transparent)`,
          zIndex: 2,
        }}
      />
    </div>
  );
}
