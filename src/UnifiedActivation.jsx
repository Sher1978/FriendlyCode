import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
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
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

    useEffect(() => {
        let interval = null;
        if (isClaimed && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            clearInterval(interval);
            // Handle timer expiration? (Optional: navigate away or show expired message)
        }
        return () => clearInterval(interval);
    }, [isClaimed, timeLeft]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleClaim = async () => {
        try {
            const venueId = location.state?.venueId || localStorage.getItem('currentVenueId') || 'unknown';
            const guestEmail = location.state?.guestEmail || localStorage.getItem('guestEmail') || 'unknown';

            // Create notification for owner
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
            console.error("Error creating claim request:", e);
            // Fallback for demo
            setIsClaimed(true);
        }
    };

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
                    <div className="mt-8 h-[64px] relative">
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
                                    <FontAwesomeIcon icon={faClock} className="animate-pulse" />
                                    <span className="tabular-nums tracking-widest">{formatTime(timeLeft)}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
