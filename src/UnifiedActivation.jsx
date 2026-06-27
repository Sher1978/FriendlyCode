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
    const [isClaimed, setIsClaimed] = useState(true);
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

    // ── NPS & Google Review State ──
    const [starRating, setStarRating] = useState(0);
    const [hoverStar, setHoverStar] = useState(0);
    const [npsStep, setNpsStep] = useState('stars'); // 'stars' | 'complaint' | 'complaint_thanks' | 'google_offer' | 'claimed_reward'
    const [complaintText, setComplaintText] = useState('');
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
    const [hasAlreadyClaimedGoogle, setHasAlreadyClaimedGoogle] = useState(() => {
        return localStorage.getItem('googleReviewClaimed') === 'true';
    });

    const handleStarClick = (val) => {
        setStarRating(val);
        if (val <= 3) {
            setNpsStep('complaint');
        } else {
            setNpsStep('google_offer');
        }
    };

    const submitComplaint = async () => {
        if (!complaintText.trim() || isSubmittingComplaint) return;
        setIsSubmittingComplaint(true);
        try {
            const venueId = new URLSearchParams(location.search).get('venueId') || localStorage.getItem('currentVenueId') || 'unknown';
            await addDoc(collection(db, 'complaints'), {
                venueId,
                guestName,
                stars: starRating,
                complaintText,
                timestamp: serverTimestamp()
            });
            setNpsStep('complaint_thanks');
        } catch(e) {
            console.error("Complaint error:", e);
            setNpsStep('complaint_thanks');
        } finally {
            setIsSubmittingComplaint(false);
        }
    };

    const handleGoToGoogle = () => {
        const link = venueSettings.googleReviewLink || 'https://maps.google.com';
        window.open(link, '_blank', 'noopener,noreferrer');
        
        // Option 1: Trusted Smart Return
        const start = Date.now();
        const grantReward = () => {
            if (Date.now() - start > 10000) {
                localStorage.setItem('currentDiscount', '20');
                localStorage.setItem('googleReviewClaimed', 'true');
                setDiscountValue(20);
                setAmbientColor('#00FF41');
                setHasAlreadyClaimedGoogle(true);
                setNpsStep('claimed_reward');
                setShowGiftScreen(true);
            }
        };

        const handleVis = () => {
            if (document.visibilityState === 'visible') {
                grantReward();
                document.removeEventListener('visibilitychange', handleVis);
            }
        };
        
        document.addEventListener('visibilitychange', handleVis);
        setTimeout(grantReward, 15000);
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

    useEffect(() => {
        const autoClaim = async () => {
            const params = new URLSearchParams(location.search);
            const venueId = params.get('venueId') || localStorage.getItem('currentVenueId');
            if (venueId) {
                try {
                    await addDoc(collection(db, 'venues', venueId, 'redemptions'), {
                        guestName,
                        discount: discountValue,
                        timestamp: serverTimestamp()
                    });
                    console.log("Automatically logged redemption for:", guestName);
                } catch (e) {
                    console.warn("Auto-claim redemption logging failed:", e);
                }
            }
        };
        autoClaim();
    }, [guestName, discountValue, location.search]);

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

            {/* ── NPS INTERCEPT SMART GATE ── */}
            {!hasAlreadyClaimedGoogle && venueSettings.googleReviewLink && (
                <div className="relative z-20 w-full max-w-md mx-auto px-6 mt-6 mb-8">
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                        {npsStep === 'stars' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D4AF37] block mb-2">
                                    Оцените визит в {venueName || 'заведение'}
                                </span>
                                <div className="flex justify-center gap-3 my-4">
                                    {[1, 2, 3, 4, 5].map((st) => (
                                        <motion.button
                                            key={st}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onMouseEnter={() => setHoverStar(st)}
                                            onMouseLeave={() => setHoverStar(0)}
                                            onClick={() => handleStarClick(st)}
                                            className="text-3xl transition-colors focus:outline-none"
                                            style={{ color: st <= (hoverStar || starRating) ? '#FFD700' : '#4A4A4C' }}
                                        >
                                            <FontAwesomeIcon icon={faStar} />
                                        </motion.button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/40 font-medium">Ваше мнение помогает нам становиться лучше</p>
                            </motion.div>
                        )}

                        {npsStep === 'complaint' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <span className="text-xs font-bold uppercase tracking-wider text-red-400 block mb-2">
                                    Нам очень жаль! Что нам улучшить?
                                </span>
                                <textarea
                                    value={complaintText}
                                    onChange={(e) => setComplaintText(e.target.value)}
                                    placeholder="Опишите, что пошло не так..."
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500 mb-4"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNpsStep('stars')}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-xs font-bold uppercase hover:bg-white/10"
                                    >
                                        Назад
                                    </button>
                                    <button
                                        onClick={submitComplaint}
                                        disabled={isSubmittingComplaint || !complaintText.trim()}
                                        className="flex-2 py-3 px-6 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-50"
                                    >
                                        {isSubmittingComplaint ? 'Отправка...' : 'Отправить управляющему'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {npsStep === 'complaint_thanks' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4">
                                <FontAwesomeIcon icon={faHeart} className="text-2xl text-red-500 mb-2" />
                                <h3 className="text-sm font-bold text-white mb-1">Спасибо за ваш отзыв!</h3>
                                <p className="text-xs text-white/50">Мы уже передали информацию руководству и обязательно исправим недочеты.</p>
                            </motion.div>
                        )}

                        {npsStep === 'google_offer' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/20 text-[#00FF41] text-[10px] font-black uppercase tracking-wider mb-3">
                                    <FontAwesomeIcon icon={faGift} />
                                    <span>Спецпредложение</span>
                                </div>
                                <h3 className="text-base font-black text-white mb-2 leading-tight">
                                    Подарок за отзыв в Google Maps!
                                </h3>
                                <p className="text-xs text-white/70 mb-5 leading-relaxed">
                                    Оставьте ваш отзыв на Google Картах, и мы прямо сегодня начислим вам <span className="text-[#00FF41] font-bold">максимальную VIP-скидку 20% на 7 дней</span>!
                                </p>
                                <button
                                    onClick={handleGoToGoogle}
                                    className="w-full py-4 rounded-2xl bg-[#00FF41] text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,255,65,0.4)] transition-all active:scale-98"
                                >
                                    Оставить отзыв в Google
                                </button>
                                <button
                                    onClick={() => setHasAlreadyClaimedGoogle(true)}
                                    className="text-[10px] uppercase text-white/30 font-bold mt-4 block mx-auto hover:text-white"
                                >
                                    Не сейчас
                                </button>
                            </motion.div>
                        )}

                        {npsStep === 'claimed_reward' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 text-[#00FF41]">
                                <h3 className="text-sm font-black uppercase tracking-wider">Бонус активирован!</h3>
                                <p className="text-xs text-white/60 mt-1">Максимальная скидка закреплена за вами</p>
                            </motion.div>
                        )}
                    </div>
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
