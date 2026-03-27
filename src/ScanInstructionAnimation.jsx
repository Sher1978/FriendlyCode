import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ScanInstructionAnimation = ({ ambientColor, discountValue }) => {
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
            title: "Hold your phone",
            phone: { x: 0, y: 0, rotate: -5 },
            hand: { opacity: 1, x: 0 },
            counter: { opacity: 0, y: 50 }
        },
        // Frame 1: Action - Moving towards counter
        {
            title: "Show to staff",
            phone: { x: 40, y: -20, rotate: 0 },
            hand: { opacity: 1, x: 40 },
            counter: { opacity: 1, y: 0 }
        },
        // Frame 2: Active - Screen lit up
        {
            title: "Redeem Reward",
            phone: { x: 40, y: -20, rotate: 0, scale: 1.1 },
            hand: { opacity: 1, x: 40 },
            counter: { opacity: 1, y: 0 },
            screenActive: true
        },
        // Frame 3: Success - Checkmark
        {
            title: "Success!",
            phone: { x: 0, y: 0, rotate: 0, scale: 0.9, opacity: 0 },
            hand: { opacity: 0 },
            counter: { opacity: 0 },
            success: true
        }
    ];

    const current = frames[frame];

    return (
        <div className="relative w-full h-[120px] flex items-center justify-center overflow-hidden rounded-[18px] bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
            
            {/* Counter / Staff Area (Schematic) */}
            <motion.div 
                animate={current.counter}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-24 bg-white/10 rounded-full blur-[2px]"
            />

            {/* Hand & Phone Group */}
            <motion.div
                animate={{ x: current.phone.x, y: current.phone.y }}
                className="relative z-10"
            >
                {/* Hand (Schematic) */}
                <motion.div 
                    animate={current.hand}
                    className="absolute -bottom-10 -left-6 w-16 h-20 bg-[#E5C1A7] rounded-full rotate-45 opacity-0"
                    style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}
                />

                {/* Smartphone (iOS 16 style) */}
                <motion.div
                    animate={{ rotate: current.phone.rotate, scale: current.phone.scale || 1, opacity: current.phone.opacity ?? 1 }}
                    className="w-16 h-28 bg-[#1C1C1E] border-[1.5px] border-white/20 rounded-[12px] p-1 shadow-2xl overflow-hidden relative"
                >
                    {/* Screen Content */}
                    <div className="w-full h-full bg-black rounded-[9px] flex flex-col items-center justify-center p-1 relative">
                        <motion.div 
                            animate={{ opacity: current.screenActive ? 1 : 0 }}
                            className="absolute inset-0 bg-white/5 flex flex-col items-center justify-center"
                        >
                            <div className="w-8 h-8 rounded-full blur-md opacity-50 absolute" style={{ backgroundColor: ambientColor }} />
                            <span className="text-[10px] font-black text-white relative z-10 leading-none">{discountValue}%</span>
                            <span className="text-[4px] font-bold text-white/40 uppercase tracking-tighter mt-0.5 relative z-10">REVOO</span>
                        </motion.div>
                        
                        {/* Notch */}
                        <div className="absolute top-0 w-6 h-1.5 bg-[#1C1C1E] rounded-b-md" />
                    </div>
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
                        <div className="w-16 h-16 rounded-full border-2 border-green-500/50 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
                            <motion.svg 
                                width="32" height="32" viewBox="0 0 24 24" fill="none"
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

            {/* Label */}
            <div className="absolute bottom-2 left-0 w-full text-center">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={current.title}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]"
                    >
                        {current.title}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ScanInstructionAnimation;
