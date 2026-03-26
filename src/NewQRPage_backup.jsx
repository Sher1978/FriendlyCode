import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheckCircle, faRocket, faGift, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { RewardCalculator } from './logic/RewardCalculator';
import PngBattery, { getBatteryConfig } from './PngBattery';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

// ─────────────────────────────────────────────────────────────────────────────
// NewQRPage — same data logic as LandingPage, original warm cream theme
// ─────────────────────────────────────────────────────────────────────────────
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
    const [predictionState, setPredictionState] = useState({
        percent: 5, secondsLeft: 0, label: 'reset', isBase: true, isMax: false
    });
    const [tremble, setTremble] = useState(false);
    const location = useLocation();

    // Use a Ref to keep track of the current status and avoid stale closures in timeouts
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
                    setTimeout(() => setTremble(true), 1500);
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

    // ── LOADING (original cream theme) ──
    if (status === 'loading' || !minDelayPassed) {
        return (
            <div className="flex flex-col h-[100dvh] bg-[#FFF8E1] items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_#FFD54F_0%,_transparent_70%)] opacity-20 animate-pulse" />
                <div className="z-10 flex flex-col items-center text-center">
                    <div className="mb-8 relative">
                        <div className="w-24 h-24 flex items-center justify-center p-2 rounded-2xl bg-white shadow-xl animate-bounce overflow-hidden">
                            <img src="/revoo-logo.png" alt="Friendly Code Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute top-0 left-0 w-full h-full bg-[#E68A00] rounded-2xl animate-ping opacity-20" />
                    </div>
                    <h2 className="text-2xl font-black text-[#4E342E] mb-2 uppercase tracking-wide">Friendly Code</h2>
                    <p className="text-[#4E342E]/70 font-medium text-lg animate-pulse">{t('calculating_discount')}</p>
                </div>
            </div>
        );
    }

    // ── ERROR / BLOCKED (original cream theme) ──
    if (status === 'error' || status === 'blocked') {
        return (
            <div className="min-h-screen bg-[#FFF8E1] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-[#FEE2E2] rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-[#991B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-[#4E342E] mb-2 uppercase">
                    {status === 'error' ? t('venue_not_found') : t('system_access_paused')}
                </h1>
                <p className="text-[#4E342E] opacity-70 max-w-xs font-medium">
                    {status === 'error' ? 'Please scan a valid QR code or contact the venue staff.' : "This venue's rewards program is currently unavailable."}
                </p>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-[#E68A00] text-white font-black rounded-xl shadow-lg border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 transition-all">RETRY</button>
            </div>
        );
    }

    // Map discount to get exact matched battery colors
    let mappedCapacity = 10;
    if (discount >= 20) mappedCapacity = 100;
    else if (discount >= 15) mappedCapacity = 50;
    else if (discount >= 10) mappedCapacity = 25;
    
    // Extrapolate battery config to style entire page details (e.g. text color, ring color)
    const batCfg = getBatteryConfig(mappedCapacity);

    // ── MAIN (original cream theme #FFF8E1) ──
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col h-[100dvh] bg-[#FFF8E1] font-sans text-[#4E342E] antialiased overflow-hidden relative"
        >
            {/* Sparkle effect for 20% — same as original */}
            {discount >= 20 && (
                <div className="absolute inset-0 pointer-events-none z-0">
                    {[...Array(12)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-green-400 rounded-full"
                            style={{ top: `${Math.random() * 60}%`, left: `${Math.random() * 100}%` }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2, ease: "easeInOut" }}
                        />
                    ))}
                </div>
            )}

            {/* Language Switcher — exact copy of original */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleLanguage}
                    className="bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#4E342E] border border-[#4E342E]/10 hover:bg-white/80 transition-all uppercase"
                >
                    {i18n.language === 'en' ? 'RU' : i18n.language === 'ru' ? 'VI' : 'EN'}
                </button>
            </div>

            {/* Header — exact copy of original */}
            <div className="pt-6 px-6 text-center z-10">
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Welcome to</p>
                <h2 className="text-2xl font-black leading-tight text-[#E68A00] mb-1">{venueName}</h2>
                <div className="flex items-center justify-center gap-1 opacity-40 p-10 -m-10 cursor-pointer" onClick={() => setDebugClicks(c => c + 1)}>
                    <span className="text-[12px] font-bold uppercase tracking-wider">powered by FriendlyCode</span>
                    <FontAwesomeIcon icon={faLeaf} className="text-[12px]" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-evenly px-6 pb-24 w-full max-w-md mx-auto">

                {/* Hero — exact copy of original */}
                <div className="text-center mt-0 flex flex-col items-center gap-0">
                    <h1 className="text-[20px] font-black opacity-60 uppercase tracking-widest leading-[0.9] mb-1">
                        {t('hero_welcome_back')}
                    </h1>
                    {guestName ? (
                        <div className="text-[32px] font-black text-[#E68A00] animate-orange-glow leading-[0.9] my-1">
                            {guestName}
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/activate', { state: { discount, guestName, userRole } })}
                            className="text-[14px] font-black text-[#E68A00] animate-orange-glow leading-tight border-2 border-[#E68A00]/20 px-6 py-2 rounded-full hover:bg-[#E68A00]/5 transition-all my-1"
                        >
                            {t('hero_please_sign_in')}
                        </button>
                    )}
                    <h1 className="text-[20px] font-black opacity-60 uppercase tracking-widest leading-[0.9]">
                        {t('hero_reward_today')}
                    </h1>
                </div>

                {/* ── BATTERY VISUAL + Discount Value ── */}
                <div className="flex flex-col items-center gap-3 mt-2 mb-2 w-full">
                    {/* Discount text above battery — Accented Neon Style */}
                    <div
                        className="text-[64px] font-black leading-none tracking-tighter"
                        style={{
                            color: '#FFFFFF', // Solid white core
                            fontFamily: 'sans-serif',
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
                    <p className="text-[11px] font-bold tracking-wider opacity-60 uppercase" style={{ color: batCfg.fillColor }}>
                        Current Rate
                    </p>

                    {/* Horizontal battery — Hybrid PNG + SVG Glowing Overlays */}
                    <div className="w-full z-10 my-2 pointer-events-none">
                        <PngBattery discount={discount} />
                    </div>

                    {/* Directional label */}
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-50" style={{ color: batCfg.fillColor }}>
                        {batCfg.animLabel || 'CHARGING'}
                    </p>

                    {/* Temporary Debug Panel for Battery States */}
                    <div className="flex gap-2 justify-center z-50 relative mt-4 mb-4">
                        <button onClick={() => setDiscount(5)} className="px-3 py-1 bg-[#FF3131] text-white text-xs rounded-full shadow-lg font-bold">10% (Red)</button>
                        <button onClick={() => setDiscount(10)} className="px-3 py-1 bg-[#FF8800] text-white text-xs rounded-full shadow-lg font-bold">25% (Orange)</button>
                        <button onClick={() => setDiscount(15)} className="px-3 py-1 bg-[#FFD700] text-black text-xs rounded-full shadow-lg font-bold">50% (Yellow)</button>
                        <button onClick={() => setDiscount(20)} className="px-3 py-1 bg-[#00FF41] text-black text-xs rounded-full shadow-lg font-bold">100% (Green)</button>
                    </div>
                </div>

                {/* Timeline List — Synced mapped colors */}
                <div className="space-y-3 w-full">
                    <TimelineItem
                        text={t('today_dynamic', { percent: discount })}
                        color="#FF3131" // Red
                        icon={faCheckCircle}
                        compact={true}
                    />
                    <TimelineItem
                        text={t('tomorrow_val')}
                        color="#00FF41" // Green
                        icon={faGift}
                        compact={true}
                    />
                    <TimelineItem
                        text={t('in_3_days')}
                        color="#FFD700" // Yellow
                        icon={faGift}
                        compact={true}
                    />
                    <TimelineItem
                        text={t('in_7_days')}
                        color="#FF8800" // Orange
                        icon={faGift}
                        compact={true}
                    />
                </div>

                <p className="text-center text-[10px] font-bold opacity-40 mt-4 max-w-[240px] mx-auto leading-relaxed uppercase tracking-wider">
                    {t('footer_motivation')}
                </p>
            </div>

            {/* Sticky CTA — exact copy of original */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#FFF8E1] via-[#FFF8E1] to-transparent pb-8">
                <button
                    onClick={() => {
                        const guestEmail = safeStorage.getItem('guestEmail');
                        if (guestName || guestEmail) {
                            navigate('/thank-you', { state: { guestName: guestName || 'Friend', guestEmail, discountValue: discount, venueId: safeStorage.getItem('currentVenueId'), userRole } });
                        } else {
                            navigate('/activate', { state: { discount, guestName, userRole } });
                        }
                    }}
                    className="w-full h-[64px] bg-[#E68A00] text-white rounded-[20px] font-black text-[18px] active:scale-[0.98] transition-all shadow-xl shadow-[#E68A00]/30 uppercase flex items-center justify-center gap-3"
                >
                    <FontAwesomeIcon icon={faRocket} />
                    {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                </button>
            </div>

            {/* Debug Overlay — exact copy of original */}
            {debugClicks >= 5 && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setDebugClicks(0)}>
                    <div className="bg-[#1e1e1e] w-full max-w-sm rounded-[32px] p-8 border border-white/10 shadow-2xl relative">
                        <button className="absolute top-6 right-8 text-white/40 text-2xl font-black">X</button>
                        <h3 className="text-[#00E676] font-black tracking-widest text-xs uppercase mb-8 flex items-center gap-1">
                            <div className="w-2 h-2 bg-[#00E676] rounded-full animate-ping" />
                            Debug Info
                        </h3>
                        <div className="space-y-6">
                            {lastVisitDebug ? (
                                lastVisitDebug.error ? (
                                    <div className="flex items-start gap-4 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl relative overflow-hidden">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-xl shrink-0 mt-1" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Crash Report</span>
                                            <span className="text-sm font-bold text-red-100 break-words leading-tight">{lastVisitDebug.error}</span>
                                        </div>
                                    </div>
                                ) : (
                                    [
                                        { label: 'UID', value: lastVisitDebug.uid, color: 'text-white/40' },
                                        { label: 'Email', value: lastVisitDebug.email, color: 'text-white/40' },
                                        { label: 'Venue', value: lastVisitDebug.venueId, color: 'text-white/40' },
                                        { label: 'Активный день (посл.)', value: lastVisitDebug.daysAgoStr, color: 'text-white' },
                                        { label: 'Пред. активный день', value: lastVisitDebug.prevDaysAgoStr, color: 'text-white' },
                                        { label: 'DiffDays', value: lastVisitDebug.diffDays, color: 'text-[#E68A00]' },
                                        { label: 'Скидка сегодня', value: `${lastVisitDebug.discountToday}%`, color: 'text-[#E68A00]' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{item.label}</span>
                                            <span className={`text-[14px] font-bold truncate ${item.color}`}>{item.value}</span>
                                        </div>
                                    ))
                                )
                            ) : (
                                <p className="text-white/40 text-sm font-bold italic animate-pulse">Loading debug data…</p>
                            )}
                        </div>
                        <p className="mt-10 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">(Нажмите, чтобы закрыть)</p>
                    </div>
                </div>
            )}

            {/* CSS — exactly matches original + battery keyframes */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes orangeGlow {
                    0%, 100% { text-shadow: 0 0 4px rgba(230, 138, 0, 0.2), 0 0 10px rgba(230, 138, 0, 0.1); }
                    50% { text-shadow: 0 0 15px rgba(230, 138, 0, 0.6), 0 0 25px rgba(230, 138, 0, 0.3); }
                }
                .animate-orange-glow { animation: orangeGlow 3s ease-in-out infinite; }
            ` }} />
        </motion.div>
    );
};

// TimelineItem — Custom mapped wrapper
const TimelineItem = ({ text, color, icon, compact }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className={`flex items-center gap-4 ${compact ? 'p-3' : 'p-4'} rounded-xl border-2 transition-all bg-white relative mb-2`}
        style={{
            borderColor: color ? `${color}40` : 'rgba(78, 52, 46, 0.1)',
            boxShadow: `0 4px 20px ${color}22` 
        }}
    >
        {/* Downward pointing arrow */}
        <div 
            className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 rotate-45 z-0"
            style={{ borderColor: color ? `${color}40` : 'rgba(78, 52, 46, 0.1)' }}
        ></div>

        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg" style={{ backgroundColor: color }}></div>
        <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white shadow-md z-10" style={{ backgroundColor: color }}>
            <FontAwesomeIcon icon={icon || faGift} className="text-sm" />
        </div>
        <span className={`font-black ${compact ? 'text-sm' : 'text-lg'} text-[#4E342E] uppercase tracking-wider z-10 relative`}>
            {text}
        </span>
    </motion.div>
);

export default NewQRPage;
