import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import PngBattery from './PngBattery';
import LanguageSwitcher from './LanguageSwitcher';

const SmartWelcomeScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    
    const steps = [
        t('sws_step_1', 'Сделайте заказ.'),
        t('sws_step_2', 'Покажите экран кассиру.'),
        t('sws_step_3', 'Наслаждайтесь максимальной выгодой!')
    ];
    const [currentStep, setCurrentStep] = useState(0);
    const [animatedPercent, setAnimatedPercent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % steps.length);
        }, 2500); // 2.5 seconds per slide to give enough reading time
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Remove transient params from URL so refresh goes back to PreLanding
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('activated') === 'true') {
            searchParams.delete('activated');
            const newUrl = window.location.pathname + '?' + searchParams.toString();
            window.history.replaceState(null, '', newUrl);
        }
        
        // Target percent (for Google Maps activation, it's always max level = 100%)
        const targetPercent = 100;

        // Animate from 0 up to targetPercent over 4 seconds
        const duration = 4000;
        const fps = 60;
        const totalFrames = (duration / 1000) * fps;
        let currentFrame = 0;
        
        const interval = setInterval(() => {
            currentFrame++;
            const progress = currentFrame / totalFrames;
            // Easing function (easeOutQuad)
            const easeProgress = progress * (2 - progress);
            
            if (currentFrame >= totalFrames) {
                setAnimatedPercent(targetPercent);
                clearInterval(interval);
            } else {
                // Animate from 0 upwards to targetPercent
                const currentVal = targetPercent * easeProgress;
                setAnimatedPercent(Math.max(1, Math.min(100, Math.floor(currentVal))));
            }
        }, 1000 / fps);
        
        return () => clearInterval(interval);
    }, []);

    // Check if there is a venueId in the URL
    const searchParams = new URLSearchParams(location.search);
    const venueId = searchParams.get('v') || searchParams.get('id') || searchParams.get('venue_id') || searchParams.get('venueId') || 'demo';
    const venueName = searchParams.get('name') || '';
    const gmapUrl = searchParams.get('gmap');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    const handleClaimGift = () => {
        navigate('/activate', {
            state: {
                returnTo: '/google-thank-you',
                venueId: venueId,
                fromGoogleMaps: true,
                acquisition_source: 'google_maps_bonus'
            }
        });
    };

    // Determine background colors based on percentage
    let bgGlowColor = 'bg-[#00FF41]'; // Default/Greenish
    if (animatedPercent < 15) bgGlowColor = 'bg-[#FF3131]'; // Red
    else if (animatedPercent < 30) bgGlowColor = 'bg-[#FF8800]'; // Orange
    else if (animatedPercent < 60) bgGlowColor = 'bg-[#FFD700]'; // Yellow

    return (
        <div 
            className="flex flex-col bg-black font-sans text-white relative overflow-x-hidden overflow-y-auto" 
            style={{ 
                minHeight: '100dvh', 
                paddingTop: 'env(safe-area-inset-top, 24px)', 
                paddingBottom: 'env(safe-area-inset-bottom, 24px)' 
            }}
        >
            {/* Ambient Background Glow for Maximum Energy */}
            <div className={`fixed top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.35] mix-blend-screen transition-colors duration-[2000ms] ${bgGlowColor}`} />
            <div className={`fixed bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.25] transition-colors duration-[2000ms] ${bgGlowColor}`} />

            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

            {/* Header Content */}
            <div className="relative z-10 px-6 pt-6 flex flex-col items-center text-center">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-full px-4 py-2 mb-3 backdrop-blur-md"
                >
                    <span className="text-xl">📍</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#00FF41]">
                        {t('sws_thank_you_maps', 'Спасибо, что нашли нас на Google Картах!')}
                    </span>
                </motion.div>

                <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl font-black uppercase tracking-tighter leading-tight mb-0 drop-shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-colors duration-500"
                >
                    {t('sws_your_discount', 'ВАША СКИДКА')}<br/>
                    <span className={
                        animatedPercent < 15 ? "text-[#FF3131]" : 
                        animatedPercent < 30 ? "text-[#FF8800]" : 
                        animatedPercent < 60 ? "text-[#FFD700]" : 
                        "text-[#00FF41]"
                    }>
                        {t('sws_charged_at', 'ЗАРЯЖЕНА НА')} {animatedPercent}%
                    </span>
                </motion.h1>
            </div>

            {/* Battery Container */}
            <div className="relative z-10 flex-grow flex items-center justify-center mt-2 mb-4 min-h-[170px] shrink-0 pointer-events-none">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
                    className="w-full max-w-[280px] sm:max-w-[340px]"
                >
                    <PngBattery capacity={animatedPercent} showGlow={true} disableInternalAnim={true} />
                </motion.div>
            </div>

            {/* Description & CTA Container */}
            <div className="relative z-10 px-6 pb-8 flex flex-col items-center text-center mt-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/10 shadow-2xl w-full max-w-sm mb-6"
                >
                    <p className="text-sm text-white/80 font-medium leading-relaxed mb-4">
                        {t('sws_intro_desc_1', 'В нашей системе скидка — это живая батарея. Она заряжается с каждым визитом: ЧАЩЕ ХОДИШЬ - ВЫШЕ СКИДКА. В честь знакомства мы дарим вам ')}
                        <span className="text-[#00FF41] font-bold">{t('sws_max_level', 'МАКСИМАЛЬНЫЙ УРОВЕНЬ')}</span> 
                        {t('sws_intro_desc_2', ' прямо сейчас (действует 24 часа 🕐)')}
                    </p>
                    
                    <div className="text-left bg-black/40 rounded-2xl p-4 border border-white/5 relative min-h-[100px] flex items-center overflow-hidden">
                        <p className="absolute top-2 left-4 text-xs font-bold uppercase tracking-wider text-white/30">{t('sws_how_to_use', '👇 Как использовать бонус:')}</p>
                        
                        {/* Huge background number */}
                        <div className="absolute right-2 -bottom-4 text-[80px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
                            {currentStep + 1}
                        </div>
                        
                        <div className="mt-6 w-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center gap-4 relative z-10"
                                >
                                    <div className="text-[#00FF41] font-black text-3xl leading-none">{currentStep + 1}.</div>
                                    <p className="text-sm font-semibold text-white/90 leading-snug">
                                        {steps[currentStep]}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClaimGift}
                    className="w-full max-w-sm py-5 rounded-[24px] bg-gradient-to-r from-[#00FF41] to-[#00CC33] text-black font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(0,255,65,0.4)] border-b-4 border-[#009926] relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {t('sws_claim_in_venue', 'ЗАБРАТЬ В ЗАВЕДЕНИИ')}
                </motion.button>
                
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-[10px] text-white/40 font-medium mt-4 max-w-[280px]"
                >
                    {t('sws_warning', '⏳ Внимание: Этот стартовый заряд начнет «таять» через 24 часа. Приходите сегодня, чтобы сохранить скидку!')}
                </motion.p>
            </div>
        </div>
    );
};

export default SmartWelcomeScreen;
