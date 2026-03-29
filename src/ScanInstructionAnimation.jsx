import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ScanInstructionAnimation = ({ ambientColor, discountValue }) => {
    const { t } = useTranslation();
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prev) => (prev + 1) % 4);
        }, 1500); // 1.5s per frame
        return () => clearInterval(interval);
    }, []);

    const frames = [
        // Frame 0: Reveal - Focus on the phone where the discount just appeared
        {
            title: t('instruction_reveal', 'Discount Activated'),
            phone: { x: 0, y: 10, rotate: 0, scale: 1.1 },
            hand: { opacity: 1, scale: 1, y: 0 },
            staff: { opacity: 0.1, x: -20 },
            screenActive: true,
            showStaff: false
        },
        // Frame 1: Action - Holding and moving towards staff
        {
            title: t('instruction_show', 'Show to Staff'),
            phone: { x: -25, y: -5, rotate: -5, scale: 1 },
            hand: { opacity: 1, scale: 1, y: 0 },
            staff: { opacity: 1, x: 0 },
            screenActive: true,
            showStaff: true
        },
        // Frame 2: Active - Near counter for verification
        {
            title: t('instruction_verify', 'Verifying...'),
            phone: { x: -35, y: -10, rotate: -10, scale: 1.05 },
            hand: { opacity: 1, scale: 1, y: 0 },
            staff: { opacity: 1, x: 0 },
            screenActive: true,
            showStaff: true
        },
        // Frame 3: Success - Interaction complete
        {
            title: t('instruction_success', 'Verified'),
            phone: { x: 0, y: 20, rotate: 0, scale: 0.9, opacity: 0 },
            hand: { opacity: 0, scale: 0.9 },
            staff: { opacity: 0.3 },
            success: true,
            showStaff: true
        }
    ];

    const current = frames[frame];

    return (
        <div className="relative w-full h-[130px] flex items-center justify-center overflow-hidden rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            
            {/* Staff Member Schematic - Back layer */}
            <motion.div 
                animate={current.staff}
                className="absolute left-8 top-1/2 -translate-y-1/2 z-0 pointer-events-none"
            >
                <div className="w-7 h-7 rounded-full bg-white/10 mb-1.5 mx-auto border border-white/5" />
                <div className="w-16 h-10 rounded-t-[20px] bg-white/5 border-t border-white/10" />
                <div className="absolute -bottom-2 -left-6 w-28 h-2 bg-white/10 rounded-full blur-[2px]" />
            </motion.div>

            {/* Hand & Phone Group */}
            <motion.div
                animate={{ x: current.phone.x, y: current.phone.y }}
                className="relative z-10 flex items-center justify-center"
            >
                {/* Smartphone (Premium iOS Style) */}
                <motion.div
                    animate={{ rotate: current.phone.rotate, scale: current.phone.scale || 1, opacity: current.phone.opacity ?? 1 }}
                    className="w-15 h-26 bg-[#121214] border-[2px] border-white/20 rounded-[14px] p-1 shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden relative z-20"
                >
                    <div className="w-full h-full bg-black rounded-[11px] flex flex-col items-center justify-center p-1 relative overflow-hidden">
                        <motion.div 
                            animate={{ opacity: current.screenActive ? 1 : 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10" />
                            <div className="w-10 h-10 rounded-full blur-xl opacity-40 absolute" style={{ backgroundColor: ambientColor }} />
                            <span className="text-[12px] font-black text-white relative z-20 tracking-tighter" style={{ textShadow: `0 0 10px ${ambientColor}` }}>{discountValue}%</span>
                            <span className="text-[4px] font-black text-[#00FF41] uppercase tracking-[0.2em] mt-1 relative z-20">REVOO PRIVILEGE</span>
                        </motion.div>
                        
                        {/* Dynamic Notch */}
                        <div className="absolute top-0 w-6 h-1.5 bg-[#121214] rounded-b-lg z-30" />
                    </div>
                </motion.div>

                {/* PREMIUM ANATOMICAL HAND (SVG) - NO MORE EAR */}
                <motion.div 
                    animate={{ opacity: current.hand.opacity, scale: current.hand.scale, y: current.hand.y }}
                    className="absolute -bottom-14 -right-10 w-48 h-48 z-10 pointer-events-none"
                    style={{ filter: 'drop-shadow(-15px 20px 40px rgba(0,0,0,0.4))' }}
                >
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <defs>
                            <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#F3D5C1" />
                                <stop offset="100%" stopColor="#E8B99A" />
                            </linearGradient>
                            <filter id="skinShadow">
                                <feDropShadow dx="-2" dy="2" stdDeviation="1.5" floodColor="#D4A78A" floodOpacity="0.5" />
                            </filter>
                        </defs>

                        {/* Forearm / Wrist Structure */}
                        <path d="M130 200 C 125 185, 120 165, 115 145 L 60 145 C 55 165, 50 185, 45 200" fill="url(#handGrad)" opacity="0.95" />
                        
                        {/* Palm Base (Fleshy part) */}
                        <path d="M60 145 C 35 145, 30 120, 30 100 C 30 80, 50 75, 75 75 C 95 75, 120 80, 135 110 L 135 145 L 60 145" fill="url(#handGrad)" filter="url(#skinShadow)" />

                        {/* Index Finger (The 'Point' or 'Hold') */}
                        <path d="M75 75 C 70 55, 80 45, 95 55 C 105 62, 102 80, 92 85" fill="#F3D5C1" stroke="#E8B99A" strokeWidth="0.5" />
                        
                        {/* Middle Finger (Longest) */}
                        <path d="M95 80 C 92 60, 110 52, 122 65 C 130 75, 128 90, 118 100" fill="url(#handGrad)" stroke="#E8B99A" strokeWidth="0.5" />
                        
                        {/* Ring Finger */}
                        <path d="M118 95 C 122 80, 138 75, 148 88 C 158 100, 150 115, 135 125" fill="#E8B99A" stroke="#D4A78A" strokeWidth="0.5" />
                        
                        {/* Pinky Finger */}
                        <path d="M135 115 C 145 105, 160 105, 165 120 C 170 135, 160 145, 140 145" fill="url(#handGrad)" stroke="#D4A78A" strokeWidth="0.5" />

                        {/* Thumb (Opposable Grip) */}
                        <path d="M35 105 C 15 105, 10 80, 25 65 C 40 50, 60 60, 75 80" fill="url(#handGrad)" filter="url(#skinShadow)" />

                        {/* Realistic Details (Folds, Nails) */}
                        <path d="M78 60 Q 82 58 86 60" stroke="#D4A78A" strokeWidth="0.8" opacity="0.3" /> {/* Index Nail */}
                        <path d="M98 68 Q 102 66 106 68" stroke="#D4A78A" strokeWidth="0.8" opacity="0.3" /> {/* Middle Nail */}
                        <path d="M48 105 Q 60 100 75 110" stroke="#D4A78A" strokeWidth="1" opacity="0.2" /> {/* Palm Line */}
                    </svg>
                </motion.div>
            </motion.div>


            {/* Success Overlays */}
            <AnimatePresence>
                {current.success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-0 flex items-center justify-center z-20"
                    >
                        <div className="w-14 h-14 rounded-full border-2 border-green-500/50 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
                            <motion.svg 
                                width="28" height="28" viewBox="0 0 24 24" fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <motion.path 
                                    d="M5 13l4 4L19 7" 
                                    stroke="#4ADE80" 
                                    strokeWidth="3" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                />
                            </motion.svg>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Label (Resolved Overlap) */}
            <div className="absolute bottom-1 w-full text-center z-30 pointer-events-none">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={current.title}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]"
                    >
                        {current.title}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ScanInstructionAnimation;
