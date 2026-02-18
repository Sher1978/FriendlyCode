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

    // Debug Mode State
    const [debugClicks, setDebugClicks] = useState(0);
    const [lastVisitDebug, setLastVisitDebug] = useState(null);

    const location = useLocation();

    useEffect(() => {
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
                    let debugInfo = { email, found: false, hours: 0, lastVisit: 'none' };

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

                            debugInfo = {
                                email,
                                found: true,
                                hours: result.hoursPassed.toFixed(1),
                                lastVisit: lastVisit.toISOString(),
                                status: result.status
                            };

                            if (result.status === 'cooldown') {
                                setCooldown({
                                    hoursPassed: result.hoursPassed,
                                    required: venueData.loyaltyConfig?.safetyCooldownHours || 12
                                });
                                // Optional: You could set a specific UI state here to tell them "Too soon!"
                                // For now, we just log it and they get 5% (percBase)
                                console.log(`Cooldown active. Hours passed: ${result.hoursPassed.toFixed(2)} < ${result.cooldownHours}`);
                            }
                        }
                    }
                    setLastVisitDebug(debugInfo);
                    setDiscount(calculatedDiscount);
                    setPredictionState({
                        percent: calculatedDiscount,
                        secondsLeft: result.secondsUntilDecay || 0,
                        label: result.status,
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

    if (status === 'loading') {
        return (
            <div className="flex flex-col h-[100dvh] bg-[#FFF8E1] p-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="h-4 w-24 bg-black/5 rounded mx-auto mb-2"></div>
                <div className="h-8 w-48 bg-black/10 rounded mx-auto mb-8"></div>

                {/* Hero Skeleton */}
                <div className="flex-grow flex flex-col items-center justify-center gap-8">
                    <div className="w-full max-w-xs space-y-4">
                        <div className="h-6 w-3/4 bg-black/5 rounded mx-auto"></div>
                        <div className="h-10 w-1/2 bg-black/10 rounded mx-auto"></div>
                    </div>

                    {/* Gauge Skeleton */}
                    <div className="w-48 h-32 bg-black/5 rounded-full rounded-b-none mx-auto opacity-50"></div>

                    {/* Timeline Skeleton */}
                    <div className="w-full max-w-md space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 w-full bg-black/5 rounded-xl"></div>
                        ))}
                    </div>
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

            {/* Header */}
            <div className="pt-6 px-6 text-center z-10">
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Welcome to</p>
                <h2 className="text-2xl font-black leading-tight text-[#E68A00] mb-1">{venueName}</h2>
                <div className="flex items-center justify-center gap-1 opacity-40" onClick={() => setDebugClicks(c => c + 1)}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">powered by FriendlyCode</span>
                    <FontAwesomeIcon icon={faLeaf} className="text-[10px]" />
                </div>
            </div>

            {/* Main Content - Flex Grow to fill space without scrolling if possible */}
            <div className="flex-grow flex flex-col items-center justify-evenly px-6 pb-24 w-full max-w-md mx-auto">

                {/* Hero */}
                <div className="text-center mt-2">
                    {cooldown ? (
                        <>
                            <h1 className="text-[20px] font-black leading-tight mb-1 text-[#E68A00]">
                                {t('too_soon_headline', 'Too soon! ⏳')}
                            </h1>
                            <p className="text-[#4E342E] opacity-70 font-bold text-sm">
                                {t('come_back_later', 'Come back in {{hours}} hours for a better reward.', { hours: (cooldown.required - cooldown.hoursPassed).toFixed(1) })}
                            </p>
                        </>
                    ) : (
                        <h1 className="text-[24px] font-black leading-tight mb-1">
                            {guestName
                                ? `${guestName}, рады Вам! 💗 Скидка: ${discount}%`
                                : `${t('your_discount_today').split(':')[0]}: ${discount}%`
                            }
                        </h1>
                    )}

                    {!guestName && !cooldown && (
                        <p className="text-[#4E342E] opacity-60 font-medium text-xs">
                            {t('want_max_discount')}
                        </p>
                    )}
                </div>

                {/* Gauge Visual - Scaled down slightly */}
                <div className="relative w-full h-32 flex items-center justify-center scale-90 origin-center">
                    <svg viewBox="0 0 200 120" className="w-48 h-32 overflow-visible">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#FFA726" />
                                <stop offset="100%" stopColor="#66BB6A" />
                            </linearGradient>
                            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                <feOffset dx="0" dy="2" result="offsetblur" />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.2" />
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Background Track (Soft Creamy/Orange) */}
                        <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="#FFCC80"
                            strokeOpacity="0.3"
                            strokeWidth="28"
                            strokeLinecap="round"
                        />

                        {/* Progress Arch (5% Segment) */}
                        <path
                            d="M 25 100 A 75 75 0 0 1 25.8 89.6"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="28"
                            strokeLinecap="round"
                            filter="url(#gaugeShadow)"
                        />

                        {/* Needle (Tapered & Rounded) */}
                        <g transform={`rotate(${9 + (discount - 5) * 10}, 100, 100)`}>
                            {/* Pivot */}
                            <circle cx="100" cy="100" r="8" fill="#5D4037" />
                            {/* Tapered Body */}
                            <path
                                d="M 100 106 L 38 100 L 100 94 Z"
                                fill="#5D4037"
                                stroke="#5D4037"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Percentage Text */}
                        <text x="100" y="80" textAnchor="middle" className="text-[36px] font-black fill-[#5D4037] drop-shadow-sm">
                            {discount}%
                        </text>

                        {/* Max Label */}
                        <text x="180" y="95" textAnchor="middle" className="text-[14px] font-bold fill-[#5D4037] opacity-60">
                            20%
                        </text>
                    </svg>
                </div>

                {/* Timeline List - Compact */}
                <div className="space-y-2 w-full">
                    <TimelineItem
                        isCompleted={true}
                        text={t('today_val')}
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
                <div className="fixed top-0 left-0 w-full bg-black/90 text-[#00FF00] p-4 z-50 font-mono text-xs overflow-auto" onClick={() => setDebugClicks(0)}>
                    <h3 className="font-bold text-lg mb-2">Debug Info</h3>
                    <p>Venue: {localStorage.getItem('currentVenueId')}</p>
                    <p>Email: {lastVisitDebug.email}</p>
                    <p>Found Visit: {lastVisitDebug.found ? 'YES' : 'NO'}</p>
                    <p>Last Timestamp: {lastVisitDebug.lastVisit}</p>
                    <p>Hours Passed: {lastVisitDebug.hours}</p>
                    <p className="mt-2 text-white/50">(Tap to close)</p>
                </div>
            )}
        </div >
    );
};

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
