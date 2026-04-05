import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import UserMenu from './UserMenu';
import ScanInstructionAnimation from './ScanInstructionAnimation';

const UnifiedActivation = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    // Venue Settings for logic
    const [venueName, setVenueName] = useState('');
    const [guestName, setGuestName] = useState(() => {
        const params = new URLSearchParams(location.search);
        return location.state?.guestName || params.get('guestName') || localStorage.getItem('guestName') || 'Guest';
    });
    const [discountValue, setDiscountValue] = useState(() => {
        const stateValue = location.state?.discountValue;
        if (stateValue !== undefined) return stateValue;
        return parseInt(localStorage.getItem('currentDiscount')) || 10;
    });
    const [isClaimed, setIsClaimed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    
    // Helper to get color based on discount
    const getTierColor = (val) => {
        if (val >= 20) return '#00FF41'; // Green (Max)
        if (val >= 15) return '#FFD700'; // Gold (Level 1)
        if (val >= 10) return '#FF8800'; // Orange (Level 2)
        return '#FF3131'; // Red (Base)
    };

    const [ambientColor, setAmbientColor] = useState(getTierColor(discountValue));
    const [venueSettings, setVenueSettings] = useState({ loyaltyInterval: 1, googleReviewLink: '' });
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewStars, setReviewStars] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [showGiftScreen, setShowGiftScreen] = useState(false);

    const handleStarClick = (star) => {
        setReviewStars(star);
        if (star >= 4) {
            // Open Google review in background, then show gift screen
            if (venueSettings.googleReviewLink) {
                window.open(venueSettings.googleReviewLink, '_blank', 'noopener,noreferrer');
            }
            setTimeout(() => {
                setIsReviewOpen(false);
                setShowGiftScreen(true);
            }, 300);
        } else {
            // Low rating — just close the popup
            setTimeout(() => setIsReviewOpen(false), 600);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const venueId = params.get('venueId') || localStorage.getItem('currentVenueId');
        if (venueId) {
            getDoc(doc(db, 'venues', venueId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setVenueName(data.name);
                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || ''
                    });
                    // Priority: Status-based color (already set in state init)
                    // Only override if brandColor is explicitly requested to be the background
                    // but according to user feedback, status color is preferred.
                    // if (data.brandColor) setAmbientColor(data.brandColor); 
                }
            });
        }
    }, []);

    useEffect(() => {
        let timer;
        if (isClaimed && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isClaimed, timeLeft]);

    const handleClaim = async () => {
        setIsClaimed(true);
        // Add to history
        const venueId = localStorage.getItem('currentVenueId');
        if (venueId) {
            await addDoc(collection(db, 'venues', venueId, 'redemptions'), {
                guestName,
                discount: discountValue,
                timestamp: serverTimestamp()
            });
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    return (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white antialiased overflow-hidden relative" style={{ WebkitFontSmoothing: 'antialiased' }}>
            
            {/* Ambient Ambient Glow */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: ambientColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: ambientColor }} />

            {/* Header / Nav */}
            <div className="pt-6 px-6 flex justify-between items-center z-50 w-full">
                <UserMenu 
                    user={auth.currentUser}
                    venue={{ name: venueName }}
                    activeStatuses={[]} 
                    isGuestView={true}
                    trigger={
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/5 cursor-pointer active:scale-95 transition-all">
                            <FontAwesomeIcon icon={faUser} className="text-[10px] text-white/50" />
                            <span className="text-[11px] font-semibold tracking-wide text-white">{guestName}</span>
                        </div>
                    }
                />
                <div />
            </div>

            <div className="flex-grow flex flex-col items-center justify-start pt-12 px-6 relative z-10 w-full max-w-md mx-auto -mt-4">



                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-2"
                >
                    <h1 className="text-[24px] font-bold tracking-tight leading-tight mb-1 text-white">
                        {t('thanks_for_visiting', { name: guestName, defaultValue: `Thanks for visiting,\n${guestName}!` })}
                    </h1>
                </motion.div>

                {/* VIP Milestone (New & Prominent) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full mb-4 p-[1px] rounded-[24px]"
                    style={{ background: `linear-gradient(90deg, ${ambientColor}20, ${ambientColor}10, ${ambientColor}20)` }}
                >
                    <div className="bg-[#1C1C1E] rounded-[23px] py-4 px-6 text-center shadow-xl">
                        <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] block mb-1">{t('loyalty_vip')} STATUS UPGRADE</span>
                        <h2 className="text-[14px] font-bold mb-1 text-white">
                            {discountValue >= 20 
                                ? t('max_vip_achieved', 'YOU HAVE REACHED MAXIMUM VIP!') 
                                : (venueSettings?.loyaltyInterval === 1 
                                    ? t('next_vip_tomorrow') 
                                    : t('next_vip_days', { days: venueSettings?.loyaltyInterval || 1 }))
                            }
                        </h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                            {discountValue >= 20 
                                ? t('vip_maintenance_hint', 'Visit regularly to keep your status')
                                : t('vip_status_control')}
                        </p>
                    </div>
                </motion.div>

                {/* Discount Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] rounded-[32px] p-6 text-center shadow-2xl border border-white/10 relative overflow-hidden"
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
                    <div className="mt-6 relative z-10">
                        <div className={`${isClaimed ? 'h-[220px]' : 'h-[52px]'} relative flex justify-center transition-all duration-300`}>
                            <AnimatePresence mode="wait">
                                {!isClaimed ? (
                                    <motion.button
                                        key="claim-btn"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={handleClaim}
                                        className="w-full h-full bg-white text-black rounded-[18px] font-semibold text-[16px] flex items-center justify-center gap-2 shadow-xl active:scale-[0.97] transition-all"
                                    >
                                        <FontAwesomeIcon icon={faGift} />
                                        {t('claim_gift')}
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="animation-container"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full h-full"
                                    >
                                        <ScanInstructionAnimation ambientColor={ambientColor} discountValue={discountValue} />
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
                    className="text-center text-[12px] font-medium text-white/50 mt-4 max-w-[260px] leading-relaxed"
                >
                    {isClaimed
                        ? t('show_counter_instruction')
                        : t('claim_instruction')}
                </motion.p>
            </div>

            {/* Floating Gift Icon & Review Popup */}
            <div className="fixed bottom-8 right-6 z-[100]">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    onClick={() => setIsReviewOpen(!isReviewOpen)}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-black text-2xl relative shadow-lg"
                    style={{ backgroundColor: ambientColor, boxShadow: `0 0 30px ${ambientColor}60` }}
                >
                    <FontAwesomeIcon icon={faGift} />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                </motion.button>

                <AnimatePresence>
                    {isReviewOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0, x: 50, y: 50 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0, x: 50, y: 50 }}
                            className="absolute bottom-20 right-0 w-[280px] bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={() => setIsReviewOpen(false)} className="text-white/20 hover:text-white transition-colors">
                                    {/* Using faXmark or similar icon */}
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="text-center mt-2">
                                <div className="text-4xl mb-3">🌟</div>
                                <h3 className="text-[16px] font-bold text-white mb-1 leading-tight">{t('review_stars_prompt', 'How was your experience?')}</h3>
                                <p className="text-white/40 text-[11px] leading-relaxed mb-4 uppercase tracking-wider">
                                    {t('review_gift_hint', 'Rate 4–5 stars and get a bonus gift')}
                                </p>
                                {/* Star Rating */}
                                <div className="flex justify-center gap-2 mb-5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                            key={star}
                                            whileTap={{ scale: 0.8 }}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(0)}
                                            onClick={() => handleStarClick(star)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <motion.div
                                                animate={{
                                                    scale: (hoveredStar >= star || reviewStars >= star) ? 1.3 : 1,
                                                    rotate: (hoveredStar >= star || reviewStars >= star) ? [0, -10, 10, 0] : 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faStar}
                                                    className="text-[28px]"
                                                    style={{
                                                        color: (hoveredStar >= star || reviewStars >= star)
                                                            ? ambientColor
                                                            : 'rgba(255,255,255,0.15)',
                                                        filter: (hoveredStar >= star || reviewStars >= star)
                                                            ? `drop-shadow(0 0 8px ${ambientColor})`
                                                            : 'none',
                                                        transition: 'color 0.15s, filter 0.15s',
                                                    }}
                                                />
                                            </motion.div>
                                        </motion.button>
                                    ))}
                                </div>
                                <p className="text-white/25 text-[10px]">
                                    {reviewStars > 0 && reviewStars < 4
                                        ? t('review_thank_you', 'Thank you for your feedback!')
                                        : t('review_tap_stars', 'Tap a star to rate')}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── FULL SCREEN GIFT OVERLAY ── */}
            <AnimatePresence>
                {showGiftScreen && (
                    <motion.div
                        key="gift-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex flex-col items-center justify-center text-center px-8"
                        style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(24px)' }}
                    >
                        {/* Ambient glow matching tier */}
                        <div
                            style={{
                                position: 'absolute',
                                width: '300px', height: '300px',
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${ambientColor}35 0%, transparent 70%)`,
                                filter: 'blur(40px)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Animated gift emoji */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                            className="text-[90px] mb-8 relative z-10"
                        >
                            🎁
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-[32px] font-black tracking-tight text-white leading-tight mb-3 relative z-10"
                            style={{ textShadow: `0 0 40px ${ambientColor}` }}
                        >
                            {t('review_gift_screen_title', 'Congratulations!')}
                        </motion.h2>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="text-[16px] font-semibold text-white/70 leading-relaxed mb-2 max-w-[280px] relative z-10"
                        >
                            {t('review_gift_screen_sub', 'Show this screen to the staff to receive your special gift!')}
                        </motion.p>

                        {/* Stars earned badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.45 }}
                            className="flex gap-1 mb-10 relative z-10"
                        >
                            {[1,2,3,4,5].map(s => (
                                <FontAwesomeIcon
                                    key={s}
                                    icon={faStar}
                                    style={{
                                        fontSize: '22px',
                                        color: s <= reviewStars ? ambientColor : 'rgba(255,255,255,0.1)',
                                        filter: s <= reviewStars ? `drop-shadow(0 0 6px ${ambientColor})` : 'none',
                                    }}
                                />
                            ))}
                        </motion.div>

                        {/* Glowing divider */}
                        <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                width: '80px', height: '2px',
                                background: `linear-gradient(90deg, transparent, ${ambientColor}, transparent)`,
                                marginBottom: '40px',
                                position: 'relative',
                                zIndex: 10,
                            }}
                        />

                        {/* Close button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            onClick={() => setShowGiftScreen(false)}
                            className="relative z-10 px-10 py-4 rounded-[20px] text-black font-black text-[16px] uppercase tracking-widest active:scale-[0.97] transition-all shadow-2xl"
                            style={{
                                backgroundColor: ambientColor,
                                boxShadow: `0 0 40px ${ambientColor}50`,
                            }}
                        >
                            {t('review_gift_close', 'Got it!')}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnifiedActivation;
