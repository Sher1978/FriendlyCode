import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import UserMenu from './UserMenu';

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
    const [predictionState, setPredictionState] = useState({
        percent: 20,
        secondsLeft: 86400,
        label: 'max_discount_ends',
        isBase: false,
        isMax: false
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

        const fetchConfig = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'venues', venueId));
                if (docSnap.exists()) {
                    const config = docSnap.data().loyaltyConfig;
                    const interval = setInterval(() => {
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

    const handleClaim = async () => {
        try {
            const venueId = location.state?.venueId || localStorage.getItem('currentVenueId') || 'unknown';
            const guestEmail = (location.state?.guestEmail || localStorage.getItem('guestEmail') || 'unknown').toLowerCase();
            const user = auth.currentUser;
            const role = location.state?.userRole || 'guest';

            const effectiveUid = location.state?.effectiveUid || localStorage.getItem('effectiveUid') || user?.uid || 'anonymous';

            const { getDocs, query, collection, where, orderBy, limit } = await import('firebase/firestore');
            const { RewardCalculator } = await import('./logic/RewardCalculator');

            // Fetch venue timezone for precise duplicate checking
            let tz = 'Asia/Dubai';
            try {
                const venueSnap = await getDoc(doc(db, 'venues', venueId));
                if (venueSnap.exists()) tz = venueSnap.data().timezone || 'Asia/Dubai';
            } catch (err) {
                console.warn("Failed to get venue timezone, using default", err);
            }

            const qRecent = query(
                collection(db, 'visits'),
                where('guestEmail', '==', guestEmail),
                where('venueId', '==', venueId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const recentSnaps = await getDocs(qRecent);
            
            let alreadyVisitedToday = false;
            if (!recentSnaps.empty) {
                const latestDoc = recentSnaps.docs[0];
                const ts = latestDoc.data().timestamp;
                if (ts) {
                    const latestDateStr = RewardCalculator.getVenueDateString(ts.toDate(), tz);
                    const todayStr = RewardCalculator.getVenueDateString(new Date(), tz);
                    if (latestDateStr === todayStr) {
                        alreadyVisitedToday = true;
                    }
                }
            }

            if (!alreadyVisitedToday) {
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
            } else {
                console.log("Visit already recorded for today (calendar day in venue timezone), skipping duplicate insert.");
            }

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
            <div className="flex flex-col min-h-screen bg-black font-sans text-white items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 text-red-500">
                    <FontAwesomeIcon icon={faClock} className="text-2xl" />
                </div>
                <h1 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">{t('reward_expired')}</h1>
                <p className="text-white/50 font-medium text-sm max-w-[260px] leading-relaxed">
                    {t('expired_instruction')}
                </p>
                <button
                    onClick={() => navigate('/qr')}
                    className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-[18px] w-full max-w-[200px]"
                >
                    Back to Start
                </button>
            </div>
        );
    }

    // Determine glow color based on discount
    let ambientColor = 'rgba(255,255,255,0.8)';
    if (discountValue >= 20) ambientColor = '#00FF41'; // Green
    else if (discountValue >= 15) ambientColor = '#FFD700'; // Yellow
    else if (discountValue >= 10) ambientColor = '#FF8800'; // Orange
    else if (discountValue >= 5) ambientColor = '#FF3131'; // Red

    return (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white antialiased overflow-hidden relative" style={{ WebkitFontSmoothing: 'antialiased' }}>
            
            {/* Ambient Ambient Glow */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: ambientColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: ambientColor }} />

            {/* Header / Nav */}
            <div className="pt-6 px-6 flex justify-between items-center z-50 w-full">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/5">
                    <FontAwesomeIcon icon={faUser} className="text-[10px] text-white/50" />
                    <span className="text-[11px] font-semibold tracking-wide text-white">{guestName}</span>
                </div>
                <UserMenu />
            </div>

            <div className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-md mx-auto -mt-4">

                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-16 h-16 bg-[#1C1C1E] border border-white/10 rounded-full flex items-center justify-center text-xl mb-4 mx-auto shadow-2xl text-white">
                        <FontAwesomeIcon icon={faStar} />
                    </div>
                    <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-1 text-white">
                        {t('thanks_for_visiting', { name: guestName, defaultValue: `Thanks for visiting,\n${guestName}!` })}
                    </h1>
                    <p className="text-white/60 font-medium text-[13px]">
                        {t('reward_sub', "Here is your special treat.")}
                    </p>
                </motion.div>

                {/* Discount Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] rounded-[32px] p-8 text-center shadow-2xl border border-white/10 relative overflow-hidden"
                >
                    <div className="absolute inset-0 border border-white/5 rounded-[32px] pointer-events-none mix-blend-overlay"></div>

                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <span className="relative z-10 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                        {t('current_discount')}
                    </span>

                    <div className="relative z-10 my-4">
                        <span className="text-[72px] font-bold leading-none text-white tracking-tighter" style={{ textShadow: `0 0 40px ${ambientColor}` }}>
                            {discountValue}%
                        </span>
                        <span className="block text-[12px] font-bold text-white/40 uppercase tracking-widest mt-1">
                            OFF Total Bill
                        </span>
                    </div>

                    {/* Dynamic Action Area */}
                    <div className="mt-8 relative z-10">
                        {/* Next Visit Info */}
                        <div className="mb-4 flex flex-col items-center gap-2">
                            {predictionState.isBase ? (
                                <span className="text-[13px] font-semibold text-white/80 animate-pulse">
                                    {t('tomorrow_20_percent')}
                                </span>
                            ) : null}
                        </div>

                        <div className="h-[52px] relative flex justify-center">
                            <AnimatePresence mode="wait">
                                {!isClaimed ? (
                                    <motion.button
                                        key="claim-btn"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={handleClaim}
                                        className="w-[92%] max-w-[400px] h-full bg-white text-black rounded-[18px] font-semibold text-[16px] flex items-center justify-center gap-2 shadow-xl active:scale-[0.97] transition-all"
                                    >
                                        <FontAwesomeIcon icon={faGift} />
                                        {t('claim_gift')}
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="timer"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-[92%] max-w-[400px] h-full bg-white/10 border border-white/20 text-white rounded-[18px] flex items-center justify-center gap-3 font-bold text-[20px] shadow-inner backdrop-blur-md"
                                    >
                                        <FontAwesomeIcon icon={faHeart} className="text-red-500 animate-ping text-[14px]" />
                                        <span className="tabular-nums tracking-wider font-mono">{formatTime(timeLeft)}</span>
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
                    transition={{ delay: 0.2 }}
                    className="text-center text-[12px] font-medium text-white/50 mt-6 max-w-[260px] leading-relaxed"
                >
                    {isClaimed
                        ? t('show_counter_instruction')
                        : t('claim_instruction')}
                </motion.p>
            </div>
        </div>
    );
};

export default UnifiedActivation;
