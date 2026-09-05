import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faStar, faGift, faHeart, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, where, onSnapshot, updateDoc, limit } from 'firebase/firestore';
import UserMenu from './UserMenu';
import ScanInstructionAnimation from './ScanInstructionAnimation';
import { convertToGoogleReviewUrl } from './logic/googleMaps';
import giftxBox3D from './assets/giftx-box-3d.png';


// VIP Storage Wrappers to prevent SecurityErrors when storage is blocked (incognito/Telegram)
const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const safeSessionStorage = {
    getItem: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { console.warn('Session storage blocked'); } }
};

// VIP Gift Teaser Component
const VipGiftTeaser = ({ tiers, ambientColor, discountValue, minDiscount = 5, maxDiscount = 20 }) => {
    const [activeIdx, setActiveIdx] = useState(0);

    const rows = React.useMemo(() => {
        if (!tiers || tiers.length === 0) return [];
        return [...tiers]
            .filter(t => t.maxHours > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .map(t => {
                const days = Math.round(t.maxHours / 24);
                const label = days === 1 ? '1 DAY' : `${days} DAYS`;
                
                let tierColor = '#FFD700'; // Default gold for intermediate levels
                if (t.percentage >= maxDiscount) tierColor = '#00FF41'; // Maximum regular discount = Green
                else if (t.percentage >= 10) tierColor = '#FFD700'; // 10% and intermediate = Gold
                else tierColor = '#FFAA00'; // < 10% = Amber
                
                return { pct: t.percentage, label, color: tierColor };
            });
    }, [tiers, minDiscount, maxDiscount]);

    React.useEffect(() => {
        setActiveIdx(0);
        if (rows.length < 2) return;
        const id = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % rows.length);
        }, 2200);
        return () => clearInterval(id);
    }, [rows]);

    if (rows.length === 0) return null;

    const current = rows[activeIdx] || rows[0] || { pct: 0, label: '', color: '#FF3131' };
    const activeColor = current.color || '#FF3131';

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
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    // Venue Settings for logic
    const [venueName, setVenueName] = useState('');
    const [guestName, setGuestName] = useState(() => {
        const params = new URLSearchParams(location.search);
        return location.state?.guestName || params.get('guestName') || safeStorage.getItem('guestName') || 'Guest';
    });
    const [discountValue, setDiscountValue] = useState(() => {
        const params = new URLSearchParams(location.search);
        const stateValue = location.state?.discountValue ?? params.get('discount');
        if (stateValue !== undefined && stateValue !== null && !isNaN(Number(stateValue)) && Number(stateValue) > 0) {
            return Number(stateValue);
        }
        const cached = parseInt(safeStorage.getItem('currentDiscount'));
        return (!isNaN(cached) && cached > 0) ? cached : 10;
    });

    // Helper to get color based on deposit percentage threshold
    const getDepositColorTheme = (balance, settings) => {
        const targetDeposit = settings?.initialDeposit || settings?.depositTarget || settings?.depositMaxAmount || 1000000;
        const pct = Math.min(100, Math.max(0, (balance / targetDeposit) * 100));

        if (pct > 60) {
            return {
                pct,
                color: '#00FF41', // Emerald Green (> 60%)
                borderClass: 'border-[#00FF41]/60 shadow-[0_0_40px_rgba(0,255,65,0.25)]',
                textClass: 'text-[#00FF41]',
                badgeBg: 'bg-[#00FF41]/10 border-[#00FF41]/30 text-[#00FF41]',
                qrGlow: '0 0 24px 4px rgba(0, 255, 65, 0.4)',
                qrBorder: '1.5px solid rgba(0, 255, 65, 0.6)',
                isLow: false
            };
        } else if (pct > 40) {
            return {
                pct,
                color: '#FFD700', // Gold (> 40%)
                borderClass: 'border-[#FFD700]/60 shadow-[0_0_40px_rgba(255,215,0,0.25)]',
                textClass: 'text-[#FFD700]',
                badgeBg: 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]',
                qrGlow: '0 0 24px 4px rgba(255, 215, 0, 0.4)',
                qrBorder: '1.5px solid rgba(255, 215, 0, 0.6)',
                isLow: false
            };
        } else if (pct > 20) {
            return {
                pct,
                color: '#FACC15', // Yellow (> 20%)
                borderClass: 'border-[#FACC15]/60 shadow-[0_0_40px_rgba(250,204,21,0.25)]',
                textClass: 'text-[#FACC15]',
                badgeBg: 'bg-[#FACC15]/10 border-[#FACC15]/30 text-[#FACC15]',
                qrGlow: '0 0 24px 4px rgba(250, 204, 21, 0.4)',
                qrBorder: '1.5px solid rgba(250, 204, 21, 0.6)',
                isLow: false
            };
        } else {
            return {
                pct,
                color: '#FF3131', // Red (< 20%)
                borderClass: 'border-[#FF3131] shadow-[0_0_50px_rgba(255,49,49,0.4)]',
                textClass: 'text-[#FF3131]',
                badgeBg: 'bg-[#FF3131]/20 border-[#FF3131]/60 text-[#FF3131]',
                qrGlow: '0 0 24px 6px rgba(255, 49, 49, 0.6)',
                qrBorder: '2px solid rgba(255, 49, 49, 0.8)',
                isLow: true
            };
        }
    };

    // Helper to get color based on discount (Green for max, Gold for >= 10%, Amber for < 10%)
    const getTierColor = (val) => {
        const maxD = venueSettings?.maxDiscount ?? 20;
        
        if (val >= maxD) return '#00FF41'; // Maximum regular discount - Green
        if (val >= 10) return '#FFD700'; // 10% and intermediate levels - Gold
        return '#FFAA00'; // < 10% - Amber
    };

    const [ambientColor, setAmbientColor] = useState('#FFD700');
    const [tiers, setTiers] = useState([]);
    const [venueSettings, setVenueSettings] = useState({ loyaltyInterval: 1, googleReviewLink: '', giftxUrl: '', minDiscount: 5, maxDiscount: 20 });
    const [depositBalance, setDepositBalance] = useState(() => {
        const cached = safeStorage.getItem('cached_deposit_balance');
        return cached ? Number(cached) : 0;
    });
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Keep ambientColor in sync with depositBalance or discountValue
    useEffect(() => {
        if (depositBalance > 0) {
            const theme = getDepositColorTheme(depositBalance, venueSettings);
            setAmbientColor(theme.color);
        } else {
            setAmbientColor(getTierColor(discountValue));
        }
    }, [depositBalance, discountValue, venueSettings]);

    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [showGiftScreen, setShowGiftScreen] = useState(false);

    // ── NPS & Google Review State ──
    const [starRating, setStarRating] = useState(0);
    const [hoverStar, setHoverStar] = useState(0);
    const [npsStep, setNpsStep] = useState('stars'); // 'stars' | 'complaint' | 'complaint_thanks' | 'google_offer' | 'claimed_reward'
    const [complaintText, setComplaintText] = useState('');
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
    const [hasAlreadyClaimedGoogle, setHasAlreadyClaimedGoogle] = useState(() => {
        return safeStorage.getItem('googleReviewClaimed') === 'true';
    });
    const [promoModalState, setPromoModalState] = useState('hidden'); // 'hidden' | 'expanded' | 'collapsed'
    const [userProfile, setUserProfile] = useState(null);
    const [activeVenueId, setActiveVenueId] = useState('');
    const [txNotification, setTxNotification] = useState({ show: false, type: 'CREDIT', amount: 0, balance: 0, id: '' });

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
            const venueId = new URLSearchParams(location.search).get('venueId') || safeStorage.getItem('currentVenueId') || 'unknown';
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
        const rawLink = venueSettings.googleReviewLink || 'https://maps.google.com';
        const link = convertToGoogleReviewUrl(rawLink);
        window.open(link, '_blank', 'noopener,noreferrer');
        
        // 10-second timer to update DB and unlock 7-day maximum regular discount
        setTimeout(async () => {
            const targetDiscount = venueSettings.maxDiscount || 20;
            const nowIso = new Date().toISOString();

            safeStorage.setItem('currentDiscount', targetDiscount.toString());
            safeStorage.setItem('googleReviewClaimed', 'true');
            if (activeVenueId) {
                safeStorage.setItem(`googleReviewClaimed_${activeVenueId}`, 'true');
            }

            if (auth.currentUser?.uid && activeVenueId) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        [`googleReviews.${activeVenueId}`]: 'completed',
                        [`googleReviewCompletedAt.${activeVenueId}`]: nowIso
                    });
                    console.log("Google review status saved to Firestore successfully.");
                } catch (e) {
                    console.warn("Error persisting google review status to Firestore:", e);
                }
            }

            setDiscountValue(targetDiscount);
            setAmbientColor(getTierColor(targetDiscount));
            setHasAlreadyClaimedGoogle(true);
            setNpsStep('claimed_reward');
            setShowGiftScreen(true);
        }, 10000);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const venueId = params.get('venueId') || safeStorage.getItem('currentVenueId') || 'unknown';
        setActiveVenueId(venueId);

        if (venueId && venueId !== 'unknown') {
            getDoc(doc(db, 'venues', venueId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setVenueName(data.name);

                    const savedLang = safeStorage.getItem('userLanguage');
                    const targetLang = savedLang || data.defaultLanguage || 'en';
                    if (i18n.language !== targetLang) i18n.changeLanguage(targetLang);
                    
                    let maxPerc = 20;
                    let minPerc = 5;
                    if (data.loyaltyConfig) {
                        if (Array.isArray(data.loyaltyConfig)) {
                            const percs = data.loyaltyConfig.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
                            if (percs.length > 0) {
                                maxPerc = Math.max(...percs);
                                minPerc = Math.min(...percs);
                            }
                        } else {
                            if (data.loyaltyConfig.percVip !== undefined) {
                                maxPerc = Number(data.loyaltyConfig.percVip);
                            }
                            if (data.loyaltyConfig.percBase !== undefined) {
                                minPerc = Number(data.loyaltyConfig.percBase);
                            }
                        }
                    }
                    if (data.baseDiscount !== undefined) {
                        minPerc = Number(data.baseDiscount);
                    }

                    const depPerc = Number(
                        data.depositConfig?.bonusPercent ??
                        data.depositConfig?.percent ??
                        data.depositBonusPercent ??
                        data.depositDiscount ??
                        data.loyaltyConfig?.percDeposit ??
                        maxPerc
                    );

                    setVenueSettings({
                        loyaltyInterval: data.loyaltyInterval || 1,
                        googleReviewLink: data.googleReviewLink || data.googleMapsUrl || data.linkUrl || '',
                        giftxUrl: data.giftxUrl || '',
                        minDiscount: minPerc,
                        maxDiscount: maxPerc,
                        depositDiscount: depPerc
                    });
                    
                    if (location.state?.fromGoogleMaps) {
                        setDiscountValue(maxPerc);
                        safeStorage.setItem('currentDiscount', maxPerc.toString());
                        safeStorage.setItem('googleMapsBonusActivated', new Date().toISOString());
                        safeStorage.setItem('googleReviewClaimed', 'true');
                    }
                }
            });

            getDocs(query(collection(db, 'deposit_tiers'), where('venueId', '==', venueId))).then(snap => {
                if (!snap.empty) {
                    const fetchedTiers = snap.docs.map(d => d.data());
                    const maxDepTier = Math.max(...fetchedTiers.map(t => Number(t.discountPercentage || t.percentage || t.bonusPercent || 0)).filter(p => p > 0));
                    if (maxDepTier > 0) {
                        setVenueSettings(prev => ({ ...prev, depositDiscount: maxDepTier }));
                    }
                }
            }).catch(err => console.warn("Deposit tiers fetch fallback:", err));

            getDocs(query(collection(db, 'venues', venueId, 'tiers'), orderBy('percentage', 'desc'))).then(snap => {
                setTiers(snap.docs.map(d => d.data()));
            });
        }

        // Set up auth changes & real-time onSnapshot user profile listener
        let unsubscribeUserDoc = null;
        let unsubscribeTx = null;
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
                unsubscribeUserDoc = null;
            }
            if (unsubscribeTx) {
                unsubscribeTx();
                unsubscribeTx = null;
            }
            if (user) {
                unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (userSnap) => {
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        
                        let newBalance = 0;
                        if (userData.deposit_balances && userData.deposit_balances[venueId] !== undefined) {
                            newBalance = Number(userData.deposit_balances[venueId] || 0);
                        } else if (userData.deposits && userData.deposits[venueId] !== undefined) {
                            const val = userData.deposits[venueId];
                            newBalance = Number(typeof val === 'object' ? (val.balance || 0) : val);
                        } else if (userData.deposit_venue_id) {
                            newBalance = userData.deposit_venue_id === venueId ? Number(userData.deposit_balance || 0) : 0;
                        } else if (!userData.venueId || userData.venueId === venueId || venueId === 'demo') {
                            newBalance = Number(userData.deposit_balance || 0);
                        }

                        setDepositBalance(newBalance);
                        safeStorage.setItem('cached_deposit_balance', String(newBalance));

                        setUserProfile((prevProfile) => {
                            return userData;
                        });
                        
                        const hasClaimed = userData.googleReviews?.[venueId] === 'completed';
                        if (hasClaimed) {
                            setHasAlreadyClaimedGoogle(true);
                            safeStorage.setItem('googleReviewClaimed', 'true');
                        }
                        setIsDataLoaded(true);
                    } else {
                        setIsDataLoaded(true);
                    }
                }, (err) => {
                    console.error("Error listening to user profile in UnifiedActivation:", err);
                    setIsDataLoaded(true);
                });

                unsubscribeTx = onSnapshot(
                    query(collection(db, 'deposit_transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1)),
                    (txSnap) => {
                        if (!txSnap.empty) {
                            const docSnap = txSnap.docs[0];
                            const tx = docSnap.data();
                            const txId = docSnap.id;
                            
                            const shownTxs = JSON.parse(safeStorage.getItem('shown_tx_ids') || '[]');
                            if (!shownTxs.includes(txId)) {
                                const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : (tx.createdAt ? new Date(tx.createdAt) : new Date(0));
                                const now = new Date();
                                const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;
                                const cachedDepositBal = Number(safeStorage.getItem('cached_deposit_balance') || '0');
                                
                                if (diffMinutes < 15 && cachedDepositBal <= 0) {
                                    setTxNotification({
                                        show: true,
                                        type: tx.transactionType || tx.type || 'CREDIT',
                                        amount: Number(tx.finalAmount ?? tx.totalCredit ?? tx.amount ?? 0),
                                        balance: tx.newBalance || tx.balanceAfter || 0,
                                        id: txId
                                    });
                                }
                                
                                shownTxs.push(txId);
                                safeStorage.setItem('shown_tx_ids', JSON.stringify(shownTxs.slice(-20))); // Keep last 20
                            }
                        }
                    },
                    (err) => console.warn("Error listening to tx:", err)
                );
            } else {
                setUserProfile(null);
                setIsDataLoaded(true);
            }
        });

        // Trigger promo modal after ~10s delay
        const timer = setTimeout(() => {
            setPromoModalState('expanded');
        }, 10000);

        return () => {
            if (unsubscribeUserDoc) unsubscribeUserDoc();
            if (unsubscribeTx) unsubscribeTx();
            unsubscribeAuth();
            clearTimeout(timer);
        };
    }, []);


    useEffect(() => {
        const autoClaim = async () => {
            const params = new URLSearchParams(location.search);
            const venueId = params.get('venueId') || location.state?.venueId || safeStorage.getItem('currentVenueId');
            const guestEmail = location.state?.guestEmail || safeStorage.getItem('guestEmail') || auth.currentUser?.email || '';
            const uid = auth.currentUser?.uid || safeStorage.getItem('effectiveUid') || '';
            const acquisitionSource = location.state?.acquisition_source || null;
            
            if (venueId && venueId !== 'demo') {
                const sessionKey = `logged_visit_${venueId}_${guestEmail.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;
                if (!safeSessionStorage.getItem(sessionKey)) {
                    safeSessionStorage.setItem(sessionKey, 'true');
                    try {
                        // 1. Add to main visits collection (used for Loyalty Reward calculations & visit history)
                        if (guestEmail) {
                            await addDoc(collection(db, 'visits'), {
                                guestEmail: guestEmail.toLowerCase(),
                                guestName: guestName || 'Guest',
                                venueId: venueId,
                                discount: discountValue,
                                uid: uid,
                                timestamp: serverTimestamp(),
                                source: 'qr_reward_claim',
                                ...(acquisitionSource ? { acquisition_source: acquisitionSource } : {})
                            });
                            console.log("Logged visit in 'visits' collection for:", guestEmail);
                        }

                        // 2. Add to venue redemptions subcollection
                        await addDoc(collection(db, 'venues', venueId, 'redemptions'), {
                            guestEmail: guestEmail ? guestEmail.toLowerCase() : '',
                            guestName: guestName || 'Guest',
                            discount: discountValue,
                            timestamp: serverTimestamp(),
                            ...(acquisitionSource ? { acquisition_source: acquisitionSource } : {})
                        });
                        console.log("Logged redemption for venue:", venueId);
                    } catch (e) {
                        console.warn("Auto-claim redemption logging failed:", e);
                    }
                }
            }
        };
        autoClaim();
    }, [guestName, discountValue, location.search, location.state]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    // Floating Gift Icon & Review Popup
    if (!isDataLoaded) {
        return (
            <div className="flex flex-col min-h-screen bg-black font-sans items-center justify-center relative">
                 <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white antialiased overflow-hidden relative" style={{ WebkitFontSmoothing: 'antialiased' }}>
            
            {/* Ambient Ambient Glow */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: ambientColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: ambientColor }} />

            {/* Header / Nav */}
            <div className="pt-6 px-6 flex justify-between items-center z-50 w-full max-w-md mx-auto">
                <UserMenu 
                    user={auth.currentUser}
                    isGuestView={true}
                    venueColor={ambientColor}
                    trigger={
                        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-xl border border-white/10 cursor-pointer active:scale-95 transition-all text-white">
                            <FontAwesomeIcon icon={faUser} className="text-xs text-white/70" />
                            <span className="text-[12px] font-bold tracking-wide text-white truncate max-w-[120px]">{guestName}</span>
                        </div>
                    }
                />
                <button
                    onClick={() => {
                        const vId = activeVenueId || safeStorage.getItem('currentVenueId') || 'demo';
                        navigate(`/test?id=${vId}`);
                    }}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-xl px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/10 active:scale-95 transition-all uppercase shadow-lg"
                >
                    {t('back', 'Назад')}
                </button>
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

                {/* VipGiftTeaser: hide when active deposit is present */}
                {depositBalance <= 0 && (
                    <VipGiftTeaser 
                        tiers={tiers} 
                        ambientColor={ambientColor} 
                        discountValue={discountValue} 
                        minDiscount={venueSettings.minDiscount} 
                        maxDiscount={venueSettings.maxDiscount} 
                    />
                )}

                {/* Card: Scenario 1 (Discount % + Battery) OR Scenario 2 (Deposit QR + Balance) */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] rounded-[32px] p-6 text-center shadow-2xl border ${depositBalance > 0 ? 'border-[#D4AF37]/40' : 'border-white/10'} relative overflow-hidden`}
                >
                    <div className="absolute inset-0 border border-white/5 rounded-[32px] pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    {depositBalance > 0 ? (
                        /* ── SCENARIO 2: DEPOSIT HOLDER VIEW (Color-coded based on deposit percentage) ── */
                        (() => {
                            const depTheme = getDepositColorTheme(depositBalance, venueSettings);
                            return (
                                <>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className={`relative z-10 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border ${depTheme.badgeBg}`}>
                                            💰 {t('current_deposit_balance', { defaultValue: 'Текущий баланс депозита' })} ({Math.round(depTheme.pct)}%)
                                        </span>
                                    </div>

                                    <div className="relative z-10 my-3">
                                        <span className="text-[40px] sm:text-[44px] font-black leading-none text-white tracking-tight drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
                                            {depositBalance.toLocaleString()} <span className="text-base font-medium text-white/50">₫</span>
                                        </span>
                                    </div>

                                    <div className="mt-4 relative z-10">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                <div
                                                    className="absolute inset-[-6px] rounded-[22px] pointer-events-none transition-all duration-500"
                                                    style={{ boxShadow: depTheme.qrGlow, border: depTheme.qrBorder }}
                                                />
                                                <div className="bg-white rounded-[18px] p-3 shadow-2xl">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=156x156&data=${encodeURIComponent(
                                                            `https://bot-lab-21910.web.app/admin/deposit?search=${auth.currentUser?.uid || userProfile?.id || auth.currentUser?.email || userProfile?.email || safeStorage.getItem('effectiveUid') || safeStorage.getItem('guestEmail') || ''}&action=topup`
                                                        )}`}
                                                        alt="Deposit QR"
                                                        className="w-[156px] h-[156px] block"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-1.5 mt-1">
                                                <span style={{ color: depTheme.color }} className="text-[10px] font-black uppercase tracking-[0.2em]">
                                                    {t('deposit_qr_code', { defaultValue: '💰 QR-КОД ДЛЯ ВНЕСЕНИЯ / СПИСАНИЯ ДЕПОЗИТА' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ⚠️ LOW BALANCE WARNING NOTICE (< 20%) */}
                                    {depTheme.isLow && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 p-3.5 bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 border-2 border-red-500/90 rounded-2xl text-center shadow-[0_0_30px_rgba(255,49,49,0.5)]"
                                        >
                                            <div className="flex items-center justify-center gap-1.5 text-red-400 font-black text-xs uppercase tracking-wider mb-1">
                                                <span className="text-base animate-bounce">⚠️</span>
                                                <span>{t('deposit_balance_low_warning_title', 'DEPOSIT TOP-UP REQUIRED')}</span>
                                            </div>
                                            <p className="text-[11px] text-white font-semibold leading-relaxed">
                                                {t('deposit_balance_low_warning_desc', { percent: Math.round(depTheme.pct), defaultValue: `Deposit balance is below 20% (${Math.round(depTheme.pct)}%). Top up with your waiter to keep your locked discount!` })}
                                            </p>
                                        </motion.div>
                                    )}
                                </>
                            );
                        })()
                    ) : (
                        /* ── SCENARIO 1: REGULAR DISCOUNT VIEW (Discount % + Battery, NO deposit QR) ── */
                        <>
                            <span className="relative z-10 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                                {t('current_discount')}
                            </span>

                            <div className="relative z-10 my-4">
                                <span className="text-[72px] font-bold leading-none text-white tracking-tighter" style={{ textShadow: `0 0 40px ${ambientColor}` }}>
                                    {discountValue}%
                                </span>
                                <span className="block text-[12px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                    {t('off_total_bill', { defaultValue: 'СКИДКА ОТ ОБЩЕГО СЧЕТА' })}
                                </span>
                            </div>

                            <div className="mt-6 relative z-10">
                                <div className="h-[220px] relative flex justify-center items-center transition-all duration-300">
                                    <ScanInstructionAnimation ambientColor={ambientColor} discountValue={discountValue} />
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Instruction */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center text-[12px] font-medium text-white/50 mt-4 max-w-[280px] leading-relaxed"
                >
                    {depositBalance > 0
                        ? t('deposit_balance_instruction', { balance: depositBalance.toLocaleString(), currency: '₫' })
                        : t('show_counter_instruction')}
                </motion.p>
            </div>

            {/* ── TRANSACTION NOTIFICATION POPUP ── */}
            <AnimatePresence>
                {txNotification.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            className={`bg-[#1C1C1E] border-2 rounded-[32px] p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden w-full max-w-sm ${
                                txNotification.type === 'CREDIT' ? 'border-[#00FF41] shadow-[0_0_50px_rgba(0,255,65,0.3)]' : 'border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
                            }`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce ${
                                txNotification.type === 'CREDIT' ? 'bg-[#00FF41]/20 border border-[#00FF41]/40' : 'bg-rose-500/20 border border-rose-500/40'
                            }`}>
                                {txNotification.type === 'CREDIT' ? '💰' : '📉'}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 leading-tight">
                                {txNotification.type === 'CREDIT' ? t('deposit_topped_up', 'Депозит пополнен!') : t('deposit_deducted', 'Списание с депозита')}
                            </h3>
                            <p className="text-sm font-medium text-white/70 mb-4">
                                {txNotification.type === 'CREDIT' 
                                    ? t('deposit_topup_success_sub', 'Ваш счет успешно пополнен')
                                    : t('deposit_deduction_success_sub', 'Сумма списана по вашему чеку')}
                            </p>
                            
                            <div className="flex justify-center gap-3 mb-6">
                                <div className={`border rounded-2xl p-4 flex flex-col w-1/2 ${
                                    txNotification.type === 'CREDIT' ? 'bg-[#00FF41]/10 border-[#00FF41]/30' : 'bg-rose-500/10 border-rose-500/30'
                                }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                        txNotification.type === 'CREDIT' ? 'text-[#00FF41]' : 'text-rose-400'
                                    }`}>
                                        {txNotification.type === 'CREDIT' ? 'Пополнено' : 'Списано'}
                                    </span>
                                    <span className="text-xl font-black text-white">
                                        {txNotification.type === 'CREDIT' ? '+' : '-'}{txNotification.amount.toLocaleString()} ₫
                                    </span>
                                </div>
                                <div className={`border rounded-2xl p-4 flex flex-col w-1/2 ${
                                    txNotification.type === 'CREDIT' ? 'bg-[#00FF41]/10 border-[#00FF41]/30' : 'bg-rose-500/10 border-rose-500/30'
                                }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                        txNotification.type === 'CREDIT' ? 'text-[#00FF41]' : 'text-rose-400'
                                    }`}>
                                        Баланс
                                    </span>
                                    <span className="text-xl font-black text-white">
                                        {txNotification.balance.toLocaleString()} ₫
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setTxNotification({ show: false, type: 'CREDIT', amount: 0, balance: 0, id: '' })}
                                className={`w-full py-4 rounded-2xl text-black font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,0,0,0.4)] active:scale-95 transition-transform ${
                                    txNotification.type === 'CREDIT' ? 'bg-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.4)]' : 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                                }`}
                            >
                                {t('great', 'Отлично')}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── VIP STATUS BOOST DIALOG (EXPANDED MODAL WITH SWIPE-DOWN COLLAPSE) ── */}
            <AnimatePresence>
                {promoModalState === 'expanded' && depositBalance <= 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    >
                        {/* Click backdrop to collapse */}
                        <div className="absolute inset-0" onClick={() => setPromoModalState('collapsed')} />

                        <motion.div
                            initial={{ y: "100%", scale: 0.95 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: "100%", scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 300 }}
                            dragElastic={0.2}
                            onDragEnd={(e, info) => {
                                if (info.offset.y > 60 || info.velocity.y > 200) {
                                    setPromoModalState('collapsed');
                                }
                            }}
                            className="bg-[#1C1C1E]/95 border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden w-full max-w-sm z-10 touch-pan-y"
                        >
                            {/* Drag handle pill */}
                            <div 
                                onClick={() => setPromoModalState('collapsed')}
                                className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-4 cursor-pointer hover:bg-white/50 transition-colors"
                            />

                            {/* Inner ambient glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            {/* Close Button */}
                            <button
                                onClick={() => setPromoModalState('collapsed')}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-xs transition-colors"
                            >
                                ✕
                            </button>

                            {/* Icon / Badge */}
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                                    <FontAwesomeIcon icon={faGift} className="text-xl" />
                                </div>
                            </div>

                            {(!hasAlreadyClaimedGoogle && venueSettings.googleReviewLink) ? (
                                /* Condition A: Google Maps Review Offer */
                                <>
                                    {npsStep === 'stars' && (
                                        <>
                                            <h3 className="text-xl font-black text-white mb-2 leading-tight">
                                                Оцените визит
                                            </h3>
                                            <p className="text-sm font-medium text-white/80 mb-5 leading-relaxed">
                                                Нам важно ваше мнение. Как все прошло?
                                            </p>
                                            <div className="flex justify-center gap-2 mb-6">
                                                {[1,2,3,4,5].map(star => (
                                                    <FontAwesomeIcon 
                                                        key={star} 
                                                        icon={faStar} 
                                                        className={`text-3xl cursor-pointer transition-colors ${(hoverStar || starRating) >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                                                        onMouseEnter={() => setHoverStar(star)}
                                                        onMouseLeave={() => setHoverStar(0)}
                                                        onClick={() => handleStarClick(star)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {npsStep === 'complaint' && (
                                        <>
                                            <h3 className="text-lg font-black text-white mb-2">Что пошло не так?</h3>
                                            <textarea 
                                                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white text-sm mb-4 min-h-[80px]"
                                                placeholder="Расскажите подробнее..."
                                                value={complaintText}
                                                onChange={e => setComplaintText(e.target.value)}
                                            />
                                            <button 
                                                onClick={submitComplaint}
                                                disabled={isSubmittingComplaint}
                                                className="w-full py-3 rounded-xl bg-white/20 text-white font-bold text-xs uppercase tracking-wider"
                                            >
                                                {isSubmittingComplaint ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ОТЗЫВ'}
                                            </button>
                                        </>
                                    )}
                                    {npsStep === 'complaint_thanks' && (
                                        <>
                                            <h3 className="text-lg font-black text-white mb-2">Спасибо!</h3>
                                            <p className="text-sm text-white/70 mb-6">Мы обязательно исправим эту ситуацию. Ваша скидка остается активной.</p>
                                            <button onClick={() => setPromoModalState('collapsed')} className="w-full py-3 rounded-xl bg-[#00FF41] text-black font-bold uppercase text-xs">Закрыть</button>
                                        </>
                                    )}
                                    {npsStep === 'google_offer' && (
                                        <>
                                            <h3 className="text-xl font-black text-white mb-2 leading-tight">
                                                {t('google_review_gift_title', 'Спасибо за высокую оценку!')}
                                            </h3>
                                            <p className="text-sm font-medium text-white/80 mb-6 leading-relaxed">
                                                {t('google_review_gift_desc', { percent: venueSettings.maxDiscount || 20, defaultValue: `Оставьте отзыв на Google Maps и получите ${venueSettings.maxDiscount || 20}% скидку!` })}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    handleGoToGoogle();
                                                    setPromoModalState('collapsed');
                                                }}
                                                className="w-full py-3.5 rounded-xl bg-[#00FF41] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,65,0.3)] transition-all active:scale-95"
                                            >
                                                {t('leave_google_review', 'ПЕРЕЙТИ НА GOOGLE MAPS')}
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                /* Condition B: Deposit Offer */
                                <>
                                    <h3 className="text-xl font-black text-white mb-2 leading-tight">
                                        {t('permanent_vip_title', { percent: venueSettings.depositDiscount || venueSettings.maxDiscount || 20 })}
                                    </h3>
                                    <p className="text-sm font-medium text-white/80 mb-5 leading-relaxed">
                                        {t('permanent_vip_desc')}
                                    </p>
                                    
                                    {/* QR Code for Staff */}
                                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl mx-auto mb-4 w-44 h-44 shadow-lg border border-white/10">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=152x152&data=${encodeURIComponent(
                                                `https://bot-lab-21910.web.app/admin/deposit?search=${auth.currentUser?.uid || userProfile?.id || auth.currentUser?.email || userProfile?.email || safeStorage.getItem('effectiveUid') || safeStorage.getItem('guestEmail') || guestName || ''}&action=topup`
                                            )}`}
                                            alt="Scan to Top Up"
                                            className="w-[152px] h-[152px]"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white/70 mb-5 uppercase tracking-wider">
                                        {t('show_qr_to_staff')}
                                    </p>

                                    <button
                                        onClick={() => setPromoModalState('collapsed')}
                                        className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-95"
                                    >
                                        {t('close')}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── BOTTOM DUAL WIDGETS (GIFTX AT LEFT EDGE + DEPOSIT AT RIGHT EDGE, EXACT HEIGHT ALIGNMENT h-[56px]) ── */}
            <AnimatePresence>
                {promoModalState === 'collapsed' && (
                    <>
                        {/* 1. GIFTX WIDGET (LEFT EDGE OF SCREEN) */}
                        {(() => {
                            const giftxUrl = venueSettings?.giftxUrl || venueData?.giftxUrl || 'https://giftx.app';
                            return (
                                <motion.div
                                    initial={{ y: 80, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 80, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => window.open(giftxUrl, '_blank', 'noopener,noreferrer')}
                                    className="fixed bottom-4 left-4 sm:left-6 z-[170] cursor-pointer flex items-center gap-2.5 bg-[#1C1C1E]/95 border-2 border-[#FF2A85]/60 rounded-2xl px-3.5 py-2 backdrop-blur-2xl shadow-[0_10px_25px_rgba(255,42,133,0.35)] h-[56px] select-none group hover:border-[#FF2A85] transition-all max-w-[48%] sm:max-w-[220px]"
                                    title="GiftX"
                                >
                                    {/* Magenta Ambient Glow */}
                                    <div className="absolute top-0 left-0 w-24 h-24 bg-[#FF2A85]/15 rounded-full blur-xl pointer-events-none" />
                                    
                                    {/* 3D Box Icon Badge */}
                                    <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#FF2A85] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,42,133,0.5)] relative z-10 overflow-hidden">
                                        <motion.img
                                            src={giftxBox3D}
                                            alt="GiftX"
                                            animate={{
                                                rotate: [0, 2, -2.5, 3, -1.5, 2.5, -3, 1.5, -2, 0]
                                            }}
                                            transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
                                            className="w-6 h-6 object-contain pointer-events-none"
                                        />
                                    </div>

                                    {/* Title & Subtitle */}
                                    <div className="flex flex-col text-left relative z-10 min-w-0 pr-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF2A85] leading-none">GiftX</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.2 rounded-full bg-[#FF2A85]/20 border border-[#FF2A85]/40 text-[#FF2A85]">🎁</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/90 leading-tight mt-0.5 truncate">
                                            {t('gift_cards', 'Gift Certificates')}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })()}

                        {/* 2. DEPOSIT PROMO STRIP (RIGHT EDGE OF SCREEN - EXACT SAME HEIGHT h-[56px]) */}
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setPromoModalState('expanded')}
                            className="fixed bottom-4 right-4 sm:right-6 z-[170] cursor-pointer flex items-center gap-2.5 bg-[#1C1C1E]/95 border-2 border-[#D4AF37]/60 rounded-2xl px-3.5 py-2 backdrop-blur-2xl shadow-[0_10px_25px_rgba(212,175,55,0.35)] h-[56px] select-none group hover:border-[#D4AF37] transition-all max-w-[48%] sm:max-w-[220px]"
                        >
                            {/* Gold Ambient Glow */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/15 rounded-full blur-xl pointer-events-none" />
                            
                            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] text-sm shrink-0 relative z-10">
                                <FontAwesomeIcon icon={faGift} className="animate-pulse" />
                            </div>
                            <div className="flex flex-col text-left relative z-10 min-w-0 pr-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] leading-none">
                                    💰 VIP Deposit
                                </span>
                                <span className="text-[10px] font-bold text-white leading-tight mt-0.5 truncate">
                                    {t('vip_discount_label', { percent: venueSettings.depositDiscount || venueSettings.maxDiscount || 20, defaultValue: `${venueSettings.depositDiscount || venueSettings.maxDiscount || 20}% VIP DISCOUNT` })}
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnifiedActivation;
