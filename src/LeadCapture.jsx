import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faTelegram } from '@fortawesome/free-brands-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, getDoc, updateDoc, orderBy } from 'firebase/firestore';
import { RewardCalculator } from './logic/RewardCalculator';
import { findAndMergeUserByEmail } from './logic/userDeduplication';

// VIP Storage Wrappers to prevent SecurityErrors when storage is blocked (incognito/Telegram)
const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch (e) {} }
};

const safeSessionStorage = {
    getItem: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { console.warn('Session storage blocked'); } },
    removeItem: (k) => { try { sessionStorage.removeItem(k); } catch (e) {} }
};

const LeadCapture = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- STATE PERSISTENCE (Recover state after redirect) ---
    const [discount] = useState(() => {
        const stateDiscount = location.state?.discount;
        if (stateDiscount !== undefined) {
            safeSessionStorage.setItem('pendingDiscount', stateDiscount.toString());
            safeStorage.setItem('pendingDiscount', stateDiscount.toString());
            return stateDiscount;
        }
        return parseInt(safeSessionStorage.getItem('pendingDiscount') || safeStorage.getItem('pendingDiscount')) || 5;
    });

    React.useEffect(() => {
        if (location.state?.returnTo) {
            safeSessionStorage.setItem('authReturnTo', location.state.returnTo);
            safeStorage.setItem('authReturnTo', location.state.returnTo);
        } else if (location.state?.fromProfile) {
            safeSessionStorage.setItem('authReturnTo', 'profile');
            safeStorage.setItem('authReturnTo', 'profile');
        }
        if (location.state?.venueId) {
            safeStorage.setItem('currentVenueId', location.state.venueId);
        }
    }, [location.state]);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isInitialCheck, setIsInitialCheck] = useState(() => {
        return safeSessionStorage.getItem('googleRedirectStarted') === 'true' || !!(auth.currentUser?.email);
    });

    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const isAuthProcessingRef = useRef(false);

    // --- ROBUST AUTH REDIRECT & POPUP HANDLING ---
    React.useEffect(() => {
        const handleAuthAction = async (user) => {
            if (!user || isAuthProcessingRef.current) return;
            
            const guestEmail = user.email;
            if (!guestEmail) {
                console.log("User session found but no email yet (anonymous or pending redirect).");
                return;
            }

            console.log("Processing auth for:", guestEmail);
            isAuthProcessingRef.current = true;
            setIsGoogleLoading(true); 
            setIsInitialCheck(true);
            
            const venueId = safeStorage.getItem('currentVenueId') || 'unknown';
            let guestName = user.displayName || safeStorage.getItem('guestName');
            
            // If name is missing (common in some redirect flows), try to extract from getRedirectResult
            if (!guestName || guestName === 'Guest') {
                try {
                    const redirectResult = await getRedirectResult(auth);
                    if (redirectResult?.user?.displayName) {
                        guestName = redirectResult.user.displayName;
                    }
                } catch (e) {
                    console.log("Could not extract name from redirect result", e);
                }
            }
            guestName = guestName || 'Guest';

            try {
                await processAuthUser(guestName, guestEmail, user.uid, venueId);
                // Do NOT set isGoogleLoading to false here; let it unmount
            } catch (err) {
                console.error("Auth process error:", err);
                isAuthProcessingRef.current = false; // Allow retry on failure
                setIsGoogleLoading(false);
                setIsInitialCheck(false);
            }
        };

        const checkRedirect = async () => {
            console.log("Checking Google Auth redirect status...");
            const redirectStarted = safeSessionStorage.getItem('googleRedirectStarted') || safeStorage.getItem('googleRedirectStarted');
            safeSessionStorage.removeItem('googleRedirectStarted');
            safeStorage.removeItem('googleRedirectStarted');

            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    console.log("Redirect result user identified:", result.user.email);
                    await handleAuthAction(result.user);
                } else {
                    console.log("No redirect result found (Normal page load).");
                    if (redirectStarted === 'true') {
                        // The user was redirected back, but Firebase could not recover the session (e.g. in-app browser)
                        alert("Авторизация Google заблокирована встроенным браузером (In-App Browser). Пожалуйста, введите ваш Email вручную или откройте страницу в стандартном браузере (Safari/Chrome).");
                    }
                    setIsGoogleLoading(false);
                }
            } catch (error) {
                console.error("Google Redirect Error:", error);
                
                // Handle already-in-use error for redirect flow
                if (error.code === 'auth/credential-already-in-use') {
                    console.log("Account already in use. Attempting direct sign-in...");
                    try {
                        const credential = GoogleAuthProvider.credentialFromError(error);
                        if (credential) {
                            const result = await signInWithCredential(auth, credential);
                            await handleAuthAction(result.user);
                            return;
                        }
                    } catch (signInErr) {
                        console.error("Secondary sign-in failed:", signInErr);
                    }
                }
                
                setIsGoogleLoading(false);
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    alert("Authentication Error: " + error.message);
                }
            }
        };

        // Single entry point for auth check
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user ? `User(${user.email || 'anonymous'})` : "Null");
            if (user && user.email) {
                handleAuthAction(user);
            } else {
                checkRedirect().finally(() => setIsInitialCheck(false));
            }
        });

        return () => unsubscribe();
    }, []);
    // -----------------------------------------------

    const processAuthUser = async (userName = 'Guest', userEmail = '', currentUid, venueIdOverride, userTelegram = '') => {
        const urlParams = new URLSearchParams(location.search);
        const utmSource = urlParams.get('utm_source');
        const isGoogleBonus = utmSource === 'google_maps' || location.state?.fromGoogleMaps === true || location.state?.acquisition_source === 'google_maps_bonus';
        
        const safeEmail = (userEmail || '').trim();
        if (!safeEmail) {
            console.error("No email provided for processAuthUser");
            return;
        }
        const lowerEmail = safeEmail.toLowerCase();
        const venueId = venueIdOverride || safeStorage.getItem('currentVenueId') || 'unknown';
        let safeTelegram = (userTelegram || '').trim();
        if (safeTelegram && !safeTelegram.startsWith('@')) {
            safeTelegram = '@' + safeTelegram;
        }

        try {
            console.log(`Processing user ${lowerEmail} for venue ${venueId}`);
            
            let effectiveUid = currentUid || ('guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
            let finalDiscount = discount;

            // Save locally FIRST
            safeStorage.setItem('guestName', (userName || 'Guest').trim());
            safeStorage.setItem('guestEmail', lowerEmail);
            if (effectiveUid) safeStorage.setItem('effectiveUid', effectiveUid);

            // Bounded background sync promise so Firestore network delay never blocks navigation
            const syncPromise = (async () => {
                // 1. Sync with 'users' collection & merge duplicates if any
                try {
                    const mergeRes = await findAndMergeUserByEmail(db, lowerEmail, currentUid, {
                        displayName: (userName || 'Guest').trim(),
                        telegram: safeTelegram,
                        venueId: venueId
                    });
                    if (mergeRes.uid) {
                        effectiveUid = mergeRes.uid;
                        safeStorage.setItem('effectiveUid', effectiveUid);
                    }

                    // Check Fraud limits for Google Maps Bonus
                    let canClaimGoogleBonus = false;
                    
                    if (isGoogleBonus) {
                        const lastClaimedStr = mergeRes.userProfile?.googleMapsDiscountAt;
                        const lastClaimed = lastClaimedStr ? new Date(lastClaimedStr).getTime() : 0;
                        const now = Date.now();
                        const timeDiff = now - lastClaimed;

                        if (!lastClaimed || timeDiff > 30 * 24 * 60 * 60 * 1000) {
                            canClaimGoogleBonus = true;
                            const newTimestamp = new Date().toISOString();
                            try {
                                await updateDoc(doc(db, 'users', effectiveUid), {
                                    googleMapsDiscountAt: newTimestamp
                                });
                            } catch (e) {
                                console.warn("Failed to update googleMapsDiscountAt:", e);
                            }
                        } else if (timeDiff <= 24 * 60 * 60 * 1000) {
                            // Still within 24 hours of activation
                            canClaimGoogleBonus = true;
                        }
                    }

                    // Recalculate discount
                    try {
                        console.log("Searching for venue config:", venueId);
                        const vDoc = await getDoc(doc(db, 'venues', venueId));
                        if (vDoc.exists()) {
                            const venueData = vDoc.data();
                            console.log("Venue config found. Checking visit history for:", lowerEmail);
                            const qVisits = query(
                                collection(db, 'visits'),
                                where('guestEmail', '==', lowerEmail),
                                where('venueId', '==', venueId),
                                orderBy('timestamp', 'desc'),
                                limit(1)
                            );
                            const visitsSnap = await getDocs(qVisits);
                            if (!visitsSnap.empty) {
                                const lastVisitDate = visitsSnap.docs[0].data().timestamp.toDate();
                                const now = new Date();
                                const calcResult = RewardCalculator.calculate(lastVisitDate, now, venueData.loyaltyConfig || venueData.tiers, venueData.timezone || 'Asia/Dubai');
                                finalDiscount = calcResult.discount;
                                console.log("Loyalty discount calculated:", finalDiscount);
                            } else {
                                const config = venueData.loyaltyConfig || venueData.tiers;
                                let baseD = finalDiscount; // Default to initial fallback if something goes wrong
                                if (Array.isArray(config)) {
                                    const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
                                    if (percs.length > 0) baseD = Math.min(...percs);
                                } else if (config && config.percBase) {
                                    baseD = Number(config.percBase);
                                }
                                finalDiscount = baseD;
                                console.log("Base discount assigned to new user:", finalDiscount);
                            }
                            
                            // Override with Max Discount if Google Maps promotion
                            if (canClaimGoogleBonus) {
                                const config = venueData.loyaltyConfig || venueData.tiers;
                                let maxD = 20;
                                if (Array.isArray(config)) {
                                    const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
                                    if (percs.length > 0) maxD = Math.max(...percs);
                                } else if (config && config.percVip) {
                                    maxD = Number(config.percVip);
                                }
                                finalDiscount = maxD;
                                console.log("Max discount assigned for Google Maps promotion:", finalDiscount);
                            }
                        }
                    } catch (err) {
                        console.error("Discount calc error:", err);
                    }
                } catch (userErr) {
                    console.error("User collection sync error:", userErr);
                }

                // 2. Log Lead
                try {
                    await addDoc(collection(db, 'leads'), {
                        uid: effectiveUid,
                        name: (userName || 'Guest').trim(),
                        email: lowerEmail,
                        ...(safeTelegram ? { telegram: safeTelegram } : {}),
                        venueId: venueId,
                        timestamp: serverTimestamp(),
                        source: 'lead_capture',
                        ...(isGoogleBonus ? { acquisition_source: 'google_maps_bonus' } : {})
                    });
                } catch (e) {
                    console.warn("Lead logging failed but continuing:", e);
                }

                // 3. Notify Owner
                try {
                    await addDoc(collection(db, 'notifications'), {
                        venueId: venueId,
                        type: 'guest_status_usage',
                        message: `Ваш гость ${(userName || 'Guest').trim()} (${lowerEmail}) использовал свой Статус`,
                        timestamp: serverTimestamp(),
                        read: false
                    });
                } catch (e) {}
            })();

            // Race DB sync against 1.5s timeout so guest is never stuck
            await Promise.race([
                syncPromise,
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);

            // Check if user should return to profile or guest dashboard vs thank-you screen
            const authReturnTo = safeSessionStorage.getItem('authReturnTo') || safeStorage.getItem('authReturnTo') || (location.state?.fromProfile ? 'profile' : '') || location.state?.returnTo || '';
            safeSessionStorage.removeItem('authReturnTo');
            safeStorage.removeItem('authReturnTo');

            if (isGoogleBonus) {
                console.log("Navigating to Google Maps Bonus thank-you screen");
                navigate(`/google-thank-you?venueId=${venueId}`, {
                    state: {
                        guestName: (userName || 'Guest').trim(),
                        guestEmail: lowerEmail,
                        discountValue: finalDiscount,
                        venueId: venueId,
                        userRole: 'guest',
                        effectiveUid: effectiveUid,
                        acquisition_source: 'google_maps_bonus',
                        fromGoogleMaps: true
                    },
                    replace: true
                });
                return;
            }

            if (authReturnTo === 'profile' || authReturnTo === '/guest-dashboard') {
                console.log("Navigating back to profile / guest dashboard");
                navigate('/guest-dashboard', {
                    state: {
                        guestName: (userName || 'Guest').trim(),
                        guestEmail: lowerEmail,
                        effectiveUid: effectiveUid,
                        returnUrl: venueId && venueId !== 'unknown' ? `/test?id=${venueId}` : '/test'
                    },
                    replace: true
                });
                return;
            } else if (authReturnTo && authReturnTo.startsWith('/') && authReturnTo !== '/thank-you' && authReturnTo !== '/activate') {
                console.log("Navigating to custom returnUrl:", authReturnTo);
                navigate(`${authReturnTo}?venueId=${venueId}`, { 
                    state: {
                        guestName: (userName || 'Guest').trim(),
                        guestEmail: lowerEmail,
                        discountValue: finalDiscount,
                        venueId: venueId,
                        userRole: 'guest',
                        effectiveUid: effectiveUid,
                        ...(isGoogleBonus ? { acquisition_source: 'google_maps_bonus', fromGoogleMaps: true } : {})
                    },
                    replace: true 
                });
                return;
            }

            // Final Navigation to /thank-you page for lead capture submissions
            console.log("Navigating to activation thank-you screen with discount:", finalDiscount);
            navigate(`/thank-you?venueId=${venueId}`, {
                state: {
                    guestName: (userName || 'Guest').trim(),
                    guestEmail: lowerEmail,
                    discountValue: finalDiscount,
                    venueId: venueId,
                    userRole: 'guest',
                    effectiveUid: effectiveUid,
                    ...(isGoogleBonus ? { acquisition_source: 'google_maps_bonus', fromGoogleMaps: true } : {})
                },
                replace: true
            });
        } catch (e) {
            console.error("Critical error in processAuthUser:", e);
            const authReturnTo = safeSessionStorage.getItem('authReturnTo') || safeStorage.getItem('authReturnTo') || (location.state?.fromProfile ? 'profile' : '') || location.state?.returnTo || '';
            safeSessionStorage.removeItem('authReturnTo');
            safeStorage.removeItem('authReturnTo');
            if (authReturnTo === 'profile' || authReturnTo === '/guest-dashboard') {
                navigate('/guest-dashboard', { replace: true });
            } else if (isGoogleBonus) {
                navigate(`/google-thank-you?venueId=${venueId}`, { 
                    state: { 
                        guestName: (userName || 'Guest').trim(), 
                        guestEmail: lowerEmail, 
                        discountValue: discount, 
                        venueId: venueId,
                        acquisition_source: 'google_maps_bonus',
                        fromGoogleMaps: true
                    },
                    replace: true
                });
            } else {
                navigate(`/thank-you?venueId=${venueId}`, { 
                    state: { 
                        guestName: (userName || 'Guest').trim(), 
                        guestEmail: lowerEmail, 
                        discountValue: discount, 
                        venueId: venueId,
                        ...(isGoogleBonus ? { acquisition_source: 'google_maps_bonus', fromGoogleMaps: true } : {})
                    },
                    replace: true
                });
            }
        }
    };

    const handleContinue = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const domName = typeof document !== 'undefined' ? document.getElementById('lead-name-input')?.value : '';
        const domEmail = typeof document !== 'undefined' ? document.getElementById('lead-email-input')?.value : '';

        const safeName = (name || domName || '').trim() || 'Guest';
        let rawEmail = (email || domEmail || '').trim();
        
        let safeEmail = rawEmail.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

        if (!safeEmail) {
            safeEmail = `guest_${Date.now()}@friendlycode.fun`;
        } else if (!safeEmail.includes('@')) {
            safeEmail = `${safeEmail}@guest.com`;
        }
        
        setIsGoogleLoading(true);
        try {
            let user = auth.currentUser;
            if (!user) {
                console.log("No user found, signing in anonymously...");
                try {
                    const result = await Promise.race([
                        signInAnonymously(auth),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 2000))
                    ]);
                    user = result.user;
                } catch (authErr) {
                    console.warn("Anonymous sign in failed or timed out, continuing with guest UID:", authErr);
                    user = { uid: 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) };
                }
            }
            await processAuthUser(safeName, safeEmail, user.uid, null, '');
            // Do NOT set isGoogleLoading to false; let the unmount handle it
        } catch (err) {
            console.error("Manual entry auth error:", err);
            const venueId = safeStorage.getItem('currentVenueId') || 'unknown';
            navigate(`/thank-you?venueId=${venueId}`, { 
                state: { guestName: safeName, guestEmail: safeEmail, discountValue: discount, venueId: venueId },
                replace: true
            });
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            let result = null;
            try {
                result = await signInWithPopup(auth, googleProvider);
            } catch (popupError) {
                console.warn("signInWithPopup failed/blocked, checking fallback:", popupError);
                if (popupError.code === 'auth/popup-blocked') {
                    safeSessionStorage.setItem('googleRedirectStarted', 'true');
                    safeStorage.setItem('googleRedirectStarted', 'true');
                    await signInWithRedirect(auth, googleProvider);
                    // Leave isGoogleLoading true because the page will redirect away
                    return;
                }
                if (popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
                    setIsGoogleLoading(false);
                    return;
                }
                throw popupError;
            }

            if (result?.user) {
                const user = result.user;
                console.log("Google Sign-In successful for:", user.email);
                const venueId = safeStorage.getItem('currentVenueId') || 'unknown';
                const displayName = user.displayName || safeStorage.getItem('guestName') || 'Guest';
                if (!isAuthProcessingRef.current) {
                    isAuthProcessingRef.current = true;
                    await processAuthUser(displayName, user.email, user.uid, venueId);
                }
                // Leave isGoogleLoading true to wait for navigation
            } else {
                setIsGoogleLoading(false);
            }
        } catch (error) {
            console.error("Google Auth failed:", error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                alert("Google Sign-In failed: " + error.message);
            }
            setIsGoogleLoading(false);
        }
    };

    const handleTelegramSignIn = async () => {
        const venueId = safeStorage.getItem('currentVenueId') || 'unknown';
        const isRevoo = window.location.hostname.includes('revoo') || safeStorage.getItem('brandOverride') === 'revoo';
        const botName = isRevoo ? 'revoogiftx_bot' : 'FriendIycode_bot';
        const botUrl = `https://t.me/${botName}?start=auth_${venueId}`;

        // 1. Check if inside Telegram WebApp
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            const tgName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Telegram Guest';
            const tgHandle = tgUser.username ? `@${tgUser.username}` : '';
            const tgEmail = tgUser.username ? `${tgUser.username.toLowerCase()}@telegram.user` : `tg_${tgUser.id}@telegram.user`;

            setIsGoogleLoading(true);
            try {
                let user = auth.currentUser;
                if (!user) {
                    try {
                        const anonRes = await signInAnonymously(auth);
                        user = anonRes.user;
                    } catch (e) {
                        user = { uid: `tg_${tgUser.id}` };
                    }
                }
                await processAuthUser(tgName, tgEmail, user.uid || `tg_${tgUser.id}`, venueId, tgHandle);
            } catch (err) {
                console.error("Telegram WebApp auth error:", err);
            } finally {
                setIsGoogleLoading(false);
            }
            return;
        }

        // 2. Directly open Telegram Bot URL standardly
        try {
            window.open(botUrl, '_blank');
        } catch (e) {
            console.warn("Popup blocked, fallback to modal:", e);
        }

        // Show modal card with direct bot link button (no nick input)
        setShowTelegramModal(true);
    };

    const handleContinueWithTelegram = async () => {
        const venueId = safeStorage.getItem('currentVenueId') || 'unknown';
        const tgName = 'Telegram Guest';
        const tgEmail = `tg_${Date.now()}@telegram.user`;

        setIsGoogleLoading(true);
        try {
            let user = auth.currentUser;
            if (!user) {
                try {
                    const anonRes = await signInAnonymously(auth);
                    user = anonRes.user;
                } catch (e) {
                    user = { uid: `tg_${Date.now()}` };
                }
            }
            await processAuthUser(tgName, tgEmail, user.uid || `tg_${Date.now()}`, venueId, '');
        } catch (err) {
            console.error("Telegram auth process error:", err);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#000000] font-sans text-white antialiased overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-900/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex-grow flex flex-col px-6 py-8 relative z-10 max-w-md mx-auto w-full">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/60 shadow-sm border border-white/10 absolute top-6 left-6 z-10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                {isInitialCheck ? (
                    <div className="flex-grow flex flex-col items-center justify-center -mt-20">
                        <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                        <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">{t('checking_auth', 'Обработка данных...')}</p>
                    </div>
                ) : (
                    <>
                        {/* Header (moved up slightly) */}
                        <div className="mt-10 text-left">
                            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-tight mb-1 text-white">
                                {t('almost_there')}
                            </h1>
                            <p className="text-[15px] sm:text-[16px] text-white/40 font-medium">
                                {t('introduce_yourself')}
                            </p>
                        </div>

                        <form noValidate onSubmit={handleContinue} className="mt-6 flex-grow flex flex-col justify-between space-y-4">
                            <div className="space-y-4">
                                {/* Name Input */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 ml-1">
                                        {t('your_name')}
                                    </label>
                                    <div className="relative group">
                                        <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#D4AF37] transition-colors" />
                                        <input
                                            id="lead-name-input"
                                            type="text"
                                            placeholder="e.g., Alex"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onInput={(e) => setName(e.target.value)}
                                            className="w-full h-[54px] pl-12 pr-6 bg-white/5 border border-white/5 focus:border-[#D4AF37]/50 focus:bg-white/10 rounded-[18px] font-semibold text-[16px] text-white outline-none transition-all placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="flex flex-col gap-1.5 relative">
                                    <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30 ml-1">
                                        {t('your_email')}
                                    </label>
                                    <div className="relative group">
                                        <FontAwesomeIcon icon={faEnvelope} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#D4AF37] transition-colors" />
                                        <input
                                            id="lead-email-input"
                                            type="text"
                                            placeholder="name@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onInput={(e) => setEmail(e.target.value)}
                                            className="w-full h-[54px] pl-12 pr-6 bg-white/5 border border-white/5 focus:border-[#D4AF37]/50 focus:bg-white/10 rounded-[18px] font-semibold text-[16px] text-white outline-none transition-all placeholder:text-white/10"
                                        />
                                    </div>

                                    {/* Quick Email Domain Pills */}
                                    {(() => {
                                        const currentEmail = email || (typeof document !== 'undefined' ? document.getElementById('lead-email-input')?.value : '') || '';
                                        const cleanEmail = currentEmail.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                                        if (!cleanEmail.includes('@')) return null;
                                        const parts = cleanEmail.split('@');
                                        const username = parts[0];
                                        const typedDomain = (parts[1] || '').toLowerCase();
                                        
                                        if (typedDomain.includes('.') && typedDomain.split('.')[1]?.length >= 2) return null;

                                        const commonDomains = ['gmail.com', 'icloud.com', 'yahoo.com', 'outlook.com', 'mail.ru', 'yandex.ru'];
                                        const matchingDomains = commonDomains.filter(d => d.startsWith(typedDomain));

                                        if (matchingDomains.length === 0) return null;

                                        return (
                                            <div className="flex items-center gap-1.5 flex-wrap pt-1 animate-fadeIn">
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mr-1">Быстрый ввод:</span>
                                                {matchingDomains.map((domain) => (
                                                    <button
                                                        key={domain}
                                                        type="button"
                                                        onClick={() => setEmail(`${username}@${domain}`)}
                                                        className="bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#FFF] hover:text-[#D4AF37] text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all active:scale-95 shadow-sm cursor-pointer"
                                                    >
                                                        @{domain}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* --- FAST SOCIAL AUTH BUTTONS --- */}
                                <div className="flex flex-col gap-2.5 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                            {t('or_sign_in_with', 'быстрая авторизация')}
                                        </span>
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Telegram Sign-In */}
                                        <button
                                            type="button"
                                            onClick={handleTelegramSignIn}
                                            disabled={isGoogleLoading}
                                            className="h-[50px] px-4 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 active:scale-[0.98] rounded-[16px] flex items-center justify-center gap-2.5 font-bold text-xs text-white transition-all shadow-lg cursor-pointer"
                                        >
                                            <FontAwesomeIcon icon={faTelegram} className="text-lg text-[#0088cc]" />
                                            <span>Telegram</span>
                                        </button>

                                        {/* Google Sign-In */}
                                        <button
                                            type="button"
                                            onClick={handleGoogleSignIn}
                                            disabled={isGoogleLoading}
                                            className="h-[50px] px-4 bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 rounded-[16px] flex items-center justify-center gap-2.5 font-bold text-xs text-white transition-all shadow-lg cursor-pointer"
                                        >
                                            <FontAwesomeIcon icon={faGoogle} className="text-base text-white" />
                                            <span>Google</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow"></div>

                            {/* Submit - ALWAYS ACTIVE */}
                            <button
                                type="submit"
                                onClick={handleContinue}
                                onPointerDown={(e) => {
                                    if (!isGoogleLoading) handleContinue(e);
                                }}
                                disabled={isGoogleLoading}
                                className={`w-full h-[56px] rounded-[18px] font-bold text-[17px] uppercase tracking-wider transition-all flex items-center justify-center shadow-2xl ${!isGoogleLoading
                                    ? 'bg-[#D4AF37] text-black active:scale-[0.97] shadow-[#D4AF37]/20 hover:bg-[#F3E5AB] cursor-pointer'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                {isGoogleLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>{t('saving', 'Saving...')}</span>
                                    </div>
                                ) : (
                                    t('continue_reward')
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
            
            {/* Telegram Auth Modal */}
            <AnimatePresence>
                {showTelegramModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                        onClick={() => setShowTelegramModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1C1C1E] border border-[#0088cc]/40 rounded-[28px] p-6 text-center shadow-2xl relative max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center text-[#0088cc] mx-auto mb-4 shadow-[0_0_20px_rgba(0,136,204,0.3)]">
                                <FontAwesomeIcon icon={faTelegram} className="text-2xl" />
                            </div>

                            <h3 className="text-xl font-black text-white mb-2 leading-tight">
                                {t('telegram_auth_title', 'Авторизация через Telegram')}
                            </h3>
                            <p className="text-xs text-white/70 mb-6 leading-relaxed">
                                {t('telegram_auth_desc', 'Для мгновенной авторизации и получения вашей скидки откройте наш бот в Telegram:')}
                            </p>

                            <div className="space-y-3">
                                {(() => {
                                    const venueId = safeStorage.getItem('currentVenueId') || 'demo';
                                    const isRevoo = window.location.hostname.includes('revoo') || safeStorage.getItem('brandOverride') === 'revoo';
                                    const botName = isRevoo ? 'revoogiftx_bot' : 'FriendIycode_bot';
                                    const botUrl = `https://t.me/${botName}?start=auth_${venueId}`;

                                    return (
                                        <a
                                            href={botUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => {
                                                setShowTelegramModal(false);
                                                handleContinueWithTelegram();
                                            }}
                                            className="w-full h-[52px] rounded-xl bg-[#0088cc] hover:bg-[#0077bb] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                                        >
                                            <span>Открыть Telegram-бот</span>
                                            <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                                        </a>
                                    );
                                })()}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTelegramModal(false);
                                        handleContinueWithTelegram();
                                    }}
                                    className="w-full h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    {t('continue', 'Продолжить')}
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowTelegramModal(false)}
                                    className="text-[11px] font-medium text-white/40 hover:text-white/70 cursor-pointer"
                                >
                                    {t('cancel', 'Отмена')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Footer Note */}
            <div className="p-4 text-center">
                <p className="text-[10px] font-medium text-white/20 uppercase tracking-[0.1em]">Verified SECURE by FriendlyCode</p>
            </div>
        </div>
    );
};

export default LeadCapture;
