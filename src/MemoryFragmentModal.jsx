/**
 * ═══════════════════════════════════════════════════════════════════
 * MEMORY FRAGMENT MODAL — FIXED VERSION
 * File: MemoryFragmentModal.jsx
 *
 * FIXES APPLIED:
 *  1. Audio: Only chapter_completion.mp3 plays on annihilate.
 *            Background OST continues during modal (cinematic score).
 *  2. Soft-lock: typewriter has definite onComplete → showCloseButton.
 *               15-second fallback forces close button.
 *               Close button z-index: 9999, pointer-events: auto.
 *  3. Marquee: pointer-events: none so it never blocks chapter clicks.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, Wifi, WifiOff } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// AUDIO — simplified: only chapter_completion.mp3
// No echo_packet, echo_static, echo_twist.
// ─────────────────────────────────────────────────────────────────────

// Singleton audio refs — prevents overlap across re-renders
const _audioRefs = {
  completion: null,
};

/**
 * playChapterCompletion
 * Plays chapter_completion.mp3 ONCE on annihilate.
 * Returns the Audio object so callers can let it continue as OST.
 */
export function playChapterCompletion() {
  // Stop any currently playing completion audio
  if (_audioRefs.completion) {
    try {
      _audioRefs.completion.pause();
      _audioRefs.completion.currentTime = 0;
    } catch {}
  }

  try {
    const audio = new Audio('/chapter_completion.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
    _audioRefs.completion = audio;
    return audio;
  } catch {
    return null;
  }
}

/**
 * stopCompletionAudio — call when modal closes to fade out OST.
 */
export function stopCompletionAudio(fadeDurationMs = 2000) {
  const audio = _audioRefs.completion;
  if (!audio) return;
  const step = audio.volume / (fadeDurationMs / 100);
  const id = setInterval(() => {
    if (audio.volume <= step) {
      audio.pause();
      audio.currentTime = 0;
      _audioRefs.completion = null;
      clearInterval(id);
    } else {
      audio.volume = Math.max(0, audio.volume - step);
    }
  }, 100);
}

/**
 * playEchoPacket — NOOP: kept for API compatibility with App.jsx calls.
 * No sound plays — per the audio overhaul spec.
 */
export function playEchoPacket(_audioUnlocked) {
  // Intentionally empty — chapter_completion.mp3 is handled in handleAnnihilate
}

// ─────────────────────────────────────────────────────────────────────
// SIGNAL COLOR HELPER
// ─────────────────────────────────────────────────────────────────────
export function getSignalColor(signal) {
  if (signal >= 75) return '#00ff41';
  if (signal >= 50) return '#ffff00';
  if (signal >= 25) return '#ff6b00';
  return '#ff0000';
}

// ─────────────────────────────────────────────────────────────────────
// ECHO MARQUEE — pointer-events: none so it never blocks UI below
// ─────────────────────────────────────────────────────────────────────
export function EchoMarquee({ latestNarrative, systemTheme }) {
  if (!latestNarrative) return null;

  const color = systemTheme === 'god' ? '#ffd700' : '#00f5ff';
  const text  = `◈ ECHO // ${latestNarrative.sender} ◈ ${latestNarrative.title} ◈ SIGNAL: ${latestNarrative.signal}% ◈ "${latestNarrative.transmission.slice(0, 80).replace(/<[^>]*>/g, '').trim()}..." ◈`;
  const repeated = `${text}   ${text}   `;

  return (
    <div
      className="echo-marquee-wrapper no-print"
      style={{
        position: 'relative',
        zIndex: 49,           // below header (z-50) so header clicks always work
        overflow: 'hidden',
        background: systemTheme === 'god'
          ? 'linear-gradient(90deg, rgba(20,12,0,0.95), rgba(12,8,0,0.95))'
          : 'linear-gradient(90deg, rgba(2,6,12,0.95), rgba(4,8,16,0.95))',
        borderBottom: `1px solid ${color}25`,
        padding: '3px 0',
        // ✅ CRITICAL: never intercept pointer events — chapter clicks pass through
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <motion.div
        className="echo-marquee-track"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          repeat: Infinity,
          duration: 28,
          ease: 'linear',
        }}
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          fontSize: 9,
          color,
          letterSpacing: '0.12em',
          opacity: 0.7,
          textShadow: `0 0 6px ${color}60`,
        }}
      >
        {repeated}{repeated}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CRT COLLAPSE — Chapter 21 finale effect
// ─────────────────────────────────────────────────────────────────────
function CRTCollapse({ onDone }) {
  return (
    <motion.div
      initial={{ scaleY: 1, opacity: 1 }}
      animate={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
      onAnimationComplete={onDone}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#ffffff',
        zIndex: 10,
        transformOrigin: 'center',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────
export default function MemoryFragmentModal({
  narrative,
  audioUnlocked,
  isFinale = false,
  onClose,
}) {
  const [typedText,       setTypedText]       = useState('');
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [showCRTCollapse, setShowCRTCollapse] = useState(false);
  const [scanlineActive,  setScanlineActive]  = useState(true);

  const typingRef   = useRef(null);
  const fallbackRef = useRef(null);
  const openTimeRef = useRef(Date.now());

  // Strip HTML tags for plain typewriter rendering (we re-inject spans in JSX)
  const rawText = narrative?.transmission || '';

  // ── Typewriter ────────────────────────────────────────────────────
  useEffect(() => {
    if (!narrative) return;

    setTypedText('');
    setShowCloseButton(false);
    openTimeRef.current = Date.now();

    const CHARS_PER_TICK = 2;  // slightly faster for flow
    const SPEED_MS       = 22;
    let idx = 0;

    const onComplete = () => {
      setShowCloseButton(true);
    };

    const tick = () => {
      idx = Math.min(idx + CHARS_PER_TICK, rawText.length);
      setTypedText(rawText.slice(0, idx));
      if (idx < rawText.length) {
        typingRef.current = setTimeout(tick, SPEED_MS);
      } else {
        onComplete();
      }
    };

    typingRef.current = setTimeout(tick, 600);

    // ── FALLBACK: force close button after 15s regardless ──────────
    fallbackRef.current = setTimeout(() => {
      setTypedText(rawText); // show full text immediately
      setShowCloseButton(true);
    }, 15_000);

    return () => {
      clearTimeout(typingRef.current);
      clearTimeout(fallbackRef.current);
    };
  }, [narrative, rawText]);

  // ── Close handler ─────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    // Fade out completion OST
    stopCompletionAudio(2000);

    if (isFinale) {
      setShowCRTCollapse(true);
      // onClose called after CRT animation
    } else {
      onClose?.();
    }
  }, [isFinale, onClose]);

  // Skip to end
  const handleSkip = useCallback(() => {
    clearTimeout(typingRef.current);
    clearTimeout(fallbackRef.current);
    setTypedText(rawText);
    setShowCloseButton(true);
  }, [rawText]);

  if (!narrative) return null;

  const signalColor  = getSignalColor(narrative.signal || 50);
  const isDistortion = narrative.chapter >= 10 && narrative.chapter <= 14;
  const isRevelation = narrative.chapter >= 15;

  // Render transmission with neon-red-cliffhanger spans preserved
  const renderTransmission = (text) => {
    if (!text) return null;
    // Split on the span tags and re-render
    const parts = text.split(/(<span class="neon-red-cliffhanger">[\s\S]*?<\/span>)/g);
    return parts.map((part, i) => {
      const match = part.match(/<span class="neon-red-cliffhanger">([\s\S]*?)<\/span>/);
      if (match) {
        return (
          <span key={i} className="neon-red-cliffhanger">
            {match[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        // ✅ z-index layered correctly: below gacha (99995), above main content
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9991,
          background: 'rgba(0,2,5,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        // Allow clicking backdrop ONLY after typing is done
        onClick={(e) => {
          if (e.target === e.currentTarget && showCloseButton) handleClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.88, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className={isDistortion ? 'echo-distortion' : ''}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            background: isFinale
              ? 'linear-gradient(135deg, #000205, #000510)'
              : 'linear-gradient(135deg, #020810, #040a18)',
            border: `1px solid ${isFinale ? 'rgba(0,255,65,0.6)' : signalColor}40`,
            boxShadow: isFinale
              ? `0 0 80px rgba(0,255,65,0.25), 0 0 160px rgba(0,255,65,0.1)`
              : `0 0 40px ${signalColor}20, 0 0 80px ${signalColor}08`,
            overflow: 'hidden',
          }}
        >
          {/* CRT Collapse overlay (finale only) */}
          {showCRTCollapse && (
            <CRTCollapse onDone={onClose} />
          )}

          {/* CRT scanlines */}
          {scanlineActive && (
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
            }} />
          )}

          {/* CRT scan sweep */}
          <motion.div
            className="intro-scanline"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(180deg, rgba(${isFinale ? '0,255,65' : '0,245,255'},0.15), transparent)`,
              pointerEvents: 'none',
              zIndex: 3,
            }}
            animate={{ top: ['-5%', '108%'] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
          />

          {/* ── HEADER ── */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${signalColor}25`,
            background: `rgba(0,0,0,0.4)`,
            flexShrink: 0,
            position: 'relative',
            zIndex: 5,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              {/* Left: sender info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <Radio size={9} color={signalColor} />
                  </motion.div>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 8,
                    color: signalColor,
                    letterSpacing: '0.2em',
                    fontWeight: 900,
                    textShadow: `0 0 6px ${signalColor}`,
                  }}>
                    {narrative.sender}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(180,210,230,0.9)',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                }}>
                  {narrative.title}
                </div>
              </div>

              {/* Right: signal bar + close button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}>
                {/* Signal strength */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: 7,
                    color: 'rgba(80,110,140,0.6)',
                    letterSpacing: '0.15em',
                    marginBottom: 2,
                  }}>
                    SIGNAL
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}>
                    {Array.from({ length: 5 }, (_, i) => {
                      const filled = i < Math.round((narrative.signal / 100) * 5);
                      return (
                        <div key={i} style={{
                          width: 4,
                          height: 10 + i * 2,
                          background: filled ? signalColor : 'rgba(40,60,80,0.4)',
                          boxShadow: filled ? `0 0 4px ${signalColor}` : 'none',
                        }} />
                      );
                    })}
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 8,
                      color: signalColor,
                      marginLeft: 3,
                      fontWeight: 900,
                    }}>
                      {narrative.signal}%
                    </span>
                  </div>
                </div>

                {/* ── CLOSE BUTTON ──
                    z-index: 9999, pointer-events: auto — NEVER soft-locks */}
                <AnimatePresence>
                  {showCloseButton && (
                    <motion.button
                      key="close-btn"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleClose}
                      style={{
                        position: 'relative',
                        zIndex: 9999,
                        pointerEvents: 'auto',
                        padding: '6px 14px',
                        background: `${signalColor}18`,
                        border: `1px solid ${signalColor}60`,
                        color: signalColor,
                        fontFamily: 'monospace',
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: '0.15em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <X size={11} />
                      {isFinale ? 'RETURN HOME' : 'CLOSE'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── BODY: Typewriter Text ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            position: 'relative',
            zIndex: 4,
            scrollbarWidth: 'thin',
            scrollbarColor: `${signalColor}30 transparent`,
          }}>
            <div style={{
              fontFamily: '"Share Tech Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: 1.85,
              color: 'rgba(160,205,225,0.88)',
              whiteSpace: 'pre-wrap',
              letterSpacing: '0.03em',
            }}>
              {renderTransmission(typedText)}
              {/* Cursor */}
              {!showCloseButton && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.52 }}
                  style={{ color: signalColor, fontWeight: 900 }}
                >
                  █
                </motion.span>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            padding: '8px 24px',
            borderTop: `1px solid ${signalColor}15`,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 5,
            position: 'relative',
          }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 8,
              color: 'rgba(60,90,120,0.5)',
              letterSpacing: '0.15em',
            }}>
              CH.{narrative.chapter.toString().padStart(2, '0')} / 21 — NODE-SEVEN ARCHIVE
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Skip to end button (shown while typing) */}
              {!showCloseButton && (
                <button
                  onClick={handleSkip}
                  style={{
                    position: 'relative',
                    zIndex: 9999,
                    pointerEvents: 'auto',
                    fontFamily: 'monospace',
                    fontSize: 8,
                    color: `${signalColor}80`,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.15em',
                  }}
                >
                  ▶▶ SKIP
                </button>
              )}

              {/* Chapter progress dots */}
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 21 }, (_, i) => {
                  const chNum    = i + 1;
                  const isCurrent = chNum === narrative.chapter;
                  const isPast    = chNum < narrative.chapter;
                  return (
                    <motion.div
                      key={chNum}
                      animate={isCurrent ? { scale: [1, 1.4, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{
                        width: isCurrent ? 8 : 4,
                        height: isCurrent ? 8 : 4,
                        borderRadius: '50%',
                        background: isCurrent ? signalColor
                                  : isPast    ? `${signalColor}50`
                                  : 'rgba(40,60,80,0.4)',
                        boxShadow: isCurrent ? `0 0 6px ${signalColor}` : 'none',
                        transition: 'all 0.3s',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
