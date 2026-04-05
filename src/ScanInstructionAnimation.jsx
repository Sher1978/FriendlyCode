import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const ScanInstructionAnimation = ({ ambientColor, discountValue }) => {
    const { t } = useTranslation();
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prev) => (prev + 1) % 4);
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    const frames = [
        {
            phone: { y: 0, rotate: 0, scale: 1.15, opacity: 1 },
            text: t('instruction_hold', 'Возьмите телефон'),
            screenActive: true,
            success: false,
        },
        {
            phone: { y: -5, rotate: -5, scale: 1.2, opacity: 1 },
            text: t('instruction_show', 'Покажите на кассе'),
            screenActive: true,
            success: false,
        },
        {
            phone: { y: 5, rotate: 5, scale: 1.2, opacity: 1 },
            text: t('instruction_redeem', 'Получите награду'),
            screenActive: true,
            success: false,
        },
        {
            phone: { y: 0, rotate: 0, scale: 1.0, opacity: 0.1 },
            text: t('instruction_success', 'Готово!'),
            screenActive: false,
            success: true,
        },
    ];

    const current = frames[frame];
    const color = ambientColor || '#00FF41';

    return (
        <div className="relative w-full h-[240px] flex flex-col items-center justify-center overflow-hidden rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
            
            {/* Ambient glow behind phone */}
            <motion.div
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            />

            {/* Main Phone Container */}
            <div className="relative flex-1 flex items-center justify-center w-full mb-4">
                <motion.div
                    animate={current.phone}
                    transition={{ duration: 0.7, ease: 'easeInOut' }}
                    style={{
                        width: '78px',
                        height: '138px',
                        background: 'linear-gradient(160deg, #1a1a1f 0%, #0d0d10 100%)',
                        border: '3px solid rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        padding: '4px',
                        boxShadow: `0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 40px ${color}30`,
                        position: 'relative',
                        zIndex: 20,
                    }}
                >
                    {/* Screen */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#000',
                        borderRadius: '16px',
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
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: color,
                                filter: 'blur(25px)',
                                opacity: 0.4,
                            }} />

                            {/* Discount content */}
                            <motion.span 
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                    fontSize: '22px',
                                    fontWeight: '900',
                                    color: '#fff',
                                    letterSpacing: '-1px',
                                    position: 'relative',
                                    textShadow: `0 0 15px ${color}`,
                                    zIndex: 2,
                                }}
                            >
                                {discountValue}%
                            </motion.span>
                            <span style={{
                                fontSize: '6px',
                                fontWeight: '800',
                                color: color,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                marginTop: '4px',
                                position: 'relative',
                                zIndex: 2,
                                opacity: 0.8
                            }}>REVOO</span>
                        </motion.div>

                        {/* Notch */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            width: '32px',
                            height: '7px',
                            background: '#1a1a1f',
                            borderRadius: '0 0 8px 8px',
                            zIndex: 30,
                        }} />
                    </div>

                    {/* Side button detail */}
                    <div className="absolute -right-[4px] top-[28px] w-[3px] h-[24px] bg-white/20 rounded-r-lg" />
                    <div className="absolute -left-[4px] top-[24px] w-[3px] h-[14px] bg-white/10 rounded-l-lg" />
                    <div className="absolute -left-[4px] top-[42px] w-[3px] h-[14px] bg-white/10 rounded-l-lg" />
                </motion.div>
            </div>

            {/* Instruction Text */}
            <div className="h-8 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={frame}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="text-center"
                    >
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white/90 drop-shadow-lg">
                            {current.text}
                        </span>
                        <motion.div 
                            animate={{ width: ['0%', '100%', '0%'] }}
                            transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
                            style={{ height: '1px', background: color, opacity: 0.5, marginTop: '4px' }}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Success Icon */}
            <AnimatePresence>
                {current.success && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                        }}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: `${color}20`,
                            backdropFilter: 'blur(10px)',
                            border: `2px solid ${color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 50px ${color}30`
                        }}>
                             <motion.svg
                                width="40" height="40" viewBox="0 0 24 24" fill="none"
                            >
                                <motion.path
                                    d="M5 13l4 4L19 7"
                                    stroke={color}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.6 }}
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
