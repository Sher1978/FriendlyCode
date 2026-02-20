import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheckCircle, faRocket, faGift } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { RewardCalculator } from './logic/RewardCalculator';

const LandingPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [discount, setDiscount] = useState(5);
    const [venueName, setVenueName] = useState('');
    const [cooldown, setCooldown] = useState(null); // { hoursPassed, required }
    const [minDelayPassed, setMinDelayPassed] = useState(false);

    // Debug Mode State
    const [debugClicks, setDebugClicks] = useState(0);
    const [lastVisitDebug, setLastVisitDebug] = useState(null);

    // Missing States Restored
    const [guestName, setGuestName] = useState('');
    const [userRole, setUserRole] = useState('guest');
    const [predictionState, setPredictionState] = useState({
        percent: 5,
        secondsLeft: 0,
        label: 'reset',
        isBase: true,
        isMax: false
    });

    // Animation State
    const [tremble, setTremble] = useState(false);

    const location = useLocation();

    useEffect(() => {
        // Minimum Splash Screen Timer
        const timer = setTimeout(() => setMinDelayPassed(true), 1000);

        // Safety Timeout to prevent infinite loading (Gray Screen of Death)
        const safetyTimer = setTimeout(() => {
            if (status === 'loading') {
                console.error("Auth/Loading timed out - forcing error state");
                setStatus('error');
            }
        }, 8000); // 8 seconds max wait time

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.error("Auth failed:", e);
                    setStatus('error'); // Show error UI instead of hanging
                }
                return;
            }

            // Clear safety timer if we got a user
            clearTimeout(safetyTimer);

            // User is authenticated (anonymous or otherwise)
            const checkUserAndVenue = async () => {
                const searchParams = new URLSearchParams(location.search);
                const venueId = searchParams.get('id') || searchParams.get('v') || 'default_venue';
                localStorage.setItem('currentVenueId', venueId);

                try {
                    // 1. Check Venue Status
                    const venueRef = doc(db, 'venues', venueId);
                    const venueSnap = await getDoc(venueRef);

                    if (!venueSnap.exists()) {
                        setStatus('error');
                        return;
                    }

                    const venueData = venueSnap.data();
                    setVenueName(venueData.name || '');

                    // --- LANGUAGE LOGIC ---
                    // Default to English, but switch to venue's preferred language if set
                    const venueLang = venueData.defaultLanguage || 'en';
                    if (i18n.language !== venueLang) {
                        i18n.changeLanguage(venueLang);
                    }

                    const now = new Date();
                    const expiry = venueData.subscription?.expiryDate?.toDate();

                    if (!venueData.isActive || (expiry && expiry < now)) {
                        setStatus('blocked');
                        return;
                    }

                    // 2. Check User Data in Firestore for Persistence
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    let userData = userSnap.exists() ? userSnap.data() : null;

                    if (userData) {
                        setUserRole(userData.role || 'guest');
                        if (userData.displayName) {
                            setGuestName(userData.displayName);
                            localStorage.setItem('guestName', userData.displayName);
                            localStorage.setItem('guestEmail', userData.email || '');
                        }
                    } else {
                        // Fallback to localStorage if Firestore doc doesn't exist yet
                        const savedName = localStorage.getItem('guestName');
                        if (savedName) setGuestName(savedName);
                    }

                    // 3. Staff/Admin Recognition Bypass
                    const role = userData?.role || 'guest';
                    if (['staff', 'owner', 'superadmin'].includes(role)) {
                        console.log("Staff detected, bypass enabled");
                        // We continue to show the page but visit will be marked as test later
                    }

                    // 4. Calculate Discount
                    // FORCE LOWERCASE EMAIL
                    const rawEmail = userData?.email || localStorage.getItem('guestEmail') || '';
                    const email = rawEmail.toLowerCase();

                    let calculatedDiscount = 5;
                    let result = null; // Initialize to avoid ReferenceError later

                    // Initialize Debug Info with Defaults (Fixes "null" issue for new users)
                    let debugInfo = {
                        email,
                        uid: user.uid,
                        venueId,
                        daysAgoStr: 'Никогда',
                        discountToday: 5
                    };

                    if (email) {
                        const qVisits = query(
                            collection(db, 'visits'),
                            where('guestEmail', '==', email),
                            where('venueId', '==', venueId),
                            orderBy('timestamp', 'desc'),
                            limit(1)
                        );
                        const querySnapshot = await getDocs(qVisits);

                        if (!querySnapshot.empty) {
                            const lastVisit = querySnapshot.docs[0].data().timestamp.toDate();

                            // Use the new shared logic
                            const result = RewardCalculator.calculate(lastVisit, now, venueData.loyaltyConfig);

                            calculatedDiscount = result.discount;

                            const today = new Date(now);
                            today.setHours(0, 0, 0, 0);
                            const visitDate = new Date(lastVisit);
                            visitDate.setHours(0, 0, 0, 0);
                            const daysAgo = Math.round((today - visitDate) / (1000 * 60 * 60 * 24));
                            const daysAgoStr = daysAgo === 0 ? "Сегодня (0)" : `${daysAgo} дн. назад`;

                            // 4. Update Debug Info
                            debugInfo = {
                                email,
                                uid: user.uid,
                                venueId,
                                daysAgoStr,
                                discountToday: calculatedDiscount
                            };

                            if (result.status === 'cooldown') {
                                setCooldown({
                                    hoursPassed: result.hoursPassed,
                                    required: venueData.loyaltyConfig?.safetyCooldownHours || 12
                                });
                                // Keep discount as calculated (likely Base or Previous if logic allows)
                            }
                        }
                    }
                    setLastVisitDebug(debugInfo);
                    setDiscount(calculatedDiscount);

                    // Trigger Tremble after main animation (simulated delay)
                    setTimeout(() => setTremble(true), 1500);
                    setPredictionState({
                        percent: calculatedDiscount,
                        secondsLeft: result?.secondsUntilDecay || 0,
                        label: result?.status || 'new',
                        isBase: calculatedDiscount <= 5,
                        isMax: calculatedDiscount >= 20
                    });
                    setStatus('first');

                } catch (e) {
                    console.error("Error in checkUserAndVenue:", e);
                    setStatus('first');
                }
            };
            checkUserAndVenue();
        });

        return () => unsubscribe();
    }, [location]);

    // --- Language Switcher Helper ---
    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    if (status === 'loading' || !minDelayPassed) {
        return (
            <div className="flex flex-col h-[100dvh] bg-[#FFF8E1] items-center justify-center p-6 relative overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_#FFD54F_0%,_transparent_70%)] opacity-20 animate-pulse"></div>

                <div className="z-10 flex flex-col items-center text-center">
                    {/* Bouncing Logo / Icon */}
                    <div className="mb-8 relative">
                        <div className="w-24 h-24 bg-[#E68A00] rounded-full flex items-center justify-center shadow-xl animate-bounce">
                            <FontAwesomeIcon icon={faGift} className="text-white text-4xl" />
                        </div>
                        {/* Ripple Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[#E68A00] rounded-full animate-ping opacity-20"></div>
                    </div>

                    <h2 className="text-2xl font-black text-[#4E342E] mb-2 uppercase tracking-wide">
                        Friendly Code
                    </h2>

                    <p className="text-[#4E342E]/70 font-medium text-lg animate-pulse">
                        {t('calculating_discount')}
                    </p>
                </div>
            </div>
        );
    }

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
                    {status === 'error'
                        ? 'Please scan a valid QR code or contact the venue staff.'
                        : "This venue's rewards program is currently unavailable. Please check back later."}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-8 py-3 bg-[#E68A00] text-white font-black rounded-xl shadow-lg border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                    RETRY
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-[#FFF8E1] font-sans text-[#4E342E] antialiased overflow-hidden relative">

            {/* Language Switcher (Top Right) */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleLanguage}
                    className="bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#4E342E] border border-[#4E342E]/10 hover:bg-white/80 transition-all uppercase"
                >
                    {i18n.language === 'en' ? 'RU' : 'EN'}
                </button>
            </div>

            {/* Header */}
            <div className="pt-6 px-6 text-center z-10">
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Welcome to</p>
                <h2 className="text-2xl font-black leading-tight text-[#E68A00] mb-1">{venueName}</h2>
                <div className="flex items-center justify-center gap-1 opacity-40 p-10 -m-10 cursor-pointer" onClick={() => setDebugClicks(c => c + 1)}>
                    <span className="text-[12px] font-bold uppercase tracking-wider">powered by FriendlyCode</span>
                    <FontAwesomeIcon icon={faLeaf} className="text-[12px]" />
                </div>
            </div>

            {/* Main Content - Flex Grow to fill space without scrolling if possible */}
            <div className="flex-grow flex flex-col items-center justify-evenly px-6 pb-24 w-full max-w-md mx-auto">

                {/* Hero */}
                <div className="text-center mt-2">
                    {cooldown ? (
                        <>
                            {/* This case should practically disappear with new logic, but if used for "active day default": */}
                            <h1 className="text-[24px] font-black leading-tight mb-1 text-[#E68A00] whitespace-pre-line">
                                {t('welcome_back_headline', { percent: discount })}
                            </h1>
                            <p className="text-[#4E342E] opacity-70 font-bold text-sm">
                                {t('welcome_back_subhead', { defaultValue: 'The sooner you return, the bigger the reward.' })}
                            </p>
                        </>
                    ) : (
                        <h1 className="text-[24px] font-black leading-tight mb-1 whitespace-pre-line">
                            {guestName
                                ? t('welcome_back_headline', { percent: discount })
                                : t('reward_today_headline', { percent: discount })
                            }
                        </h1>
                    )}

                    {!cooldown && (
                        <p className="text-[#4E342E] opacity-60 font-medium text-xs">
                            {/* Dynamic Instruction based on current Discount */}
                            {discount >= 20
                                ? t('keep_max_reward_subtext')
                                : t('get_max_reward_subtext')
                            }
                        </p>
                    )}
                </div>

                {/* Gauge Visual - Reduced Size by 10% (was 285px -> ~256px) & Pivot Fixed */}
                <div className="relative w-[256px] h-[154px] flex items-center justify-center origin-center mx-auto my-8">
                    <svg viewBox="0 0 285 171" className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#E68A00" /> {/* Orange */}
                                <stop offset="100%" stopColor="#4CAF50" /> {/* Green */}
                            </linearGradient>
                        </defs>

                        {/* Background Track (Light Grey) */}
                        {/* Background Track (Light Grey -> Now Faded Gradient to ensure "Always Orange-Green") */}
                        <path
                            d="M 20 151 A 122.5 122.5 0 0 1 265 151"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="28"
                            strokeLinecap="round"
                            opacity="0.3"
                        />

                        {/* Progress Arch (Matches Gradient) - Always visible? No, masked by dashoffset */}
                        <path
                            d="M 20 151 A 122.5 122.5 0 0 1 265 151"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="28"
                            strokeLinecap="round"
                            strokeDasharray="385"
                            strokeDashoffset={385 * (1 - ((discount - 5) / 15))}
                        />

                        {/* Labels - Moved further out */}
                        <text x="20" y="151" dx="-45" dy="10" className="text-[20px] font-black fill-[#4E342E]">5%</text>
                        <text x="265" y="151" dx="20" dy="10" className="text-[20px] font-black fill-[#4E342E]">20%</text>

                        {/* Needle (Rounded Line) with ROBUST PIVOT */}
                        {/* 
                            Pivot Center: (142.5, 151) 
                            The group is translated to this point. 
                            Rotation logic: 0 deg = Left (Matches 5%), 180 deg = Right (Matches 20%).
                        */}
                        <motion.g
                            initial={{ rotate: 0, x: 142.5, y: 151 }}
                            animate={{
                                // Binary Logic: if discount > 5, rotate to 180 (Full). If 5, rotate to 0 (Empty).
                                // Tremble only active if discount is 5.
                                rotate: (discount > 5)
                                    ? 180 // Full Rotation for 10, 15, 20
                                    : (tremble ? [-3, 3, -3, 3, 0] : 0), // Tremble at 0 for 5
                                x: 142.5, // Fixed pivot position
                            }}
                            transition={{
                                rotate: (discount === 5 && tremble)
                                    ? { duration: 0.2, repeat: 3 } // Quick shake at 0
                                    : { duration: 1.5, type: "spring", bounce: 0.3 }, // Smooth sweep to 180
                                x: { duration: 0 }
                            }}
                            style={{ transformOrigin: "0px 0px" }} // CRITICAL: Rotate around the group origin (where pivot circle is)
                        >
                            {/* Needle Body: Points Left by default (angle 0) */}
                            <line
                                x1="0"
                                y1="0"
                                x2="-100"
                                y2="0"
                                stroke="#4E342E"
                                strokeWidth="8"
                                strokeLinecap="round"
                            />
                            {/* Pivot Decoration */}
                            <circle cx="0" cy="0" r="12" fill="#4E342E" />
                            <circle cx="0" cy="0" r="5" fill="#FFF8E1" /> {/* Match background cream color for "hole" look */}

                            {/* INVISIBLE COUNTERWEIGHT: Forces BBox center to be (0,0) so rotation works naturally */}
                            <line
                                x1="0"
                                y1="0"
                                x2="100"
                                y2="0"
                                stroke="transparent"
                                strokeWidth="0"
                            />
                        </motion.g>

                        {/* Centered Value Text */}
                        {/* Centered Value Text with Dynamic Color */}
                        {/* 5% -> Orange, 10% -> Red, 15% -> Orange, 20% -> Green */}
                        <text
                            x="142.5"
                            y="120"
                            textAnchor="middle"
                            className={`text-[56px] font-black ${discount === 20 ? 'fill-[#2E7D32]' :
                                discount === 10 ? 'fill-[#D32F2F]' :
                                    'fill-[#E68A00]' // 5% and 15% are Orange
                                }`}
                            style={{ fontFamily: 'sans-serif' }}
                        >
                            {discount}%
                        </text>
                    </svg>
                </div>

                {/* Timeline List - Compact */}
                <div className="space-y-2 w-full">
                    <TimelineItem
                        isCompleted={true}
                        text={t('today_dynamic', { percent: discount })}
                        color="bg-white border-[#81C784]"
                        iconColor="text-[#81C784]"
                        icon={faCheckCircle}
                        compact={true}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('tomorrow_val')}
                        isNext={true}
                        color="bg-white border-[#E68A00]/40"
                        iconColor="text-[#E68A00]"
                        icon={faGift}
                        compact={true}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('in_3_days')}
                        color="bg-white/40 border-[#4E342E]/10"
                        iconColor="text-[#4E342E]/30"
                        icon={faGift}
                        compact={true}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('in_7_days')}
                        color="bg-white/40 border-[#4E342E]/10"
                        iconColor="text-[#4E342E]/30"
                        icon={faGift}
                        compact={true}
                    />
                </div>

                <p className="text-center text-[10px] font-bold opacity-40 mt-4 max-w-[240px] mx-auto leading-relaxed uppercase tracking-wider">
                    {t('footer_motivation')}
                </p>
            </div>

            {/* Sticky CTA */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#FFF8E1] via-[#FFF8E1] to-transparent pb-8">
                <button
                    onClick={() => {
                        if (guestName) {
                            // If guest is recognized, skip input screen and go straight to reward
                            navigate('/thank-you', {
                                state: {
                                    guestName,
                                    guestEmail: localStorage.getItem('guestEmail'),
                                    discountValue: discount,
                                    venueId: localStorage.getItem('currentVenueId'),
                                    userRole
                                }
                            });
                        } else {
                            // New guest -> Capture details
                            navigate('/activate', { state: { discount, guestName, userRole } });
                        }
                    }}
                    className="w-full h-[64px] bg-[#E68A00] text-white rounded-[20px] font-black text-[18px] active:scale-[0.98] transition-all shadow-xl shadow-[#E68A00]/30 uppercase flex items-center justify-center gap-3"
                >
                    <FontAwesomeIcon icon={faRocket} />
                    {guestName ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                </button>
            </div>
            {/* Debug Overlay */}
            {debugClicks >= 5 && lastVisitDebug && (
                <div className="fixed top-20 left-4 right-4 bg-black/90 rounded-2xl border border-green-500 p-4 z-50 shadow-2xl" onClick={() => setDebugClicks(0)}>
                    <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
                        <h3 className="font-bold text-green-400 text-sm">DEBUG INFO</h3>
                        <button className="text-white">X</button>
                    </div>
                    <div className="space-y-2 font-mono text-[11px] text-white">
                        <DebugLine label="UID" value={lastVisitDebug.uid?.substring(0, 8) || "null"} />
                        <DebugLine label="Email" value={lastVisitDebug.email} />
                        <DebugLine label="Venue" value={lastVisitDebug.venueId || localStorage.getItem('currentVenueId')} />
                        <DebugLine label="Активный день" value={lastVisitDebug.daysAgoStr} />
                        <DebugLine label="Скидка сегодня" value={`${lastVisitDebug.discountToday}%`} />
                        <div className="text-[10px] text-white/50 mt-4 text-center border-t border-white/20 pt-2">(Нажмите, чтобы закрыть)</div>
                    </div>
                </div>
            )}
        </div >
    );
};

// Helper for Debug
const DebugLine = ({ label, value }) => (
    <div className="flex">
        <span className="w-24 text-white/70">{label}:</span>
        <span className="flex-1 text-white truncate">{value}</span>
    </div>
);

const TimelineItem = ({ isCompleted, text, isNext, color, iconColor, icon, compact }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'} rounded-xl border-2 transition-all ${color} ${isNext ? 'shadow-xl shadow-[#E68A00]/10 scale-[1.01]' : ''}`}
        >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-[#81C784]' : 'bg-[#4E342E]/5'}`}>
                <FontAwesomeIcon icon={icon || (isCompleted ? faCheckCircle : faGift)} className={`${isCompleted ? 'text-white' : iconColor} text-xs`} />
            </div>
            <span className={`font-bold ${compact ? 'text-sm' : 'text-lg'} ${isNext ? 'text-[#4E342E]' : 'text-[#4E342E]/70'}`}>
                {text}
            </span>
        </motion.div>
    );
};

export default LandingPage;
