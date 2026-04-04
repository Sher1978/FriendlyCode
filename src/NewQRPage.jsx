import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faChevronRight, faChevronDown, faClock, faUser, faExclamationTriangle, faGift } from '@fortawesome/free-solid-svg-icons';
import UserMenu from './UserMenu';
import { motion } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { RewardCalculator } from './logic/RewardCalculator';
import PngBattery, { getBatteryConfig } from './PngBattery';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const NewQRPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [discount, setDiscount] = useState(5);
    const [venueName, setVenueName] = useState('');
    const [cooldown, setCooldown] = useState(null);
    const [minDelayPassed, setMinDelayPassed] = useState(false);

    const [debugClicks, setDebugClicks] = useState(0);
    const [lastVisitDebug, setLastVisitDebug] = useState(null);

    const [guestName, setGuestName] = useState('');
    const [userRole, setUserRole] = useState('guest');
    const [loyaltyConfig, setLoyaltyConfig] = useState(null);
    const [predictionState, setPredictionState] = useState({
        percent: 5, secondsLeft: 0, label: 'reset', isBase: true, isMax: false
    });
    const location = useLocation();

    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; }, [status]);

    useEffect(() => {
        const timer = setTimeout(() => setMinDelayPassed(true), 1000);
        const safetyTimeoutId = setTimeout(() => {
            if (statusRef.current === 'loading') {
                console.error("Auth timed out");
                setStatus('error');
            }
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try { await signInAnonymously(auth); } catch (e) {
                    console.error("Anonymous sign-in failed:", e);
                    setStatus('error');
                }
                return;
            }
            clearTimeout(safetyTimeoutId);

            const checkUserAndVenue = async () => {
                const searchParams = new URLSearchParams(location.search);
                const rawId = searchParams.get('id') || searchParams.get('v') || 'default_venue';
                const bypassLanding = searchParams.get('bypass_landing') === 'true';
                // Robustness: strip potential encoding artifacts like '3D' at the start
                const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
                safeStorage.setItem('currentVenueId', venueId);

                try {
                    const venueRef = doc(db, 'venues', venueId);
                    const venueSnap = await getDoc(venueRef);
                    if (!venueSnap.exists()) { setStatus('error'); return; }

                    const venueData = venueSnap.data();
                    setVenueName(venueData.name || '');
                    if (venueData.loyaltyConfig) setLoyaltyConfig(venueData.loyaltyConfig);

                    // --- LANGUAGE INITIALIZATION ---
                    const savedLang = safeStorage.getItem('userLanguage');
                    const venueLang = venueData.defaultLanguage || 'en';
                    
                    // Priority: 1. Manual User Selection, 2. Venue Default
                    const targetLang = savedLang || venueLang;
                    if (i18n.language !== targetLang) {
                        console.log(`Setting language to ${targetLang} (Saved: ${savedLang}, Venue: ${venueLang})`);
                        i18n.changeLanguage(targetLang);
                    }
                    // --------------------------------

                    const now = new Date();
                    const expiry = venueData.subscription?.expiryDate?.toDate();
                    if (!venueData.isActive || (expiry && expiry < now)) { setStatus('blocked'); return; }

                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    let userData = userSnap.exists() ? userSnap.data() : null;

                    let resolvedName = '';
                    if (userData) {
                        setUserRole(userData.role || 'guest');
                        const displayName = userData.displayName || userData.name;
                        if (displayName) { 
                            resolvedName = displayName;
                            setGuestName(displayName); 
                            safeStorage.setItem('guestName', displayName); 
                        }
                        if (userData.email) safeStorage.setItem('guestEmail', userData.email);
                    } else {
                        const savedName = safeStorage.getItem('guestName');
                        if (savedName) {
                            resolvedName = savedName;
                            setGuestName(savedName);
                        }
                    }

                    // --- B2C INTERCEPT LOGIC ---
                    if (!resolvedName && !bypassLanding) {
                        // User is completely new, and hasn't been funneled through the landing page yet
                        window.location.href = `/?qr_venue_id=${venueId}`;
                        return;
                    }
                    // ---------------------------

                    const rawEmail = userData?.email || safeStorage.getItem('guestEmail') || '';
                    const email = rawEmail.toLowerCase();
                    let calculatedDiscount = 5;
                    let result = null;
                    let debugInfo = { email: email || 'No Email', uid: user.uid, venueId, daysAgoStr: 'Никогда', history: 'Нет', discountToday: 5, diffDays: 'N/A' };

                    if (email) {
                        const qVisits = query(collection(db, 'visits'), where('guestEmail', '==', email), where('venueId', '==', venueId), orderBy('timestamp', 'desc'), limit(10));
                        const querySnapshot = await getDocs(qVisits);

                        if (!querySnapshot.empty) {
                            const docs = querySnapshot.docs;
                            const uniqueDays = [];
                            const tz = venueData.timezone || 'Asia/Dubai';

                            docs.forEach(docSnap => {
                                const timestamp = docSnap.data().timestamp;
                                if (!timestamp) return;
                                const dateObj = timestamp.toDate();
                                const dateStr = RewardCalculator.getVenueDateString(dateObj, tz);
                                if (!uniqueDays.find(d => d.dateStr === dateStr)) uniqueDays.push({ dateStr, date: dateObj });
                            });

                            const todayStr = RewardCalculator.getVenueDateString(now, tz);
                            let lastVisitDateStr = null;
                            let isDayActive = false;

                            if (uniqueDays.length > 0 && uniqueDays[0].dateStr === todayStr) {
                                isDayActive = true;
                                if (uniqueDays.length > 1) lastVisitDateStr = uniqueDays[1].dateStr;
                            } else if (uniqueDays.length > 0) {
                                lastVisitDateStr = uniqueDays[0].dateStr;
                            }

                            result = RewardCalculator.calculate(lastVisitDateStr, now, venueData.loyaltyConfig, tz, isDayActive);
                            calculatedDiscount = result.discount;

                            const debugDays = uniqueDays.slice(0, 5).map(d => d.dateStr);

                            debugInfo = { 
                                ...debugInfo, 
                                todayDate: todayStr,
                                lastVisitDisplay: lastVisitDateStr || 'Никогда', 
                                isDayActive,
                                history: debugDays.length ? debugDays.join(', ') : 'Нет', 
                                discountToday: calculatedDiscount, 
                                diffDays: result.diffDays ?? 'N/A' 
                            };

                            if (result.status === 'cooldown') setCooldown({ hoursPassed: result.hoursPassed, required: venueData.loyaltyConfig?.safetyCooldownHours || 12 });
                        } else {
                        result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, venueData.timezone || 'Asia/Dubai', false);
                            calculatedDiscount = result.discount;
                            debugInfo.diffDays = result.diffDays ?? 'N/A';
                        }
                    } else {
                        result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, venueData.timezone || 'Asia/Dubai', false);
                        calculatedDiscount = result.discount;
                        debugInfo.diffDays = result.diffDays ?? 'N/A';
                    }

                    setLastVisitDebug(debugInfo);
                    setDiscount(calculatedDiscount);
                    setPredictionState({ percent: calculatedDiscount, secondsLeft: result?.secondsUntilDecay || 0, label: result?.status || 'new', isBase: calculatedDiscount <= 5, isMax: calculatedDiscount >= 20 });
                    setStatus('first');
                } catch (e) {
                    console.error("Error in checkUserAndVenue:", e);
                    setLastVisitDebug({ error: e.message || String(e) });
                    setStatus('first'); // Keep on main page but show debug error if needed
                }
            };
            checkUserAndVenue();
        });

        return () => {
            unsubscribe();
            clearTimeout(timer);
            clearTimeout(safetyTimeoutId);
        };
    }, [location]);

    const toggleLanguage = () => {
        const current = i18n.resolvedLanguage || i18n.language || 'en';
        const baseLang = current.substring(0, 2).toLowerCase();
        const cycle = { 'en': 'ru', 'ru': 'ar', 'ar': 'vi', 'vi': 'en' };
        const next = cycle[baseLang] || 'en';
        
        console.log(`Toggling language: ${baseLang} -> ${next}`);
        i18n.changeLanguage(next);
        safeStorage.setItem('userLanguage', next);
    };

    // ── LOADING (iOS Dark) ──
    if (status === 'loading' || !minDelayPassed) {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-black items-center justify-center p-6 text-white relative">
                <div className="z-10 flex flex-col items-center text-center">
                    <img 
                        src="/revoo-logo.png" 
                        className="h-[300px] w-auto mb-6" 
                        alt="REVOO" 
                    />
                    <p className="text-white/50 font-medium text-sm animate-pulse">{t('calculating_discount')}</p>
                </div>
            </div>
        );
    }

    // ── ERROR / BLOCKED (iOS Dark) ──
    if (status === 'error' || status === 'blocked') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-red-500/20">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-white mb-2 tracking-wide">
                    {status === 'error' ? t('venue_not_found') : t('system_access_paused')}
                </h1>
                <p className="text-white/50 max-w-xs font-medium text-sm leading-relaxed">
                    {status === 'error' ? 'Please scan a valid QR code or contact the venue staff.' : "This venue's rewards program is currently unavailable."}
                </p>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-white text-black font-semibold rounded-2xl w-full max-w-xs active:scale-[0.98] transition-transform">RETRY</button>
            </div>
        );
    }

    // ── Rank-Based Battery Mapping ──
    const getMappedCapacity = (currentDiscount, config) => {
        if (!config) return 10;
        
        // Extract all tiers that define the progression
        const tiers = [
            Number(config.percBase ?? 5),
            Number(config.percDecay2 || config.percBase || 5),
            Number(config.percDecay1 || config.percBase || 5),
            Number(config.percVip ?? 20)
        ];

        // Filter unique and sort ascending to find the rank
        const uniqueTiers = [...new Set(tiers)].sort((a, b) => a - b);
        const index = uniqueTiers.indexOf(Number(currentDiscount));

        if (index === -1) return 10; // Fallback
        if (index === 0) return 10; // 1st tier (Lowest) = Red
        if (index === uniqueTiers.length - 1) return 100; // Last tier (VIP) = Green
        if (index === 1) return 25; // 2nd tier = Orange
        return 50; // Everything else = Yellow
    };

    const mappedCapacity = getMappedCapacity(discount, loyaltyConfig);
    
    const batCfg = getBatteryConfig(mappedCapacity);

    const formatDays = (d) => parseInt(d) === 1 ? `1 ${t('timeline_day')}` : `${d} ${t('timeline_days')}`;

    const timelineItems = loyaltyConfig ? [
        { label: t('timeline_vip_status'), value: `${loyaltyConfig.percVip ?? 20}%`, sub: `${t('timeline_within', { days: formatDays(loyaltyConfig.vipWindowDays ?? 1) })}`, color: '#00FF41', perc: Number(loyaltyConfig.percVip ?? 20) },
        { label: t('timeline_level_1'), value: `${loyaltyConfig.percDecay1 ?? 15}%`, sub: `${t('timeline_within', { days: formatDays(loyaltyConfig.tier1DecayDays ?? 2) })}`, color: '#FFD700', perc: Number(loyaltyConfig.percDecay1 ?? 15) },
        { label: t('timeline_level_2'), value: `${loyaltyConfig.percDecay2 ?? 10}%`, sub: `${t('timeline_within', { days: formatDays(loyaltyConfig.tier2DecayDays ?? 6) })}`, color: '#FF8800', perc: Number(loyaltyConfig.percDecay2 ?? 10) },
        { label: t('timeline_base_rate'), value: `${loyaltyConfig.percBase ?? 5}%`, sub: t('timeline_any_other_time'), color: '#FF3131', perc: Number(loyaltyConfig.percBase ?? 5) },
    ].filter(item => item.perc > Number(loyaltyConfig.percBase ?? 0) || item.label === t('timeline_base_rate'))
    : [
        { label: t('today'), value: '10% Max', sub: 'Active', color: '#FF3131' },
        { label: t('tomorrow'), value: '15% Max', sub: 'Maintaining', color: '#00FF41' },
        { label: '3 Days', value: '20% Max', sub: 'Streak', color: '#FFD700' },
        { label: '7 Days', value: '25% Max', sub: 'VIP Unlock', color: '#FF8800' },
    ];

    // ── MAIN (iOS 26 Style Dark Mode) ──
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col min-h-[100svh] bg-black font-sans text-white antialiased relative overflow-x-hidden"
            style={{ WebkitFontSmoothing: 'antialiased' }}
        >
            {/* Ambient Background Glow Arrays */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] opacity-[0.25] mix-blend-screen" style={{ backgroundColor: batCfg.fillColor }} />
                <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] opacity-[0.15]" style={{ backgroundColor: batCfg.fillColor }} />
            </div>

            {/* Language Switcher */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleLanguage}
                    className="bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full text-xs font-semibold text-white border border-white/5 hover:bg-white/20 transition-colors uppercase"
                >
                    {i18n.language.toUpperCase()}
                </button>
            </div>

            {/* Content Wrapper */}
            <div className="flex flex-col z-10">
                {/* Header / Nav */}
            <div className="pt-6 px-6 flex justify-between items-center z-50 w-full relative">
                <UserMenu 
                    user={auth.currentUser}
                    isGuestView={true}
                    venueColor={batCfg.fillColor}
                    trigger={
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/5 cursor-pointer active:scale-95 transition-all">
                            <FontAwesomeIcon icon={faUser} className="text-[10px] text-white/50" />
                            <span className="text-[11px] font-semibold tracking-wide text-white">{guestName}</span>
                        </div>
                    }
                />
                <div /> {/* Spacer */}
            </div>

            <div className="pt-4 pb-2 px-6 flex flex-col items-center flex-shrink-0">
                <img src="/revoo-logo.png" className="h-[120px] w-auto mb-2 object-contain opacity-100" alt="REVOO" />
                <h2 className="text-[20px] font-bold tracking-tight text-white/90 leading-tight">{venueName || "REVOO VENUE"}</h2>
            </div>

                {/* Hero / Guest Name (Pulled Up) */}
                <div className="text-center flex flex-col items-center flex-shrink-0 px-6 py-0 -mt-1">
                    {guestName ? (
                        <>
                            <p className="text-[11px] font-medium text-white/40 mb-0">{t('hero_welcome_back')}</p>
                            <div 
                                className="text-[20px] font-semibold tracking-tight text-white/80"
                                onClick={() => setDebugClicks(c => c + 1)}
                            >
                                {guestName || 'Friend'}
                            </div>
                            <div className="mt-2" />
                        </>
                    ) : (
                        <button
                            onClick={() => navigate('/activate', { state: { discount, guestName, userRole } })}
                            className="text-[13px] font-semibold text-white bg-white/5 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 mt-1 hover:bg-white/10 transition-colors"
                        >
                            {t('hero_please_sign_in')}
                        </button>
                    )}
                </div>

                {/* Scrollable Container for elements (naturally scrolls on root) */}
                <div className="flex flex-col items-center px-4 w-full max-w-md mx-auto gap-2.5 py-1">
                    
                    {/* ── GLASS BATTERY CONTAINER ── */}
                    <div className="flex flex-col items-center w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[28px] p-4 shadow-2xl relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 border border-white/5 rounded-[28px] pointer-events-none mix-blend-overlay" />
                        <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase mb-0">
                            Your VIP Status is
                        </p>
                        <div
                            className="text-[56px] font-bold leading-none tracking-tighter mb-0"
                            style={{
                                color: '#FFFFFF',
                                textShadow: `0 0 10px ${batCfg.fillColor}, 0 0 20px ${batCfg.fillColor}`
                            }}
                        >
                            {discount}%
                        </div>
                        <p className="text-[9px] font-medium tracking-wider opacity-40 uppercase mb-3" style={{ color: batCfg.fillColor }}>
                            Current Rate
                        </p>
                        <div className="w-full relative z-10 pointer-events-none scale-100 mb-0">
                            <PngBattery capacity={mappedCapacity} />
                        </div>
                    </div>

                    {/* iOS Settings-style Timeline Widget */}
                    <div className="w-full bg-[#1C1C1E] rounded-[24px] overflow-hidden flex flex-col border border-white/5 shadow-xl flex-shrink-0">
                        {timelineItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 relative px-4 hover:bg-white/5 transition-colors">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}30` }}>
                                    <FontAwesomeIcon icon={faGift} className="text-[10px]" />
                                </div>
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-[14px] text-white">{item.label}</span>
                                        <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{item.sub}</span>
                                    </div>
                                    <span className="text-[14px] text-white/50 font-bold">{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] font-medium text-white/40 text-center px-4 leading-relaxed tracking-wider py-2">
                        {t('timeline_motivation')}
                    </p>
                </div>
            </div>

            {/* Sticky CTA (iOS Prominent Modal Button) */}
            <div className="sticky bottom-0 left-0 w-full p-6 pt-10 bg-gradient-to-t from-black via-black/95 to-transparent z-40 flex justify-center mt-auto">
                <button
                    onClick={() => {
                        const guestEmail = safeStorage.getItem('guestEmail');
                        if (guestName || guestEmail) {
                            navigate('/thank-you', { state: { guestName: guestName || 'Friend', guestEmail, discountValue: discount, venueId: safeStorage.getItem('currentVenueId'), userRole } });
                        } else {
                            navigate('/activate', { state: { discount, guestName, userRole } });
                        }
                    }}
                    className="w-full max-w-[400px] h-[56px] text-black bg-white rounded-[20px] font-bold text-[17px] active:scale-[0.97] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                >
                    {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                </button>
            </div>

            {/* Debug Overlay */}
            {debugClicks >= 5 && (
                <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setDebugClicks(0)}>
                    <div className="bg-[#1C1C1E] w-full max-w-sm rounded-[36px] p-8 border border-white/10 shadow-2xl relative">
                        <h3 className="text-white/80 font-bold text-sm mb-6 flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />
                            System Diagnostics
                        </h3>
                        <div className="space-y-4">
                            {lastVisitDebug ? (
                                lastVisitDebug.error ? (
                                    <div className="p-4 bg-red-500/10 rounded-2xl flex flex-col">
                                        <span className="text-[11px] font-medium text-red-500 mb-1">Error</span>
                                        <span className="text-sm font-semibold text-white break-words">{lastVisitDebug.error}</span>
                                    </div>
                                ) : (
                                    [
                                        { label: 'UID', value: lastVisitDebug.uid },
                                        { label: 'Email', value: lastVisitDebug.email },
                                        { label: 'Venue', value: lastVisitDebug.venueId },
                                        { label: 'System Date', value: lastVisitDebug.todayDate },
                                        { label: 'Last Recorded Visit', value: lastVisitDebug.lastVisitDisplay },
                                        { label: 'Is Today Active', value: lastVisitDebug.isDayActive ? 'YES' : 'NO' },
                                        { label: 'History (5 days)', value: lastVisitDebug.history },
                                        { label: 'Calculated Rate', value: `${lastVisitDebug.discountToday}%`, color: 'text-[#00FF41]' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0">
                                            <span className="text-[11px] font-medium text-white/40">{item.label}</span>
                                            <span className={`text-[13px] font-semibold truncate ${item.color || 'text-white/80'}`}>{item.value}</span>
                                        </div>
                                    ))
                                )
                            ) : (
                                <p className="text-white/40 text-[13px] font-medium text-center">Loading data...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default NewQRPage;
