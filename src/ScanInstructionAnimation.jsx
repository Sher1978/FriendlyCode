import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ScanInstructionAnimation = ({ ambientColor, discountValue }) => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prev) => (prev + 1) % 4);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const frames = [
        // Frame 0: Phone shown, hand resting
        {
            phone: { x: 0, y: 0, rotate: 0, scale: 1.05, opacity: 1 },
            hand: { opacity: 1, y: 0, rotate: 0 },
            staff: { opacity: 0, x: -30 },
            screenActive: true,
            showStaff: false,
            success: false,
        },
        // Frame 1: Moving toward staff
        {
            phone: { x: -28, y: -8, rotate: -8, scale: 1, opacity: 1 },
            hand: { opacity: 1, y: 0, rotate: -8 },
            staff: { opacity: 1, x: 0 },
            screenActive: true,
            showStaff: true,
            success: false,
        },
        // Frame 2: Showing screen up close
        {
            phone: { x: -38, y: -14, rotate: -12, scale: 1.05, opacity: 1 },
            hand: { opacity: 1, y: 0, rotate: -12 },
            staff: { opacity: 1, x: 0 },
            screenActive: true,
            showStaff: true,
            success: false,
        },
        // Frame 3: Success
        {
            phone: { x: 0, y: 10, rotate: 0, scale: 0.92, opacity: 0 },
            hand: { opacity: 0, y: 10, rotate: 0 },
            staff: { opacity: 0.2, x: 0 },
            screenActive: false,
            showStaff: true,
            success: true,
        },
    ];

    const current = frames[frame];
    const color = ambientColor || '#00FF41';

    return (
        <div className="relative w-full h-[220px] flex items-center justify-center overflow-hidden rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">

            {/* Ambient glow behind phone */}
            <div
                style={{
                    position: 'absolute',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Staff schematic — back layer */}
            <motion.div
                animate={current.staff}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    translateY: '-50%',
                    zIndex: 1,
                    pointerEvents: 'none',
                }}
            >
                {/* Head */}
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '6px', marginLeft: 'auto', marginRight: 'auto' }} />
                {/* Body */}
                <div style={{ width: '56px', height: '36px', borderRadius: '18px 18px 0 0', background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                {/* Shadow */}
                <div style={{ position: 'absolute', bottom: '-6px', left: '-14px', width: '84px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%', filter: 'blur(3px)' }} />
            </motion.div>

            {/* Phone + Hand group — moves together */}
            <motion.div
                animate={{ x: current.phone.x, y: current.phone.y }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
            >
                {/* ── SMARTPHONE ── */}
                <motion.div
                    animate={{
                        rotate: current.phone.rotate,
                        scale: current.phone.scale,
                        opacity: current.phone.opacity,
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{
                        width: '52px',
                        height: '92px',
                        background: 'linear-gradient(160deg, #1a1a1f 0%, #0d0d10 100%)',
                        border: '2px solid rgba(255,255,255,0.18)',
                        borderRadius: '14px',
                        padding: '3px',
                        boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 30px ${color}25`,
                        position: 'relative',
                        zIndex: 20,
                        flexShrink: 0,
                    }}
                >
                    {/* Screen */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#000',
                        borderRadius: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <motion.div
                            animate={{ opacity: current.screenActive ? 1 : 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {/* Screen glow */}
                            <div style={{
                                position: 'absolute',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: color,
                                filter: 'blur(18px)',
                                opacity: 0.35,
                            }} />
                            {/* Discount text */}
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '900',
                                color: '#fff',
                                letterSpacing: '-0.5px',
                                position: 'relative',
                                textShadow: `0 0 12px ${color}`,
                                zIndex: 2,
                            }}>{discountValue}%</span>
                            <span style={{
                                fontSize: '4px',
                                fontWeight: '800',
                                color: color,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                marginTop: '2px',
                                position: 'relative',
                                zIndex: 2,
                            }}>REVOO</span>
                            {/* Screen gradient */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                                zIndex: 1,
                            }} />
                        </motion.div>
                        {/* Notch */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            width: '22px',
                            height: '5px',
                            background: '#1a1a1f',
                            borderRadius: '0 0 6px 6px',
                            zIndex: 30,
                        }} />
                        {/* Screen edge gloss */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '30%',
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                            borderRadius: '11px',
                            zIndex: 5,
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* iPhone side button */}
                    <div style={{
                        position: 'absolute',
                        right: '-3px',
                        top: '22px',
                        width: '3px',
                        height: '20px',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '0 2px 2px 0',
                    }} />
                    {/* Volume buttons */}
                    <div style={{
                        position: 'absolute',
                        left: '-3px',
                        top: '18px',
                        width: '3px',
                        height: '12px',
                        background: 'rgba(255,255,255,0.12)',
                        borderRadius: '2px 0 0 2px',
                    }} />
                    <div style={{
                        position: 'absolute',
                        left: '-3px',
                        top: '34px',
                        width: '3px',
                        height: '12px',
                        background: 'rgba(255,255,255,0.12)',
                        borderRadius: '2px 0 0 2px',
                    }} />
                </motion.div>

                {/* ── REALISTIC HAND (SVG) ── */}
                <motion.div
                    animate={{
                        opacity: current.hand.opacity,
                        y: current.hand.y,
                        rotate: current.hand.rotate,
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute',
                        bottom: '-70px',
                        right: '-62px',
                        width: '175px',
                        height: '175px',
                        zIndex: 15,
                        pointerEvents: 'none',
                        filter: 'drop-shadow(-8px 16px 30px rgba(0,0,0,0.55))',
                    }}
                >
                    <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            {/* Main skin gradient — warm, multi-stop for realism */}
                            <linearGradient id="sg-main" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#FDDEC8" />
                                <stop offset="40%" stopColor="#F0C4A4" />
                                <stop offset="80%" stopColor="#E2AD8C" />
                                <stop offset="100%" stopColor="#D49870" />
                            </linearGradient>
                            {/* Side/shadow gradient */}
                            <linearGradient id="sg-side" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#E2AD8C" />
                                <stop offset="100%" stopColor="#C8896A" />
                            </linearGradient>
                            {/* Finger tip gradient — slightly darker */}
                            <linearGradient id="sg-tip" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F5C9A8" />
                                <stop offset="100%" stopColor="#D9956E" />
                            </linearGradient>
                            {/* Palm highlight */}
                            <radialGradient id="sg-palm-highlight" cx="40%" cy="40%" r="60%">
                                <stop offset="0%" stopColor="#FEE8D6" stopOpacity="0.7" />
                                <stop offset="100%" stopColor="#E2AD8C" stopOpacity="0" />
                            </radialGradient>
                            {/* Knuckle shadow filter */}
                            <filter id="fShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="-1" dy="2" stdDeviation="1.5" floodColor="#B87040" floodOpacity="0.4" />
                            </filter>
                        </defs>

                        {/* ── WRIST / FOREARM ── */}
                        <path
                            d="M58 240 C54 215 52 200 52 180 L148 180 C148 200 146 215 142 240 Z"
                            fill="url(#sg-main)"
                        />
                        {/* Wrist crease lines */}
                        <path d="M60 200 Q100 196 140 200" stroke="#C8896A" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" fill="none" />
                        <path d="M58 210 Q100 207 142 210" stroke="#C8896A" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" fill="none" />

                        {/* ── PALM ── */}
                        <path
                            d="M42 180 C30 180 22 160 22 140 C22 118 32 108 50 108 C55 108 60 110 65 115 L65 180 Z"
                            fill="url(#sg-side)"
                            filter="url(#fShadow)"
                        />
                        <path
                            d="M65 180 L135 180 C148 175 155 158 155 140 C155 125 148 115 135 115 L65 115 Z"
                            fill="url(#sg-main)"
                        />
                        {/* Palm highlight overlay */}
                        <ellipse cx="95" cy="148" rx="38" ry="28" fill="url(#sg-palm-highlight)" />
                        {/* Palm crease lines */}
                        <path d="M40 155 Q80 148 130 158" stroke="#C07845" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" fill="none" />
                        <path d="M55 135 Q95 128 140 138" stroke="#C07845" strokeWidth="0.9" strokeLinecap="round" opacity="0.25" fill="none" />

                        {/* ── THUMB ── */}
                        <path
                            d="M22 140 C10 140 4 118 14 100 C24 82 46 86 55 108 L50 108 C35 98 20 104 18 120 C16 136 26 145 38 145 Z"
                            fill="url(#sg-main)"
                            filter="url(#fShadow)"
                        />
                        {/* Thumb tip rounded cap */}
                        <ellipse cx="14" cy="100" rx="10" ry="12" fill="url(#sg-tip)" />
                        {/* Thumb nail */}
                        <ellipse cx="14" cy="94" rx="5" ry="7" fill="#F8DCE0" opacity="0.55" />
                        <ellipse cx="14" cy="97" rx="4.5" ry="5" fill="none" stroke="#D4A090" strokeWidth="0.8" opacity="0.4" />
                        {/* Thumb knuckle */}
                        <path d="M30 120 Q40 116 50 120" stroke="#C07845" strokeWidth="1" strokeLinecap="round" opacity="0.35" fill="none" />

                        {/* ── INDEX FINGER ── */}
                        <path
                            d="M65 115 C62 95 68 68 75 55 C80 45 92 45 96 55 C100 65 100 90 98 115 Z"
                            fill="url(#sg-main)"
                            filter="url(#fShadow)"
                        />
                        <ellipse cx="85" cy="52" rx="10" ry="12" fill="url(#sg-tip)" />
                        {/* Index nail */}
                        <ellipse cx="85" cy="46" rx="5" ry="6.5" fill="#F8DCE0" opacity="0.55" />
                        <ellipse cx="85" cy="49" rx="4.5" ry="5" fill="none" stroke="#D4A090" strokeWidth="0.8" opacity="0.4" />
                        {/* Knuckle lines */}
                        <path d="M66 105 Q81 101 97 105" stroke="#C07845" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" fill="none" />
                        <path d="M68 88 Q82 84 96 88" stroke="#C07845" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" fill="none" />
                        <path d="M70 72 Q83 68 95 72" stroke="#C07845" strokeWidth="0.8" strokeLinecap="round" opacity="0.22" fill="none" />

                        {/* ── MIDDLE FINGER ── */}
                        <path
                            d="M98 115 C98 92 104 65 110 50 C115 38 128 38 132 50 C136 62 134 92 132 115 Z"
                            fill="url(#sg-main)"
                            filter="url(#fShadow)"
                        />
                        <ellipse cx="120" cy="47" rx="10" ry="12" fill="url(#sg-tip)" />
                        <ellipse cx="120" cy="41" rx="5" ry="6.5" fill="#F8DCE0" opacity="0.55" />
                        <ellipse cx="120" cy="44" rx="4.5" ry="5" fill="none" stroke="#D4A090" strokeWidth="0.8" opacity="0.4" />
                        <path d="M99 105 Q115 101 131 105" stroke="#C07845" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" fill="none" />
                        <path d="M100 88 Q115 84 130 88" stroke="#C07845" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" fill="none" />
                        <path d="M102 70 Q116 66 128 70" stroke="#C07845" strokeWidth="0.8" strokeLinecap="round" opacity="0.22" fill="none" />

                        {/* ── RING FINGER ── */}
                        <path
                            d="M132 115 C134 96 140 73 144 60 C148 50 160 50 163 62 C166 74 162 98 158 115 Z"
                            fill="url(#sg-main)"
                            filter="url(#fShadow)"
                        />
                        <ellipse cx="153" cy="57" rx="10" ry="11" fill="url(#sg-tip)" />
                        <ellipse cx="153" cy="51" rx="5" ry="6" fill="#F8DCE0" opacity="0.55" />
                        <ellipse cx="153" cy="54" rx="4.5" ry="4.5" fill="none" stroke="#D4A090" strokeWidth="0.8" opacity="0.4" />
                        <path d="M133 105 Q145 101 157 105" stroke="#C07845" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" fill="none" />
                        <path d="M134 90 Q145 86 156 90" stroke="#C07845" strokeWidth="0.9" strokeLinecap="round" opacity="0.28" fill="none" />
                        <path d="M136 75 Q146 71 155 75" stroke="#C07845" strokeWidth="0.8" strokeLinecap="round" opacity="0.22" fill="none" />

                        {/* ── PINKY ── */}
                        <path
                            d="M158 115 C160 100 163 82 166 72 C169 64 178 64 180 74 C182 84 179 103 175 115 Z"
                            fill="url(#sg-main)"
                            filter="url(#fShadow)"
                        />
                        <ellipse cx="173" cy="70" rx="8" ry="10" fill="url(#sg-tip)" />
                        <ellipse cx="173" cy="64" rx="4" ry="5.5" fill="#F8DCE0" opacity="0.55" />
                        <ellipse cx="173" cy="67" rx="3.5" ry="4.5" fill="none" stroke="#D4A090" strokeWidth="0.8" opacity="0.4" />
                        <path d="M159 105 Q167 101 175 105" stroke="#C07845" strokeWidth="1.0" strokeLinecap="round" opacity="0.35" fill="none" />
                        <path d="M160 92 Q167 89 174 92" stroke="#C07845" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" fill="none" />
                    </svg>
                </motion.div>
            </motion.div>

            {/* ── SUCCESS OVERLAY ── */}
            <AnimatePresence>
                {current.success && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 30,
                        }}
                    >
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            border: `2px solid ${color}50`,
                            background: `${color}15`,
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <motion.svg
                                width="32" height="32" viewBox="0 0 24 24" fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <motion.path
                                    d="M5 13l4 4L19 7"
                                    stroke={color}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                />
                            </motion.svg>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScanInstructionAnimation;
