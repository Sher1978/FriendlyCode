import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faRocket, faGift, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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
                const venueId = searchParams.get('id') || searchParams.get('v') || 'default_venue';
                safeStorage.setItem('currentVenueId', venueId);

                try {
                    const venueRef = doc(db, 'venues', venueId);
                    const venueSnap = await getDoc(venueRef);
                    if (!venueSnap.exists()) { setStatus('error'); return; }

                    const venueData = venueSnap.data();
                    setVenueName(venueData.name || '');
                    if (venueData.loyaltyConfig) setLoyaltyConfig(venueData.loyaltyConfig);

                    const venueLang = venueData.defaultLanguage || 'en';
                    if (i18n.language !== venueLang) i18n.changeLanguage(venueLang);

                    const now = new Date();
                    const expiry = venueData.subscription?.expiryDate?.toDate();
                    if (!venueData.isActive || (expiry && expiry < now)) { setStatus('blocked'); return; }

                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    let userData = userSnap.exists() ? userSnap.data() : null;

                    if (userData) {
                        setUserRole(userData.role || 'guest');
                        const displayName = userData.displayName || userData.name;
                        if (displayName) { setGuestName(displayName); safeStorage.setItem('guestName', displayName); }
                        if (userData.email) safeStorage.setItem('guestEmail', userData.email);
                    } else {
                        const savedName = safeStorage.getItem('guestName');
                        if (savedName) setGuestName(savedName);
                    }

                    const rawEmail = userData?.email || safeStorage.getItem('guestEmail') || '';
                    const email = rawEmail.toLowerCase();
                    let calculatedDiscount = 5;
                    let result = null;
                    let debugInfo = { email: email || 'No Email', uid: user.uid, venueId, daysAgoStr: 'Никогда', prevDaysAgoStr: 'Никогда', discountToday: 5, diffDays: 'N/A' };

                    if (email) {
                        const qVisits = query(collection(db, 'visits'), where('guestEmail', '==', email), where('venueId', '==', venueId), orderBy('timestamp', 'desc'), limit(50));
                        const querySnapshot = await getDocs(qVisits);

                        if (!querySnapshot.empty) {
                            const docs = querySnapshot.docs;
                            const uniqueDays = [];
                            const tzOffset = now.getTimezoneOffset() * 60000;
                            docs.forEach(docSnap => {
                                const timestamp = docSnap.data().timestamp;
                                if (!timestamp) return;
                                const dateObj = timestamp.toDate();
                                const localISOTime = (new Date(dateObj - tzOffset)).toISOString().split('T')[0];
                                if (!uniqueDays.find(d => d.dateStr === localISOTime)) uniqueDays.push({ dateStr: localISOTime, date: dateObj });
                            });

                            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
                            const todayStr = (new Date(now - tzOffset)).toISOString().split('T')[0];
                            let lastVisitBeforeToday = null, visitToday = null;

                            if (uniqueDays.length > 0 && uniqueDays[0].dateStr === todayStr) {
                                visitToday = uniqueDays[0].date;
                                if (uniqueDays.length > 1) lastVisitBeforeToday = uniqueDays[1].date;
                            } else if (uniqueDays.length > 0) {
                                lastVisitBeforeToday = uniqueDays[0].date;
                            }

                            result = RewardCalculator.calculate(lastVisitBeforeToday, now, venueData.loyaltyConfig, visitToday);
                            calculatedDiscount = result.discount;

                            let daysAgoStr = 'Никогда';
                            if (lastVisitBeforeToday) {
                                const refDate = new Date(lastVisitBeforeToday); refDate.setHours(0, 0, 0, 0);
                                const diffDays = Math.round((todayStart - refDate) / (1000 * 60 * 60 * 24));
                                daysAgoStr = `${diffDays} дн. назад`;
                            }

                            let prevDaysAgoStr = 'Никогда';
                            if (uniqueDays.length > 1) {
                                const d = new Date(uniqueDays[1].date); d.setHours(0, 0, 0, 0);
                                const diff = Math.round((todayStart - d) / (1000 * 60 * 60 * 24));
                                prevDaysAgoStr = `${diff} дн. назад`;
                            }

                            debugInfo = { ...debugInfo, daysAgoStr: visitToday ? 'Сегодня (0)' : daysAgoStr, prevDaysAgoStr, discountToday: calculatedDiscount, diffDays: result.diffDays ?? 'N/A' };

                            if (result.status === 'cooldown') setCooldown({ hoursPassed: result.hoursPassed, required: venueData.loyaltyConfig?.safetyCooldownHours || 12 });
                        } else {
                            result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, null);
                            calculatedDiscount = result.discount;
                            debugInfo.diffDays = result.diffDays ?? 'N/A';
                        }
                    } else {
                        result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, null);
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
        const cycle = { 'en': 'ru', 'ru': 'vi', 'vi': 'en' };
        i18n.changeLanguage(cycle[i18n.language] || 'en');
    };

    // ── LOADING (iOS Dark) ──
    if (status === 'loading' || !minDelayPassed) {
        return (
            <div className="flex flex-col h-[100dvh] bg-black items-center justify-center p-6 text-white relative overflow-hidden">
                <div className="z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#1C1C1E] rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-pulse">
                        <img src="/logo.png" alt="Friendly Code Logo" className="w-[80%] h-[80%] object-contain" />
                    </div>
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

    // Map discount logic
    let mappedCapacity = 10;
    if (discount >= 20) mappedCapacity = 100;
    else if (discount >= 15) mappedCapacity = 50;
    else if (discount >= 10) mappedCapacity = 25;
    
    const batCfg = getBatteryConfig(mappedCapacity);

    const timelineItems = loyaltyConfig ? [
        { label: 'VIP Status', value: `${loyaltyConfig.percVip || 20}%`, sub: `Visit within ${loyaltyConfig.vipWindowHours || 24}h`, color: '#00FF41', perc: loyaltyConfig.percVip || 20 },
        { label: 'Level 1', value: `${loyaltyConfig.percDecay1 || 15}%`, sub: `Within ${loyaltyConfig.tier1DecayHours || 48}h`, color: '#FFD700', perc: loyaltyConfig.percDecay1 || 15 },
        { label: 'Level 2', value: `${loyaltyConfig.percDecay2 || 10}%`, sub: `Within ${loyaltyConfig.tier2DecayHours || 168}h`, color: '#FF8800', perc: loyaltyConfig.percDecay2 || 10 },
        { label: 'Base Rate', value: `${loyaltyConfig.percBase || 5}%`, sub: 'New or reset users', color: '#FF3131', perc: loyaltyConfig.percBase || 5 },
    ].filter(item => item.perc > (loyaltyConfig.percBase || 0) || item.label === 'Base Rate')
    : [
        { label: 'Today', value: '10% Max', sub: 'Active', color: '#FF3131' },
        { label: 'Tomorrow', value: '15% Max', sub: 'Maintaining', color: '#00FF41' },
        { label: '3 Days', value: '20% Max', sub: 'Streak', color: '#FFD700' },
        { label: '7 Days', value: '25% Max', sub: 'VIP Unlock', color: '#FF8800' },
    ];

    // ── MAIN (iOS 26 Style Dark Mode) ──
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col h-[100dvh] bg-black font-sans text-white antialiased overflow-hidden relative"
            style={{ WebkitFontSmoothing: 'antialiased' }}
        >
            {/* Ambient Background Glow Arrays (optimized for vivid mobile visibility) */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: batCfg.fillColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: batCfg.fillColor }} />

            {/* Language Switcher */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleLanguage}
                    className="bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full text-xs font-semibold text-white border border-white/5 hover:bg-white/20 transition-colors uppercase"
                >
                    {i18n.language === 'en' ? 'RU' : i18n.language === 'ru' ? 'VI' : 'EN'}
                </button>
            </div>

            {/* Header (Minimal, San Francisco Style) */}
            <div className="pt-6 px-6 text-center z-10 w-full">
                <p className="text-[11px] font-semibold text-white/40 tracking-widest uppercase mb-1">Welcome To</p>
                <h2 className="text-[28px] font-bold tracking-tight text-white leading-tight">{venueName}</h2>
                <div className="flex items-center justify-center gap-1 opacity-20 mt-1 cursor-pointer" onClick={() => setDebugClicks(c => c + 1)}>
                    <span className="text-[9px] font-semibold uppercase tracking-widest">Powered by FriendlyCode</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col items-center justify-center -mt-2 px-6 pb-20 w-full max-w-md mx-auto z-10 gap-4">

                {/* Hero / Guest Name */}
                <div className="text-center flex flex-col items-center -mt-4">
                    {guestName ? (
                        <>
                            <p className="text-[12px] font-medium text-white/50 mb-0.5">{t('hero_welcome_back')}</p>
                            <div className="text-[24px] font-semibold tracking-tight text-white/90">
                                {guestName}
                            </div>
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

                {/* ── GLASS BATTERY CONTAINER (Modern Floating Card) ── */}
                <div className="flex flex-col items-center w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[28px] p-5 shadow-2xl relative overflow-hidden">
                    
                    {/* Inner highlight ring */}
                    <div className="absolute inset-0 border border-white/5 rounded-[28px] pointer-events-none mix-blend-overlay"></div>

                    {/* VIP Status Label */}
                    <p className="text-[12px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                        Your VIP Status is
                    </p>

                    {/* Massive Accent Number */}
                    <div
                        className="text-[64px] font-bold leading-none tracking-tighter"
                        style={{
                            color: '#FFFFFF',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                            textShadow: `
                                0 0 10px ${batCfg.fillColor},
                                0 0 20px ${batCfg.fillColor},
                                0 0 40px ${batCfg.glowColorSoft},
                                0 0 80px ${batCfg.glowColorSoft}
                            `
                        }}
                    >
                        {discount}%
                    </div>
                    {/* The "Discount limits" subline */}
                    <p className="text-[11px] font-medium tracking-wider opacity-60 uppercase mb-3" style={{ color: batCfg.fillColor }}>
                        Current Rate
                    </p>

                    {/* Horizontal battery component */}
                    <div className="w-full relative z-10 pointer-events-none">
                        <PngBattery discount={discount} />
                    </div>
                </div>

                {/* iOS Settings-style Timeline Widget */}
                <div className="w-full bg-[#1C1C1E] rounded-[24px] overflow-hidden flex flex-col border border-white/5 shadow-xl mt-0">
                    {timelineItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 py-2.5 border-b border-white/5 last:border-0 relative px-5 hover:bg-white/5 transition-colors">
                            {/* Icon Box */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}40` }}>
                                <FontAwesomeIcon icon={faGift} className="text-[11px]" />
                            </div>
                            
                            {/* Text labels */}
                            <div className="flex items-center w-full justify-between">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[15px] text-white">
                                        {item.label}
                                    </span>
                                    <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                        {item.sub}
                                    </span>
                                </div>
                                <span className="text-[15px] text-white/50 font-bold">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* Sticky CTA (iOS Prominent Modal Button) */}
            <div className="fixed bottom-0 left-0 w-full p-4 pt-10 bg-gradient-to-t from-black via-black/90 to-transparent pb-6 z-50 flex justify-center">
                <button
                    onClick={() => {
                        const guestEmail = safeStorage.getItem('guestEmail');
                        if (guestName || guestEmail) {
                            navigate('/thank-you', { state: { guestName: guestName || 'Friend', guestEmail, discountValue: discount, venueId: safeStorage.getItem('currentVenueId'), userRole } });
                        } else {
                            navigate('/activate', { state: { discount, guestName, userRole } });
                        }
                    }}
                    className="w-[92%] max-w-[400px] h-[52px] text-black bg-white rounded-[18px] font-semibold text-[16px] active:scale-[0.97] transition-all shadow-xl flex items-center justify-center gap-2"
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
                                        { label: 'Last active', value: lastVisitDebug.daysAgoStr },
                                        { label: 'Prev active', value: lastVisitDebug.prevDaysAgoStr },
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
