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
        // Frame 0: Idle - Phone held by hand
        {
            title: t('instruction_hold'),
            phone: { x: 50, y: 0, rotate: 5 },
            hand: { opacity: 1 },
            staff: { opacity: 0.3, x: -10 }
        },
        // Frame 1: Action - Moving towards staff (Left)
        {
            title: t('instruction_show'),
            phone: { x: -30, y: -10, rotate: -5 },
            hand: { opacity: 1 },
            staff: { opacity: 1, x: 0 }
        },
        // Frame 2: Active - Screen lit up
        {
            title: t('instruction_redeem'),
            phone: { x: -30, y: -10, rotate: -5, scale: 1.1 },
            hand: { opacity: 1 },
            staff: { opacity: 1, x: 0 },
            screenActive: true
        },
        // Frame 3: Success - Checkmark
        {
            title: t('instruction_success'),
            phone: { x: 0, y: 0, rotate: 0, scale: 0.8, opacity: 0 },
            hand: { opacity: 0 },
            staff: { opacity: 0.2 },
            success: true
        }
    ];

    const current = frames[frame];

    return (
        <div className="relative w-full h-[120px] flex items-center justify-center overflow-hidden rounded-[18px] bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
            
            {/* Staff Member Schematic (Left Side) - Back layer */}
            <motion.div 
                animate={current.staff}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-0 pointer-events-none"
            >
                {/* Staff Head */}
                <div className="w-6 h-6 rounded-full bg-white/10 mb-1 mx-auto" />
                {/* Staff Shoulders */}
                <div className="w-14 h-8 rounded-t-2xl bg-white/5" />
                {/* Counter Bar */}
                <div className="absolute -bottom-1 -left-4 w-20 h-1.5 bg-white/20 rounded-full blur-[1px]" />
            </motion.div>

            {/* Hand & Phone Group */}
            <motion.div
                animate={{ x: current.phone.x, y: current.phone.y - 5 }} // Slight lift, but not too much
                className="relative z-10 flex items-center justify-center"
            >
                {/* Smartphone (iOS 16 style) - Smaller scale for better fit */}
                <motion.div
                    animate={{ rotate: current.phone.rotate, scale: current.phone.scale || 1, opacity: current.phone.opacity ?? 1 }}
                    className="w-14 h-24 bg-[#1C1C1E] border-[1.5px] border-white/20 rounded-[10px] p-0.5 shadow-2xl overflow-hidden relative z-20"
                >
                    {/* Screen Content */}
                    <div className="w-full h-full bg-black rounded-[8px] flex flex-col items-center justify-center p-1 relative">
                        <motion.div 
                            animate={{ opacity: current.screenActive ? 1 : 0 }}
                            className="absolute inset-0 bg-white/5 flex flex-col items-center justify-center"
                        >
                            <div className="w-6 h-6 rounded-full blur-md opacity-50 absolute" style={{ backgroundColor: ambientColor }} />
                            <span className="text-[10px] font-black text-white relative z-10 leading-none">{discountValue}%</span>
                            <span className="text-[3px] font-bold text-white/40 uppercase tracking-tighter mt-0.5 relative z-10">REVOO</span>
                        </motion.div>
                        
                        {/* Notch */}
                        <div className="absolute top-0 w-5 h-1 bg-[#1C1C1E] rounded-b-md" />
                    </div>
                </motion.div>

                {/* Realistic Schematic Hand (SVG) - Flipped (mirror) for holding phone from right */}
                <motion.div 
                    animate={current.hand}
                    className="absolute -bottom-10 -right-8 w-24 h-24 z-10 pointer-events-none"
                    style={{ filter: 'drop-shadow(-4px 8px 15px rgba(0,0,0,0.4))' }}
                >
                    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }}>
                        {/* Wrist and Forearm */}
                        <path d="M40 120L45 100L70 95L75 120H40Z" fill="#E5C1A7" opacity="0.8" />
                        {/* Palm Refined */}
                        <path d="M45 95C32 95 22 85 18 70C14 55 18 40 30 32C42 24 55 30 62 40C69 50 75 80 75 90C75 100 62 95 45 95Z" fill="#E5C1A7" />
                        {/* Thumb Wrap (Front) */}
                        <path d="M30 65C25 60 22 50 28 40C34 30 44 35 50 45" stroke="#D4A78A" strokeWidth="8" strokeLinecap="round" />
                        {/* Fingers Tucked (Behind phone) */}
                        <rect x="70" y="50" width="10" height="22" rx="5" fill="#E5C1A7" />
                        <rect x="76" y="60" width="10" height="22" rx="5" fill="#D4A78A" />
                        <rect x="80" y="72" width="10" height="22" rx="5" fill="#C3967A" />
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
