import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PngBattery from './PngBattery';

// Duration per story (ms)
const DURATIONS = [7000, 7000, 3000];

// ─────────────────────────────────────────────────────
// Story 1 — Hook: What is REVOO?
// ─────────────────────────────────────────────────────
function Story1() {
  return (
    <div className="flex flex-col items-center w-full gap-5 px-5 pt-2">
      {/* Hero image — guest paying / vibe */}
      <div className="relative w-full rounded-[28px] overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
        <img
          src="/assets/hero.png"
          alt="REVOO experience"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <img src="/revoo-logo.png" alt="REVOO" className="h-7 object-contain mix-blend-screen" />
          <div>
            <p className="text-[13px] font-bold text-white leading-tight">VIP Loyalty for Dubai</p>
            <p className="text-[10px] text-white/50 font-medium">Restaurants & Cafés</p>
          </div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
          >
            LIVE
          </motion.div>
        </motion.div>
      </div>

      {/* Text */}
      <div className="text-center flex flex-col gap-2">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[24px] font-bold leading-tight text-white tracking-tight"
        >
          Your VIP status<br />is a living battery
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-[14px] text-white/50 font-medium leading-relaxed"
        >
          The more often you visit partner venues, the higher your battery charge level and the bigger your discount!
        </motion.p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Story 2 — The Battery: Your VIP Status Visualised
// ─────────────────────────────────────────────────────
function Story2() {
  // Animate through battery levels to demonstrate the concept
  const levels = [10, 25, 50, 100];
  const [levelIdx, setLevelIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setLevelIdx(i => (i + 1) % levels.length);
    }, 1400);
    return () => clearInterval(t);
  }, []);

  const capacity = levels[levelIdx];
  const labels = ['Base 5% (Low Charge)', 'Level 10% (Charged)', 'Level 15% (High Charge)', 'Super VIP 20% (Full!)'];
  const colors = ['#FF3131', '#FF8800', '#FFD700', '#00FF41'];
  const color = colors[levelIdx];

  return (
    <div className="flex flex-col items-center w-full gap-4 px-5 pt-2">
      {/* Header text */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[22px] font-bold text-white leading-tight"
        >
          Charge the battery<br />with your visits
        </motion.h2>
      </div>

      {/* Battery — THE WOW FACTOR */}
      <div className="relative w-full">
        {/* Label above battery */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${levelIdx}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-2"
          >
            <span
              className="text-[28px] font-bold tracking-tight"
              style={{ color, textShadow: `0 0 20px ${color}80` }}
            >
              {labels[levelIdx]}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Battery component */}
        <PngBattery capacity={capacity} />

        {/* Level dots */}
        <div className="flex justify-center gap-2 mt-3">
          {levels.map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i === levelIdx ? 1.4 : 1, opacity: i === levelIdx ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
          ))}
        </div>
      </div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[13px] text-white/40 font-medium text-center leading-relaxed"
      >
        Every visit charges your battery. If you stay away<br />too long, the charge drains and your discount melts!
      </motion.p>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Story 3 — Celebration: Your reward is ready
