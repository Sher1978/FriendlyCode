import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const UnifiedActivation = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    // State from previous screen or localStorage
    const guestName = location.state?.guestName || localStorage.getItem('guestName') || 'Guest';
    const discountValue = location.state?.discountValue || 5;

    // Timer Logic
    const [isClaimed, setIsClaimed] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 300 seconds (5 minutes) for the claim itself

    // Smart Prediction Timer State
    const [secondsPassed, setSecondsPassed] = useState(0);
    const [predictionState, setPredictionState] = useState({
        percent: 20,
        secondsLeft: 86400,
        label: 'max_discount_ends'
    });

    useEffect(() => {
        let interval = null;
        if (isClaimed && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isClaimed) {
            clearInterval(interval);
            setIsExpired(true);
        }
        return () => clearInterval(interval);
    }, [isClaimed, timeLeft]);

    // Smart Timer Logic: Updates every second to simulate the passage of time since claim
    useEffect(() => {
        const venueId = localStorage.getItem('currentVenueId') || 'unknown';

        // We need the venue config for accurate windows
        const fetchConfig = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'venues', venueId));
                if (docSnap.exists()) {
                    const config = docSnap.data().loyaltyConfig;

                    const interval = setInterval(() => {
                        const now = new Date();
                        // Simulating based on a generic "last visit" if we don't have one 
                        // Or better: just use the discount logic passed in.
                        // But let's assume we want to show the timer properly.
                        // For simplicity in this "Thank You" screen, we'll use the predictionState calculated in LandingPage 
                        // OR recalculate here.

                        // For the "Thank You" screen specifically, we care about the CURRENT discount state.
                        let label = 'valid_for_label';
                        let isBase = discountValue <= 5;
                        let isMax = discountValue >= 20;

                        setPredictionState(prev => ({
                            ...prev,
                            isBase,
                            isMax,
                            label: isMax ? 'valid_for_label' : 'discount_stable'
                        }));
                    }, 1000);
                    return () => clearInterval(interval);
                }
            } catch (e) {
                console.error("Error fetching venue config for timer:", e);
            }
        };
        fetchConfig();
    }, [discountValue]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const formatHours = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleClaim = async () => {
        try {
            const venueId = location.state?.venueId || localStorage.getItem('currentVenueId') || 'unknown';
            const guestEmail = (location.state?.guestEmail || localStorage.getItem('guestEmail') || 'unknown').toLowerCase();
            const user = auth.currentUser;
            const role = location.state?.userRole || 'guest';

            // Use duplicated-resolved ID if available, otherwise auth ID
            const effectiveUid = location.state?.effectiveUid || localStorage.getItem('effectiveUid') || user?.uid || 'anonymous';

            // 1. Create visit record (Core Logic)
            await addDoc(collection(db, 'visits'), {
                uid: effectiveUid,
                venueId: venueId,
                guestEmail: guestEmail,
                guestName: guestName,
                discountValue: discountValue,
                timestamp: serverTimestamp(),
                status: 'pending_validation',
                is_test: ['staff', 'owner', 'superadmin'].includes(role)
            });

            // 2. Also keep legacy request for compatibility
            await addDoc(collection(db, 'discount_requests'), {
                venueId: venueId,
                guestEmail: guestEmail,
                guestName: guestName,
                discountAmount: discountValue,
                status: 'pending',
                timestamp: serverTimestamp(),
            });

            setIsClaimed(true);
        } catch (e) {
            console.error("Error creating visit/claim:", e);
            setIsClaimed(true);
        }
    };

    if (isExpired) {
        return (
            <div className="flex flex-col min-h-screen bg-red-50 items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <FontAwesomeIcon icon={faClock} size="2x" />
                </div>
                <h1 className="text-2xl font-black text-red-900 mb-2 uppercase">{t('reward_expired', 'Expired')}</h1>
                <p className="text-red-800/60 font-medium">
                    {t('expired_instruction', 'This reward session has timed out. Please scan the QR code again if you missed it.')}
                </p>
                <button
                    onClick={() => navigate('/qr')}
                    className="mt-8 px-8 py-3 bg-red-600 text-white font-black rounded-xl uppercase tracking-wider"
                >
                    Back to Start
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#E8F5E9] font-sans text-[#1B5E20] antialiased overflow-hidden relative">
            {/* Header / Nav */}
            <div className="pt-8 px-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <FontAwesomeIcon icon={faUser} className="text-xs" />
                    <span className="text-xs font-bold uppercase tracking-wide">{guestName}</span>
                </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-md mx-auto">

                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mb-4 mx-auto shadow-lg shadow-[#1B5E20]/10 text-[#4CAF50]">
                        <FontAwesomeIcon icon={faStar} />
                    </div>
                    <h1 className="text-[28px] font-black leading-tight mb-2">
                        {t('reward_greeting', { name: guestName, defaultValue: `Thanks for visit, ${guestName}!` })}
                    </h1>
                    <p className="text-[#1B5E20]/60 font-medium text-lg">
                        {t('reward_sub', "Here is your special treat.")}
                    </p>
                </motion.div>

                {/* Discount Card */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full bg-white rounded-[32px] p-8 text-center shadow-xl shadow-[#1B5E20]/5 border-2 border-[#A5D6A7] relative overflow-hidden"
                >
                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8F5E9] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <span className="relative z-10 text-[12px] font-black uppercase tracking-[0.2em] text-[#81C784]">
                        {t('current_discount', "Current Discount")}
                    </span>

                    <div className="relative z-10 my-4">
                        <span className="text-[80px] font-black leading-none text-[#2E7D32]">
                            {discountValue}%
                        </span>
                        <span className="block text-[14px] font-bold text-[#1B5E20]/40 uppercase tracking-widest mt-[-5px]">
                            OFF Total Bill
                        </span>
                    </div>

                    {/* Dynamic Action Area */}
                    <div className="mt-8 relative">
                        {/* Next Visit Info */}
                        <div className="mb-4 flex flex-col items-center gap-2">
                            {predictionState.isBase ? (
                                <span className="text-lg font-black text-[#2E7D32] animate-pulse">
                                    {t('tomorrow_20_percent')}
                                </span>
                            ) : (
                                <>
                                    <span className="text-[#1B5E20]/70 text-xs font-bold uppercase tracking-wider">
                                        {t('valid_for_label')}
                                    </span>
                                    <div className="bg-[#E8F5E9] px-3 py-1 rounded-lg border border-[#A5D6A7] text-[#2E7D32] font-mono text-xl font-bold">
                                        {formatHours(predictionState.secondsLeft || 172800)}
                                    </div>
                                    {predictionState.isMax && (
                                        <span className="text-[10px] font-bold text-[#1B5E20]/50 mt-1 max-w-[200px]">
                                            {t('max_reward_subtext')}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="h-[64px] relative">
                            <AnimatePresence mode="wait">
                                {!isClaimed ? (
                                    <motion.button
                                        key="claim-btn"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={handleClaim}
                                        className="w-full h-full bg-[#2E7D32] text-white rounded-[20px] font-black text-[18px] uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-[#2E7D32]/30 active:scale-95 transition-all hover:bg-[#1B5E20]"
                                    >
                                        <FontAwesomeIcon icon={faGift} />
                                        {t('claim_gift', "Get My Gift")}
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="timer"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full h-full bg-[#E8F5E9] border-2 border-[#2E7D32] text-[#2E7D32] rounded-[20px] flex items-center justify-center gap-4 font-black text-[24px] shadow-inner"
                                    >
                                        <FontAwesomeIcon icon={faHeart} className="text-red-500 animate-ping text-sm" />
                                        <span className="tabular-nums tracking-widest font-mono">{formatTime(timeLeft)}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Instruction */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-sm font-bold opacity-50 mt-8 max-w-[260px] leading-relaxed"
                >
                    {isClaimed
                        ? t('show_counter_instruction', "Show this screen to the staff when paying to apply your discount.")
                        : t('claim_instruction', "Tap the button above when you are ready to pay.")}
                </motion.p>

            </div>
        </div>
    );
};

export default UnifiedActivation;
