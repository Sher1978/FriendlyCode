import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import UserMenu from './UserMenu';
import ScanInstructionAnimation from './ScanInstructionAnimation';


// VIP Gift Teaser Component
const VipGiftTeaser = ({ tiers, ambientColor, discountValue }) => {
    const [activeIdx, setActiveIdx] = useState(0);

    const rows = React.useMemo(() => {
        if (!tiers || tiers.length === 0) return [];
        return [...tiers]
            .filter(t => t.maxHours > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .map(t => {
                const days = Math.round(t.maxHours / 24);
                const label = days === 1 ? '1 DAY' : `${days} DAYS`;
                
                let tierColor = '#FF3131'; 
                if (t.percentage >= 20) tierColor = '#00FF41'; 
                else if (t.percentage >= 15) tierColor = '#FFD700'; 
                else if (t.percentage >= 10) tierColor = '#FF8800'; 
                
                return { pct: t.percentage, label, color: tierColor };
            });
    }, [tiers]);

    React.useEffect(() => {
        if (rows.length < 2) return;
        const id = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % rows.length);
        }, 2200);
        return () => clearInterval(id);
    }, [rows]);

    if (rows.length === 0) return null;

    const current = rows[activeIdx];
    const activeColor = current.color;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="w-full mb-4 relative"
        >
            <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.01, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: "absolute", inset: 0,
                    borderRadius: "24px",
                    padding: "1px",
                    background: `linear-gradient(120deg, ${activeColor}50, ${activeColor}10, ${activeColor}50)`,
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    pointerEvents: "none",
                }}
            />

            <div style={{
                background: "linear-gradient(135deg, #1C1C1E 0%, #0D0D0F 100%)",
                borderRadius: "23px",
                padding: "16px 20px 14px",
                textAlign: "center",
                boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(circle at 50% 10%, ${activeColor}15 0%, transparent 70%)`,
                    pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{ fontSize: "20px" }}
                    >🎁</motion.div>
                    <span style={{
                        fontSize: "9px", fontWeight: 900,
                        letterSpacing: "0.25em", textTransform: "uppercase",
                        color: activeColor, opacity: 0.9,
                    }}>LOYALTY REWARD TEASER</span>
                </div>

                <div style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -20, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            style={{ display: "flex", alignItems: "baseline", gap: "6px", position: "absolute" }}
                        >
                            <span style={{
                                fontSize: "32px",
                                fontWeight: 900,
                                color: activeColor,
                                letterSpacing: "-1px",
                                textShadow: `0 0 25px ${activeColor}40`,
                            }}>{current.pct}%</span>
                            <span style={{
                                fontSize: "12px", fontWeight: 800,
                                color: activeColor,
                                opacity: 0.8,
                                textTransform: "uppercase", letterSpacing: "0.1em",
                            }}>OFF • IN {current.label}</span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
                    {rows.map((r, i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                width: i === activeIdx ? 18 : 6, 
                                opacity: i === activeIdx ? 1 : 0.25,
                                backgroundColor: i === activeIdx ? r.color : "#fff"
                            }}
                            transition={{ duration: 0.4 }}
                            style={{ height: "4px", borderRadius: "9999px", cursor: "pointer" }}
                            onClick={() => setActiveIdx(i)}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

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
    const [tiers, setTiers] = useState([]);
    const [venueSettings, setVenueSettings] = useState({ loyaltyInterval: 1, googleReviewLink: '' });
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [showGiftScreen, setShowGiftScreen] = useState(false);

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
                        googleReviewLink: data.googleReviewLink || data.linkUrl || ''
                    });
                }
            });

            getDocs(query(collection(db, 'venues', venueId, 'tiers'), orderBy('percentage', 'desc'))).then(snap => {
                setTiers(snap.docs.map(d => d.data()));
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



    // Floating Gift Icon & Review Popup
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

                <VipGiftTeaser tiers={tiers} ambientColor={ambientColor} discountValue={discountValue} />

                {/* Discount Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] rounded-[32px] p-6 text-center shadow-2xl border border-white/10 relative overflow-hidden"
                >
                    <div className="absolute inset-0 border border-white/5 rounded-[32px] pointer-events-none mix-blend-overlay"></div>
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

            {(venueSettings.googleReviewLink) && (
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
                                className="absolute bottom-20 right-0 w-[300px] bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <button onClick={() => setIsReviewOpen(false)} className="text-white/20 hover:text-white transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <h3 className="text-[18px] font-black text-white mb-4 leading-tight uppercase tracking-tight">
                                        {t('review_instruction_title', 'Get a Bonus Gift!')}
                                    </h3>
                                    
                                    <div className="space-y-4 mb-6">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div key={step} className="flex gap-3">
                                                <div className="flex-shrink-0 w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-black text-white/40" style={{ borderColor: `${ambientColor}40` }}>
                                                    {step}
                                                </div>
                                                <p className="text-[12px] font-bold text-white/80 leading-snug">
                                                    {t(`review_instruction_step_${step}`)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            window.open(venueSettings.googleReviewLink, '_blank', 'noopener,noreferrer');
                                            setIsReviewOpen(false);
                                            setShowGiftScreen(true);
                                        }}
                                        className="w-full py-4 rounded-[18px] font-black text-[14px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg mb-2"
                                        style={{ backgroundColor: ambientColor, color: '#000', boxShadow: `0 10px 30px ${ambientColor}40` }}
                                    >
                                        {t('review_instruction_button', 'GO TO GOOGLE MAPS')}
                                    </button>
                                    
                                    <button
                                        onClick={() => setIsReviewOpen(false)}
                                        className="w-full py-3 rounded-[15px] font-bold text-[11px] uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                                    >
                                        {t('review_instruction_close', 'LATER')}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Success Overlay for Stars (Internal) - Keeping it simple for now or removing if needed */}
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
                         {/* Existing success overlay... same as before */}
                         <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${ambientColor}35 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
                         <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }} className="text-[90px] mb-8 relative z-10">🎁</motion.div>
                         <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-[32px] font-black tracking-tight text-white leading-tight mb-3 relative z-10" style={{ textShadow: `0 0 40px ${ambientColor}` }}>{t('review_gift_screen_title')}</motion.h2>
                         <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-[16px] font-semibold text-white/70 leading-relaxed mb-10 max-w-[280px] relative z-10">{t('review_gift_screen_sub')}</motion.p>
                         <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} onClick={() => setShowGiftScreen(false)} className="relative z-10 px-10 py-4 rounded-[20px] text-black font-black text-[16px] uppercase tracking-widest active:scale-[0.97] transition-all shadow-2xl" style={{ backgroundColor: ambientColor, boxShadow: `0 0 40px ${ambientColor}50` }}>{t('review_gift_close')}</motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnifiedActivation;