// ─────────────────────────────────────────────────────
function Story3({ onClaim }) {
  return (
    <div className="flex flex-col items-center w-full gap-4 px-5 pt-2">
      {/* VIP celebration photo */}
      <div className="relative w-full rounded-[28px] overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
        <img
          src="/vip_pov_celebration_final.jpg"
          alt="VIP celebration"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Floating discount pill */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
          className="absolute top-4 right-4 flex flex-col items-center px-4 py-2 rounded-2xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,255,136,0.4)' }}
        >
          <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Up to</span>
          <span className="text-[32px] font-bold leading-none" style={{ color: '#00FF88', textShadow: '0 0 20px rgba(0,255,136,0.6)' }}>20%</span>
          <span className="text-[10px] font-semibold text-white/60">VIP discount</span>
        </motion.div>

        {/* Partners count */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-4 left-4"
        >
          <span className="text-[12px] font-semibold text-white/60">✓ 50+ partner venues in Dubai</span>
        </motion.div>
      </div>

      {/* Text */}
      <div className="text-center flex flex-col gap-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[22px] font-bold text-white leading-tight"
        >
          ⚡ Calculating your<br />battery charge...
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[13px] text-white/40 font-medium"
        >
          Checking your visit history to set your VIP rate
        </motion.p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#00FF88' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main RevooStories component
// ─────────────────────────────────────────────────────
export default function RevooStories({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [barKey, setBarKey]   = useState(0);

  const touchStartX = useRef(null);

  const goNext = useCallback(() => {
    setCurrent(prev => {
      if (prev < 2) {
        setBarKey(k => k + 1);
        return prev + 1;
      }
      onComplete?.();
      return prev;
    });
  }, [onComplete]);

  const goPrev = useCallback(() => {
    setCurrent(prev => {
      if (prev > 0) {
        setBarKey(k => k + 1);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  });

  // Auto-advance
  useEffect(() => {
    const t = setTimeout(() => goNextRef.current(), DURATIONS[current]);
    return () => clearTimeout(t);
  }, [current]);

  // Tap to advance
  const handleTap = (e) => {
    // Ignore if interactive element
    if (e.target.closest('button')) return;
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? window.innerWidth / 2;
    x < window.innerWidth / 2 ? goPrev() : goNext();
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    const dx = e.changedTouches[0].clientX - (touchStartX.current ?? 0);
    if (Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  const accentColors = ['#D4AF37', '#00FF88', '#00FF88'];
  const accent = accentColors[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden select-none"
      style={{ touchAction: 'none' }}
      onClick={handleTap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient glow */}
      <motion.div
        key={`glow-${current}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${accent}18, transparent 70%)`,
        }}
      />

      {/* ── Progress bars ── */}
      <div className="relative z-20 flex gap-1.5 px-4 pt-[env(safe-area-inset-top,12px)] pt-3 pb-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/15">
            {i < current && (
              <div className="h-full w-full rounded-full" style={{ backgroundColor: accent }} />
            )}
            {i === current && (
              <motion.div
                key={barKey}
                className="h-full rounded-full origin-left"
                style={{ backgroundColor: accent }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: DURATIONS[current] / 1000, ease: 'linear' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-5 pb-1">
        <img src="/revoo-logo.png" alt="REVOO" className="h-5 object-contain mix-blend-screen opacity-60" />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i === current ? accent : 'rgba(255,255,255,0.2)', transform: i === current ? 'scale(1.4)' : 'scale(1)' }}
            />
          ))}
        </div>
        <button
          className="text-[11px] font-semibold text-white/30 px-3 py-1"
          onClick={e => { e.stopPropagation(); onComplete?.(); }}
        >
          Skip
        </button>
      </div>

      {/* ── Story Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col justify-start pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`story-${current}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center w-full"
          >
            {current === 0 && <Story1 />}
            {current === 1 && <Story2 />}
            {current === 2 && <Story3 onClaim={onComplete} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom navigation ── */}
      <div className="relative z-20 pb-[env(safe-area-inset-bottom,20px)] pb-6 px-5 flex items-center justify-between">
        <button
          className="text-white/25 text-[12px] font-semibold tracking-widest uppercase py-2 px-4"
          onClick={e => { e.stopPropagation(); goPrev(); }}
        >
          ← Back
        </button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          className="px-7 py-3 rounded-2xl text-[13px] font-bold tracking-wide text-black"
          style={{ backgroundColor: accent, boxShadow: `0 0 20px ${accent}50` }}
          onClick={e => { e.stopPropagation(); goNext(); }}
        >
          {current < 2 ? 'Next →' : '🎁 Get My Reward'}
        </motion.button>
      </div>
    </div>
  );
}
