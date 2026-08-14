import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faExclamationTriangle, faStar, faClock, faUser, faWallet, faChartPie, faTimes, faArrowUp, faArrowDown, faWifi, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import UserMenu from './UserMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth, functions } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { RewardCalculator } from './logic/RewardCalculator';
import PngBattery, { getBatteryConfig } from './PngBattery';
import RevooStories from './RevooStories';
import { convertToGoogleReviewUrl } from './logic/googleMaps';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const safeSessionStorage = {
    getItem: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { console.warn('Session storage blocked'); } }
};

const TestQRPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [isDataReady, setIsDataReady] = useState(false);
    const isDataReadyRef = useRef(false);
    const discountReadyRef = useRef(false);
    const depositReadyRef = useRef(false);
    const [storiesCompleted, setStoriesCompleted] = useState(() => {
        try {
            const cachedBal = safeStorage.getItem('cached_deposit_balance');
            return (cachedBal && Number(cachedBal) > 0) || safeStorage.getItem('onboardingCompleted') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [discount, setDiscount] = useState(5);
    const [venueName, setVenueName] = useState('');
    const [cooldown, setCooldown] = useState(null);

    const [debugClicks, setDebugClicks] = useState(0);
    const [lastVisitDebug, setLastVisitDebug] = useState(null);

    const [guestName, setGuestName] = useState('');
    const [userRole, setUserRole] = useState('guest');
    const [loyaltyConfig, setLoyaltyConfig] = useState(null);
    const [predictionState, setPredictionState] = useState({
        percent: 5, secondsLeft: 0, label: 'reset', isBase: true, isMax: false
    });
    // Живой отсчёт для таймера
    const [liveSecondsLeft, setLiveSecondsLeft] = useState(0);
    const [depositBalance, setDepositBalance] = useState(() => {
        try {
            const cached = safeStorage.getItem('cached_deposit_balance');
            return cached ? Number(cached) : 0;
        } catch (e) {
            return 0;
        }
    });
    const [currentDiscountTier, setCurrentDiscountTier] = useState(4);
    const [depositTiers, setDepositTiers] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [venueCurrency, setVenueCurrency] = useState('VND');
    const [userProfile, setUserProfile] = useState(null);
    const [activeVenueId, setActiveVenueId] = useState('');
    const [venueData, setVenueData] = useState(null);
    const location = useLocation();
    const [showWifiModal, setShowWifiModal] = useState(false);

    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const dist = touchStart - touchEnd;
        const isLeftSwipe = dist > 50;
        const isRightSwipe = dist < -50;
        
        const isTestVenue = activeVenueId && (activeVenueId.toLowerCase() === 'demo' || activeVenueId.toLowerCase() === 'test');
        
        if (isTestVenue && (isLeftSwipe || isRightSwipe)) {
            const availableTiers = loyaltyConfig ? [
                loyaltyConfig.percBase || 5,
                loyaltyConfig.percDecay2 || 10,
                loyaltyConfig.percDecay1 || 15,
                loyaltyConfig.percVip || 20
            ].sort((a,b)=>b-a) : [20, 15, 10, 5];
            
            const currentIndex = availableTiers.indexOf(discount);
            let nextIndex = isLeftSwipe ? currentIndex + 1 : currentIndex - 1; 
            if (nextIndex >= availableTiers.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = availableTiers.length - 1;
            
            setDiscount(availableTiers[nextIndex]);
            setPredictionState({...predictionState, percent: availableTiers[nextIndex]});
        }
        setTouchStart(null);
        setTouchEnd(null);
    };

    const statusRef = useRef(status);
    useEffect(() => { 
        statusRef.current = status;
        // Optimization: if we are in TestQRPage and loading takes too long, 
        // we might want to manually set a timeout-based fallback to 'active' 
        // if we are just testing the UI.
    }, [status]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const rawId = searchParams.get('id') || searchParams.get('v') || 'default_venue';
        const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
        
        safeStorage.setItem('currentVenueId', venueId);
        setActiveVenueId(venueId);

        // --- PRELOAD VENUE NAME FROM CACHE (no early render) ---
        const cachedVenueRaw = safeStorage.getItem(`venue_cache_${venueId}`);
        const cachedName = safeStorage.getItem('guestName');
        if (cachedName) setGuestName(cachedName);

        if (cachedVenueRaw) {
            try {
                const cachedVenue = JSON.parse(cachedVenueRaw);
                setVenueName(cachedVenue.name || '');
                if (cachedVenue.loyaltyConfig) setLoyaltyConfig(cachedVenue.loyaltyConfig);
                setVenueData(cachedVenue);
                // NOTE: We do NOT setStatus('first') here — we wait for full data
            } catch (e) {}
        }

        // Absolute safety timeout: never block user longer than 3 seconds
        const safetyTimeoutId = setTimeout(() => {
            if (!isDataReadyRef.current) {
                console.warn("Safety timeout: forcing data-ready state");
                setIsDataReady(true);
                setStatus('first');
            }
        }, 3000);

        let unsubscribeUser = null;

        // NOTE: Background venue fetch removed — loyaltyConfig must only be set ONCE
        // inside checkUserAndVenue() before the gate opens (setStatus='first').
        // A post-render setLoyaltyConfig causes getMappedCapacity() to re-run
        // and the battery to repaint with different values after the screen is visible.

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try { await signInAnonymously(auth); } catch (e) {
                    console.error("Anonymous sign-in failed:", e);
                    if (statusRef.current === 'loading') setStatus('first');
                }
                return;
            }
            clearTimeout(safetyTimeoutId);

            const checkUserAndVenue = async () => {
                try {
                    let venueData = null;
                    let userData = null;

                    if (venueId === 'demo') {
                        venueData = {
                            name: "REVOO Cafe",
                            isActive: true,
                            loyaltyConfig: [
                                { maxHours: 24, percentage: 20 },
                                { maxHours: 48, percentage: 15 },
                                { maxHours: 144, percentage: 10 }
                            ],
                            defaultLanguage: 'en',
                            currency: 'VND'
                        };
                        const userRef = doc(db, 'users', user.uid);
                        const userSnap = await getDoc(userRef);
                        userData = userSnap.exists() ? userSnap.data() : null;
                    } else {
                        const venueRef = doc(db, 'venues', venueId);
                        const userRef = doc(db, 'users', user.uid);
                        
                        // PARALLEL FETCH
                        const [venueSnap, userSnap] = await Promise.all([
                            getDoc(venueRef),
                            getDoc(userRef)
                        ]);

                        if (!venueSnap.exists()) { 
                            if (statusRef.current === 'loading') setStatus('first');
                            return; 
                        }
                        venueData = venueSnap.data();
                        userData = userSnap.exists() ? userSnap.data() : null;
                        safeStorage.setItem(`venue_cache_${venueId}`, JSON.stringify(venueData));
                    }

                    setVenueName(venueData.name || '');
                    if (venueData.loyaltyConfig) setLoyaltyConfig(venueData.loyaltyConfig);

                    const savedLang = safeStorage.getItem('userLanguage');
                    const venueLang = venueData.defaultLanguage || 'en';
                    const targetLang = savedLang || venueLang;
                    if (i18n.language !== targetLang) i18n.changeLanguage(targetLang);

                    const now = new Date();
                    const expiry = venueData.subscription?.expiryDate?.toDate();
                    if (!venueData.isActive || (expiry && expiry < now)) { setStatus('blocked'); return; }

                    if (userData) {
                        setUserRole(userData.role || 'guest');
                        const displayName = userData.displayName || userData.name;
                        if (displayName) { setGuestName(displayName); safeStorage.setItem('guestName', displayName); }
                        if (userData.email) safeStorage.setItem('guestEmail', userData.email);
                        
                        setStoriesCompleted(true);
                        safeStorage.setItem('onboardingCompleted', 'true');
                    } else {
                        const savedName = safeStorage.getItem('guestName');
                        if (savedName) setGuestName(savedName);
                        const savedEmail = safeStorage.getItem('guestEmail');
                        if (savedEmail) {
                            setStoriesCompleted(true);
                            safeStorage.setItem('onboardingCompleted', 'true');
                        }
                    }

                    // --- DEPOSIT SETUP & REAL-TIME LISTENER ---
                    setVenueCurrency(venueData.currency || 'VND');

                    // 1. Fetch deposit tiers
                    const qTiers = query(
                        collection(db, 'deposit_tiers'), 
                        where('venueId', '==', venueId)
                    );
                    getDocs(qTiers).then(tiersSnap => {
                        const fetchedTiers = tiersSnap.docs.map(doc => doc.data());
                        setDepositTiers(fetchedTiers);
                    }).catch(err => console.error("Error fetching deposit tiers:", err));

                    // 2. Listen to user document in real time
                    // FIRST snapshot resolves depositReady, subsequent ones just update
                    let isFirstDepositSnapshot = true;
                    unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setUserProfile(data);

                            // Venue-strict deposit lookup
                            let balance = 0;
                            if (data.deposit_balances && data.deposit_balances[venueId] !== undefined) {
                                balance = Number(data.deposit_balances[venueId] || 0);
                            } else if (data.deposits && data.deposits[venueId] !== undefined) {
                                const val = data.deposits[venueId];
                                balance = Number(typeof val === 'object' ? (val.balance || 0) : val);
                            } else if (data.deposit_venue_id) {
                                balance = data.deposit_venue_id === venueId ? Number(data.deposit_balance || 0) : 0;
                            } else if (!data.venueId || data.venueId === venueId || venueId === 'demo') {
                                balance = Number(data.deposit_balance || 0);
                            }

                            setDepositBalance(balance);
                            safeStorage.setItem('cached_deposit_balance', String(balance));
                            setCurrentDiscountTier(Number(data.current_discount_tier ?? 4));

                            // Mark deposit as resolved after first snapshot
                            if (isFirstDepositSnapshot) {
                                isFirstDepositSnapshot = false;
                                depositReadyRef.current = true;
                                // If discount is already ready, unlock UI
                                if (discountReadyRef.current && !isDataReadyRef.current) {
                                    isDataReadyRef.current = true;
                                    setIsDataReady(true);
                                    setStatus('first');
                                }
                            }

                            // Trigger scan check-in (only once per session)
                            if (balance > 0 && !safeSessionStorage.getItem(`checkin_triggered_${venueId}`)) {
                                safeSessionStorage.setItem(`checkin_triggered_${venueId}`, 'true');
                                const checkinFn = httpsCallable(functions, 'triggerCustomerCheckin');
                                checkinFn({ venueId: venueId }).then(res => {
                                    console.log("Customer check-in triggered:", res.data);
                                }).catch(err => {
                                    console.error("Error triggering customer check-in:", err);
                                });
                            }
                        } else {
                            // No user doc — deposit is 0, mark ready
                            if (isFirstDepositSnapshot) {
                                isFirstDepositSnapshot = false;
                                depositReadyRef.current = true;
                                if (discountReadyRef.current && !isDataReadyRef.current) {
                                    isDataReadyRef.current = true;
                                    setIsDataReady(true);
                                    setStatus('first');
                                }
                            }
                        }
                    });

                    const rawEmail = userData?.email || safeStorage.getItem('guestEmail') || '';
                    const email = rawEmail.toLowerCase();
                    let calculatedDiscount = 5;
                    let result = null;
                    const tz = venueData.timezone || 'Asia/Dubai';
                    const todayStr = RewardCalculator.getVenueDateString(now, tz);
                    let debugInfo = { email: email || 'No Email', uid: user.uid, venueId, todayDate: todayStr, lastVisitDisplay: 'Никогда', daysAgoStr: 'Никогда', history: 'Нет', isDayActive: false, discountToday: 5, diffDays: 'N/A' };

                    // Fetch visits by UID or Email
                    let visitDocs = [];
                    try {
                        if (user?.uid) {
                            const qUidVisits = query(collection(db, 'visits'), where('uid', '==', user.uid), where('venueId', '==', venueId), orderBy('timestamp', 'desc'), limit(15));
                            const querySnapUid = await getDocs(qUidVisits);
                            if (!querySnapUid.empty) {
                                visitDocs = querySnapUid.docs;
                            }
                        }
                        if (visitDocs.length === 0 && email) {
                            const qEmailVisits = query(collection(db, 'visits'), where('guestEmail', '==', email), where('venueId', '==', venueId), orderBy('timestamp', 'desc'), limit(15));
                            const querySnapEmail = await getDocs(qEmailVisits);
                            if (!querySnapEmail.empty) {
                                visitDocs = querySnapEmail.docs;
                            }
                        }
                    } catch (errVisits) {
                        console.warn("Visits query error:", errVisits);
                    }

                    if (visitDocs.length > 0) {
                        const uniqueDays = [];
                        visitDocs.forEach(docSnap => {
                            const timestamp = docSnap.data().timestamp;
                            if (!timestamp) return;
                            const dateObj = timestamp.toDate();
                            const dateStr = RewardCalculator.getVenueDateString(dateObj, tz);
                            if (!uniqueDays.find(d => d.dateStr === dateStr)) uniqueDays.push({ dateStr, date: dateObj });
                        });

                        let lastVisitDateStr = null;
                        let isDayActive = false;

                        if (uniqueDays.length > 0 && uniqueDays[0].dateStr === todayStr) {
                            isDayActive = true;
                            if (uniqueDays.length > 1) lastVisitDateStr = uniqueDays[1].dateStr;
                        } else if (uniqueDays.length > 0) {
                            lastVisitDateStr = uniqueDays[0].dateStr;
                        }

                        result = RewardCalculator.calculate(lastVisitDateStr, now, venueData.loyaltyConfig, tz, isDayActive, userProfile?.hasLockedDiscount || false);
                        calculatedDiscount = result.discount;

                        // Find exact date/time of first visit TODAY and last visit of PREVIOUS days
                        const todayVisitsDocs = visitDocs.filter(d => {
                          const dt = d.data().timestamp?.toDate();
                          return dt && RewardCalculator.getVenueDateString(dt, tz) === todayStr;
                        });
                        
                        const firstVisitToday = todayVisitsDocs.length > 0 ? todayVisitsDocs[todayVisitsDocs.length - 1].data().timestamp?.toDate() : null;
                        const prevDayVisit = visitDocs.find(d => {
                          const dt = d.data().timestamp?.toDate();
                          return dt && RewardCalculator.getVenueDateString(dt, tz) !== todayStr;
                        })?.data().timestamp?.toDate();

                        if (firstVisitToday) {
                            const getActiveWindowHours = (cfg, perc) => {
                                if (!cfg) return 24;
                                if (Array.isArray(cfg)) {
                                    const match = cfg.find(t => Number(t.percentage || t.percent || 0) === Number(perc));
                                    if (match && match.maxHours) return Number(match.maxHours);
                                    const hours = cfg.map(t => Number(t.maxHours || 0)).filter(h => h > 0);
                                    return hours.length > 0 ? Math.max(...hours) : 24;
                                }
                                if (cfg.vipWindowHours) return Number(cfg.vipWindowHours);
                                if (cfg.vipWindowDays) return Number(cfg.vipWindowDays) * 24;
                                if (cfg.tier1DecayDays) return Number(cfg.tier1DecayDays) * 24;
                                return 24;
                            };

                            const activeWindowHours = getActiveWindowHours(venueData.loyaltyConfig, calculatedDiscount);
                            const windowEndTime = firstVisitToday.getTime() + (activeWindowHours * 60 * 60 * 1000);
                            const secondsLeft = Math.max(0, Math.floor((windowEndTime - now.getTime()) / 1000));
                            setLiveSecondsLeft(secondsLeft);
                        }

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
                        result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, tz, false, userProfile?.hasLockedDiscount || false);
                        calculatedDiscount = result.discount;
                        debugInfo.diffDays = result.diffDays ?? 'N/A';
                    }

                    // Auto-record visit for today upon QR scan/check-in
                    if (venueId && venueId !== 'demo' && user) {
                        const autoLogKey = `auto_logged_${venueId}_${todayStr}_${user.uid}`;
                        if (!safeSessionStorage.getItem(autoLogKey)) {
                            safeSessionStorage.setItem(autoLogKey, 'true');
                            addDoc(collection(db, 'visits'), {
                                guestEmail: (email || userData?.email || safeStorage.getItem('guestEmail') || 'guest').toLowerCase(),
                                guestName: guestName || userData?.displayName || userData?.name || 'Guest',
                                venueId: venueId,
                                discount: calculatedDiscount,
                                uid: user.uid,
                                userId: user.uid,
                                timestamp: serverTimestamp(),
                                source: 'qr_scan_auto'
                            }).catch(err => console.warn("Auto visit log error:", err));
                        }
                    }

                    setVenueData(venueData);
                    setLastVisitDebug(debugInfo);
                    setDiscount(calculatedDiscount);
                    const secondsLeft = result?.secondsUntilDecay || 0;
                    setPredictionState({ percent: calculatedDiscount, secondsLeft, label: result?.status || 'new', isBase: calculatedDiscount <= 5, isMax: calculatedDiscount >= 20 });
                    setLiveSecondsLeft(secondsLeft);
                    // Mark discount as calculated
                    discountReadyRef.current = true;
                    // If deposit snapshot already arrived, unlock UI
                    if (depositReadyRef.current && !isDataReadyRef.current) {
                        isDataReadyRef.current = true;
                        setIsDataReady(true);
                        setStatus('first');
                    }
                } catch (e) {
                    console.error("Error in checkUserAndVenue:", e);
                    setLastVisitDebug({ error: e.message || String(e) });
                    // On error, unlock immediately with whatever we have
                    if (!isDataReadyRef.current) {
                        isDataReadyRef.current = true;
                        setIsDataReady(true);
                        setStatus('first');
                    }
                }
            };
            checkUserAndVenue();
        });

        return () => {
            unsubscribe();
            if (unsubscribeUser) unsubscribeUser();
            clearTimeout(safetyTimeoutId);
        };
    }, [location]);

    const [isReviewPending, setIsReviewPending] = useState(false);
    const [showReviewSuccessModal, setShowReviewSuccessModal] = useState(false);

    const getNextTierProgress = () => {
        if (depositTiers.length === 0) return { progress: 0, nextThreshold: 0, nextDiscount: 0, isMax: false };
        
        const sortedTiers = [...depositTiers].sort((a, b) => a.minBalanceThreshold - b.minBalanceThreshold);
        const nextTier = sortedTiers.find(t => t.minBalanceThreshold > depositBalance);
        
        if (!nextTier) {
            return { progress: 100, nextThreshold: 0, nextDiscount: 0, isMax: true };
        }
        
        const currentTier = [...sortedTiers].reverse().find(t => t.minBalanceThreshold <= depositBalance);
        const currentThreshold = currentTier ? currentTier.minBalanceThreshold : 0;
        
        const range = nextTier.minBalanceThreshold - currentThreshold;
        const progress = range > 0 ? ((depositBalance - currentThreshold) / range) * 100 : 0;
        
        return {
            progress: Math.min(100, Math.max(0, progress)),
            nextThreshold: nextTier.minBalanceThreshold,
            nextDiscount: nextTier.discountPercentage,
            isMax: false
        };
    };

    const handleWriteGoogleReview = (url) => {
        if (!url) return;
        const reviewUrl = convertToGoogleReviewUrl(url);
        window.open(reviewUrl, '_blank', 'noopener,noreferrer');
        setIsReviewPending(true);
        
        setTimeout(async () => {
            setIsReviewPending(false);
            const nowIso = new Date().toISOString();
            const currentVenue = activeVenueId || safeStorage.getItem('currentVenueId');

            safeStorage.setItem('googleReviewClaimed', 'true');
            if (currentVenue) {
                safeStorage.setItem(`googleReviewClaimed_${currentVenue}`, 'true');
            }

            if (auth.currentUser?.uid && currentVenue) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        [`googleReviews.${currentVenue}`]: 'completed',
                        [`googleReviewCompletedAt.${currentVenue}`]: nowIso
                    });
                    console.log("Google review status updated in Firestore after 10s.");
                } catch (err) {
                    console.error("Error updating review status in Firestore:", err);
                }
            }

            setUserProfile(prev => ({
                ...(prev || {}),
                googleReviews: {
                    ...(prev?.googleReviews || {}),
                    [currentVenue]: 'completed'
                },
                googleReviewCompletedAt: {
                    ...(prev?.googleReviewCompletedAt || {}),
                    [currentVenue]: nowIso
                }
            }));

            setShowReviewSuccessModal(true);
        }, 10000);
    };

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        const email = userProfile?.email || safeStorage.getItem('guestEmail');
        if (!uid && !email) return;

        const targetId = uid || email;
        const qTx = query(
            collection(db, 'deposit_transactions'),
            where('userId', '==', targetId)
        );

        const unsubTx = onSnapshot(qTx, (snap) => {
            const txList = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by timestamp in JavaScript to prevent missing index errors
            txList.sort((a, b) => {
                const tA = a.createdAt?.seconds || (a.createdAt?.toDate ? Math.floor(a.createdAt.toDate().getTime() / 1000) : 0);
                const tB = b.createdAt?.seconds || (b.createdAt?.toDate ? Math.floor(b.createdAt.toDate().getTime() / 1000) : 0);
                return tB - tA;
            });
            setTransactions(txList);
        }, (err) => {
            console.error("Error loading transactions:", err);
        });

        return () => unsubTx();
    }, [auth.currentUser?.uid, userProfile?.email, depositBalance]);

    const toggleLanguage = () => {
        const cycle = { 'en': 'ru', 'ru': 'vi', 'vi': 'en' };
        const newLang = cycle[i18n.language] || 'en';
        safeStorage.setItem('userLanguage', newLang);
        i18n.changeLanguage(newLang);
    };

    const handleStoriesComplete = useCallback(() => {
        setStoriesCompleted(true);
        safeStorage.setItem('onboardingCompleted', 'true');
    }, []);

    // Живой обратный отсчёт таймера
    useEffect(() => {
        if (liveSecondsLeft <= 0) return;
        const interval = setInterval(() => {
            setLiveSecondsLeft(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [liveSecondsLeft > 0]);

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

    // ── LOADING DATA FALLBACK ──
    if (status === 'loading') {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-black items-center justify-center p-6 text-white relative">
                <div className="z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#1C1C1E] rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-pulse">
                        <img src="/revoo-logo.png" alt="REVOO Logo" className="w-[80%] h-[80%] object-contain" />
                    </div>
                    <p className="text-white/50 font-medium text-sm animate-pulse">{t('calculating_discount')}</p>
                </div>
            </div>
        );
    }

    // ── ONBOARDING STORIES (Strictly bypassed for active deposit holders) ──
    // Guard: only show/skip stories AFTER we know the real depositBalance
    if (isDataReady && !storiesCompleted && depositBalance <= 0) {
        return <RevooStories onComplete={handleStoriesComplete} />;
    }

    // ── Rank-Based Battery Mapping ──
    const getMappedCapacity = (currentDiscount, config) => {
        let sortedTiers = [];
        if (config) {
            if (Array.isArray(config)) {
                const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
                if (percs.length > 0) {
                    sortedTiers = [...new Set(percs)].sort((a, b) => a - b);
                }
            } else {
                const percs = [
                    Number(config.percBase),
                    Number(config.percDecay2),
                    Number(config.percDecay1),
                    Number(config.percVip)
                ].filter(p => !isNaN(p) && p > 0);
                if (percs.length > 0) {
                    sortedTiers = [...new Set(percs)].sort((a, b) => a - b);
                }
            }
        }

        if (sortedTiers.length === 0) {
            sortedTiers = [3, 5, 7, 10, 15, 20];
        }

        const val = Number(currentDiscount);
        const minVal = sortedTiers[0];
        const maxVal = sortedTiers[sortedTiers.length - 1];

        if (val <= minVal) return 10; // Lowest/Base Tier = Red
        if (val >= maxVal) return 100; // Highest/VIP Tier = Green

        // Find position in relative range
        const index = sortedTiers.indexOf(val);
        if (index !== -1) {
            const ratio = index / (sortedTiers.length - 1);
            if (ratio <= 0.34) return 25; // Orange
            if (ratio <= 0.67) return 50; // Yellow
            return 100; // Green
        }

        // Interpolation fallback
        if (val < sortedTiers[Math.floor(sortedTiers.length / 2)]) return 25;
        return 50;
    };

    const activeTier = [...depositTiers]
        .sort((a, b) => b.minBalanceThreshold - a.minBalanceThreshold)
        .find(t => depositBalance >= t.minBalanceThreshold);

    const getMaxDiscountFromConfig = (config) => {
        if (!config) return 20;
        if (Array.isArray(config)) {
            const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
            return percs.length > 0 ? Math.max(...percs) : 20;
        }
        return Number(config.percVip || 20);
    };
    const maxDiscount = getMaxDiscountFromConfig(loyaltyConfig);

    const getDepositDiscountFromVenue = () => {
        if (depositTiers && depositTiers.length > 0) {
            const maxTier = Math.max(...depositTiers.map(t => Number(t.discountPercentage || t.percentage || t.discount || 0)).filter(p => p > 0));
            if (maxTier > 0) return maxTier;
        }
        if (venueData) {
            const depPerc = Number(
                venueData.depositConfig?.bonusPercent ??
                venueData.depositConfig?.percent ??
                venueData.depositBonusPercent ??
                venueData.depositDiscount ??
                venueData.loyaltyConfig?.percDeposit ??
                0
            );
            if (depPerc > 0) return depPerc;
        }
        return maxDiscount;
    };
    const depositDiscount = getDepositDiscountFromVenue();

    const reviewCompletedAtRaw = userProfile?.googleReviewCompletedAt?.[activeVenueId] || userProfile?.googleReviewsCompletedAt?.[activeVenueId];
    let isReviewDiscountActive = false;
    let reviewDaysLeft = 0;
    let reviewHoursLeft = 0;
    let reviewMsLeft = 0;
    let reviewCompDate = null;

    if (reviewCompletedAtRaw) {
        if (typeof reviewCompletedAtRaw?.toDate === 'function') {
            reviewCompDate = reviewCompletedAtRaw.toDate();
        } else if (typeof reviewCompletedAtRaw === 'string' || typeof reviewCompletedAtRaw === 'number') {
            reviewCompDate = new Date(reviewCompletedAtRaw);
        } else if (reviewCompletedAtRaw?.seconds) {
            reviewCompDate = new Date(reviewCompletedAtRaw.seconds * 1000);
        }

        if (reviewCompDate && !isNaN(reviewCompDate.getTime())) {
            const durationMs = 7 * 24 * 60 * 60 * 1000;
            reviewMsLeft = (reviewCompDate.getTime() + durationMs) - Date.now();
            if (reviewMsLeft > 0) {
                isReviewDiscountActive = true;
                const totalHours = Math.floor(reviewMsLeft / (1000 * 60 * 60));
                reviewDaysLeft = Math.floor(totalHours / 24);
                reviewHoursLeft = totalHours % 24;
            }
        }
    }

    const displayDiscount = depositBalance > 0 
        ? (activeTier?.discountPercentage || discount) 
        : (isReviewDiscountActive ? maxDiscount : discount);

    const currentDiscount = displayDiscount;
    const mappedCapacity = getMappedCapacity(displayDiscount, loyaltyConfig);
    const currentCapacity = mappedCapacity;
    const batCfg = getBatteryConfig(currentCapacity);

    const formatDays = (d) => parseInt(d) === 1 ? '1 day' : `${d} days`;

    // Таймер: форматирование живого остатка
    const formatCountdown = (secs) => {
        if (secs <= 0) return '24ч 00м';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
        return `${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`;
    };

    // Определение вида текущей скидки (депозит, гугл карты, регулярная)
    const getDiscountTypeInfo = () => {
        if (depositBalance > 0) {
            return {
                type: 'deposit',
                badge: i18n.language?.startsWith('ru') ? '💰 За депозит' : '💰 Deposit',
                title: i18n.language?.startsWith('ru') ? 'Скидка по депозиту' : 'Deposit Discount',
                subtitle: i18n.language?.startsWith('ru') 
                    ? `Активирован Тир ${currentDiscountTier} (Баланс: ${depositBalance.toLocaleString()} ${venueCurrency})`
                    : `Tier ${currentDiscountTier} Active (Balance: ${depositBalance.toLocaleString()} ${venueCurrency})`,
                color: '#D4AF37',
                bgClass: 'from-[#D4AF37]/25 via-[#D4AF37]/10 to-black/40',
                borderClass: 'border-[#D4AF37]/50',
                textClass: 'text-[#D4AF37]',
                icon: faWallet
            };
        }

        if (isReviewDiscountActive && reviewCompDate) {
            let remainingStr = '';
            if (reviewMsLeft > 0) {
                remainingStr = i18n.language?.startsWith('ru') 
                    ? `Осталось действовать: ${reviewDaysLeft}д. ${reviewHoursLeft}ч.` 
                    : `Expires in: ${reviewDaysLeft}d ${reviewHoursLeft}h`;
            } else {
                remainingStr = i18n.language?.startsWith('ru') ? 'Срок действия истекает сегодня' : 'Expires today';
            }

            return {
                type: 'google_review',
                badge: i18n.language?.startsWith('ru') ? '⭐ За Google Отзыв' : '⭐ Google Maps Review',
                title: i18n.language?.startsWith('ru') ? 'Скидка за отзыв на Картах' : 'Google Maps Review Reward',
                subtitle: remainingStr,
                color: '#4285F4',
                bgClass: 'from-[#4285F4]/25 via-[#4285F4]/10 to-black/40',
                borderClass: 'border-[#4285F4]/50',
                textClass: 'text-[#4285F4]',
                icon: faStar
            };
        }

        // Regular visit discount
        let tierName = t('tier_base', 'Base');
        if (loyaltyConfig && Array.isArray(loyaltyConfig)) {
            const sorted = [...loyaltyConfig]
                .filter(c => Number(c.percentage || c.percent || c.discount || 0) > 0)
                .sort((a, b) => Number(b.percentage || b.percent || b.discount) - Number(a.percentage || a.percent || a.discount));
            const index = sorted.findIndex(t => Number(t.percentage || t.percent || t.discount) === displayDiscount);
            if (index === 0) tierName = t('tier_vip', 'VIP');
            else if (index > 0) tierName = t('tier_n', { n: index, defaultValue: `Tier ${index}` });
            else tierName = t('tier_base', 'Base');
        } else if (loyaltyConfig) {
            const vip = Number(loyaltyConfig.percVip);
            const medium = (loyaltyConfig.percDecay1 !== undefined && loyaltyConfig.percDecay1 !== null)
                ? Number(loyaltyConfig.percDecay1)
                : ((loyaltyConfig.percMedium !== undefined && loyaltyConfig.percMedium !== null)
                    ? Number(loyaltyConfig.percMedium)
                    : (loyaltyConfig.decayStages?.[0]?.discount !== undefined ? Number(loyaltyConfig.decayStages[0].discount) : null));
            const decay2 = (loyaltyConfig.percDecay2 !== undefined && loyaltyConfig.percDecay2 !== null)
                ? Number(loyaltyConfig.percDecay2)
                : (loyaltyConfig.decayStages?.[1]?.discount !== undefined ? Number(loyaltyConfig.decayStages[1].discount) : null);
            const base = Number(loyaltyConfig.percBase ?? 0);

            if (displayDiscount === vip) tierName = t('tier_vip', 'VIP');
            else if (displayDiscount === medium) tierName = t('tier_n', { n: 1, defaultValue: 'Tier 1' });
            else if (displayDiscount === decay2) tierName = t('tier_n', { n: 2, defaultValue: 'Tier 2' });
            else if (displayDiscount === base) tierName = t('tier_base', 'Base');
            else {
                if (displayDiscount >= 20) tierName = t('tier_vip', 'VIP');
                else if (displayDiscount >= 15) tierName = t('tier_n', { n: 1, defaultValue: 'Tier 1' });
                else if (displayDiscount >= 10) tierName = t('tier_n', { n: 2, defaultValue: 'Tier 2' });
                else tierName = t('tier_base', 'Base');
            }
        }

        return {
            type: 'regular',
            badge: t('badge_regular', { tier: tierName, defaultValue: `🔄 Regular (${tierName})` }),
            title: t('title_regular', { tier: tierName, defaultValue: `Regular Loyalty (${tierName})` }),
            subtitle: t('subtitle_regular', 'Based on visit frequency'),
            color: batCfg.fillColor || '#00FF41',
            bgClass: 'from-[#00FF41]/20 via-[#00FF41]/5 to-black/40',
            borderClass: 'border-[#00FF41]/30',
            textClass: 'text-emerald-400',
            icon: faGift
        };
    };

    // Таймлайн уровней скидок — строится динамически из DB
    const timelineItems = (() => {
        if (!loyaltyConfig) return [
            { label: 'Today', value: '–', sub: 'No config', color: '#FF3131' },
        ];

        if (Array.isArray(loyaltyConfig)) {
            // Формат массива: [{ maxHours, percentage }, ...]
            const sorted = [...loyaltyConfig]
                .filter(c => Number(c.percentage || c.percent || c.discount || 0) > 0)
                .sort((a, b) => Number(b.percentage || b.percent || b.discount) - Number(a.percentage || a.percent || a.discount));

            const colors = ['#00FF41', '#FFD700', '#FF8800', '#FF3131'];
            const labels = ['VIP Status', 'Level 1', 'Level 2', 'Base Rate'];

            return sorted.map((tier, index) => {
                const perc = Number(tier.percentage || tier.percent || tier.discount || 0);
                const hours = Number(tier.maxHours || (tier.days ? tier.days * 24 : 0));
                const days = Math.round(hours / 24);
                return {
                    label: labels[index] || `Level ${index}`,
                    value: `${perc}%`,
                    sub: days > 0 ? t('timeline_within', { days: formatDays(days) }) : t('timeline_any_other_time', 'Any other time'),
                    color: colors[index] || '#FF3131',
                    perc
                };
            });
        }

        // Формат объекта: { percVip, percDecay1, percMedium, percDecay2, percBase, decayStages, ... }
        const base = Number(loyaltyConfig.percBase ?? 0);
        const vip = loyaltyConfig.percVip !== undefined ? Number(loyaltyConfig.percVip) : null;
        
        const medium = (loyaltyConfig.percDecay1 !== undefined && loyaltyConfig.percDecay1 !== null)
            ? Number(loyaltyConfig.percDecay1)
            : ((loyaltyConfig.percMedium !== undefined && loyaltyConfig.percMedium !== null)
                ? Number(loyaltyConfig.percMedium)
                : (loyaltyConfig.decayStages?.[0]?.discount !== undefined ? Number(loyaltyConfig.decayStages[0].discount) : null));

        const decay2 = (loyaltyConfig.percDecay2 !== undefined && loyaltyConfig.percDecay2 !== null)
            ? Number(loyaltyConfig.percDecay2)
            : (loyaltyConfig.decayStages?.[1]?.discount !== undefined ? Number(loyaltyConfig.decayStages[1].discount) : null);

        const items = [];

        if (vip !== null && vip > base) {
            const vipDays = loyaltyConfig.vipWindowDays || (loyaltyConfig.vipWindowHours ? Math.round(loyaltyConfig.vipWindowHours / 24) : 1);
            items.push({
                label: 'VIP Status',
                value: `${vip}%`,
                sub: t('timeline_within', { days: formatDays(vipDays) }),
                color: '#00FF41',
                perc: vip
            });
        }

        if (medium !== null && medium > base && medium !== vip) {
            const mediumDays = loyaltyConfig.mediumDays || loyaltyConfig.tier1DecayDays || (loyaltyConfig.decayStages?.[0]?.days) || 7;
            items.push({
                label: 'Level 1',
                value: `${medium}%`,
                sub: t('timeline_within', { days: formatDays(mediumDays) }),
                color: '#FFD700',
                perc: medium
            });
        }

        if (decay2 !== null && decay2 > base && decay2 !== medium && decay2 !== vip) {
            const decay2Days = loyaltyConfig.tier2DecayDays || (loyaltyConfig.decayStages?.[1]?.days) || 14;
            items.push({
                label: 'Level 2',
                value: `${decay2}%`,
                sub: t('timeline_within', { days: formatDays(decay2Days) }),
                color: '#FF8800',
                perc: decay2
            });
        }

        // Base Rate — всегда показываем
        items.push({
            label: 'Base Rate',
            value: `${base}%`,
            sub: t('timeline_any_other_time', 'Any other time'),
            color: '#FF3131',
            perc: base
        });

        return items;
    })();

    // ── MAIN (iOS 26 Style Dark Mode) ──
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col min-h-[100dvh] bg-black font-sans text-white antialiased relative overflow-x-hidden"
            style={{ WebkitFontSmoothing: 'antialiased' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Ambient Background Glow Arrays (optimized for vivid mobile visibility) */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: batCfg.fillColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: batCfg.fillColor }} />

            {/* ── TOP HEADER SECTION (No Cover Image) ── */}
            <div className="relative w-full z-20 pt-4 pb-2 px-4 flex items-center justify-between gap-2 max-w-md mx-auto">
                {/* Left: User Profile / Menu Trigger */}
                <div className="flex-shrink-0">
                    <UserMenu 
                        user={auth.currentUser}
                        isGuestView={true}
                        venueColor={batCfg.fillColor}
                        trigger={
                            <div className="flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/20 cursor-pointer active:scale-95 transition-all shadow-lg">
                                <FontAwesomeIcon icon={faUser} className="text-[11px] text-white/70" />
                                <span className="text-[12px] font-bold tracking-wide text-white">{t('menu_guest_dashboard', 'Profile')}</span>
                            </div>
                        }
                    />
                </div>

                {/* Center: Venue Name Enlarged */}
                <div className="flex flex-col items-center text-center flex-1 min-w-0 px-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight truncate max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {venueName || "REVOO VENUE"}
                    </h1>
                </div>

                {/* Right: Language Toggle */}
                <div className="flex-shrink-0">
                    <button
                        onClick={toggleLanguage}
                        className="bg-black/50 hover:bg-black/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 active:scale-95 transition-all uppercase shadow-lg"
                    >
                        {(i18n.resolvedLanguage || i18n.language || 'en').substring(0, 2).toUpperCase()}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col items-center justify-start mt-1 px-6 pb-[140px] w-full max-w-md mx-auto z-10 gap-2.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>

                {/* Hero / Guest Welcome Greeting */}
                <div className="text-center flex flex-col items-center -mt-1 mb-1">
                    {guestName ? (
                        <div 
                            className="text-sm font-semibold tracking-tight text-white/80 flex items-center gap-1.5"
                            onClick={() => setDebugClicks(c => c + 1)}
                        >
                            <span>{t('hero_welcome_back', 'Welcome Back!')}</span>
                            <span className="text-amber-400 font-extrabold">{guestName}</span>
                        </div>
                    ) : (
                        <motion.button
                            onClick={() => navigate('/activate', { state: { discount, guestName, userRole } })}
                            className="text-[13px] font-semibold text-white bg-white/5 backdrop-blur-md px-5 py-2 rounded-full border mt-1 hover:bg-white/10 transition-colors"
                            animate={{ 
                                scale: [1, 1.06, 1],
                                boxShadow: [
                                    '0 0 0px rgba(255,255,255,0)', 
                                    '0 0 12px rgba(255,255,255,0.15)', 
                                    '0 0 0px rgba(255,255,255,0)'
                                ],
                                borderColor: [
                                    'rgba(255,255,255,0.1)',
                                    'rgba(255,255,255,0.4)',
                                    'rgba(255,255,255,0.1)'
                                ]
                            }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 1.6, 
                                ease: "easeInOut" 
                            }}
                        >
                            {t('hero_please_sign_in')}
                        </motion.button>
                    )}
                </div>

                {/* ── SCENARIO A: REGULAR GUEST WITHOUT DEPOSIT (Slogan + Discount Type Banner) ── */}
                {depositBalance <= 0 && (
                    <>
                        {/* ── ACTIVE DISCOUNT TYPE BANNER ── */}
                        {(() => {
                            const discountInfo = getDiscountTypeInfo();
                            return (
                                <div className={`w-full bg-gradient-to-r ${discountInfo.bgClass} bg-[#1C1C1E]/90 backdrop-blur-2xl border ${discountInfo.borderClass} rounded-[24px] p-3.5 flex items-center justify-between shadow-2xl flex-shrink-0 relative overflow-hidden transition-all`}>
                                    <div className="flex items-center gap-3.5 z-10 min-w-0">
                                        <div 
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-base shadow-lg flex-shrink-0"
                                            style={{ 
                                                backgroundColor: `${discountInfo.color}25`,
                                                border: `1px solid ${discountInfo.color}50`,
                                                color: discountInfo.color 
                                            }}
                                        >
                                            <FontAwesomeIcon icon={discountInfo.icon} />
                                        </div>
                                        <div className="flex flex-col text-left min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                                    {t('title_discount_type', 'Discount Type')}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-white leading-tight truncate">
                                                {discountInfo.title}
                                            </span>
                                            <span className="text-[11px] font-bold text-white/70 mt-0.5 truncate">
                                                {discountInfo.subtitle}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end pl-2 z-10 flex-shrink-0">
                                        <span className="text-2xl font-black tracking-tight drop-shadow-md" style={{ color: discountInfo.color }}>
                                            {displayDiscount}%
                                        </span>
                                        <span 
                                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5"
                                            style={{ 
                                                backgroundColor: `${discountInfo.color}15`,
                                                borderColor: `${discountInfo.color}40`,
                                                color: discountInfo.color 
                                            }}
                                        >
                                            {discountInfo.type === 'deposit' ? t('badge_type_deposit', 'Deposit') : (discountInfo.type === 'google_review' ? t('badge_type_review', 'Google Maps') : t('badge_type_regular', 'Regular'))}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}

                {/* ── GOOGLE MAPS REVIEW PROMO BANNER ── */}
                {(venueData?.googleReviewLink || venueData?.googleMapsUrl) && !isReviewDiscountActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-gradient-to-r from-[#4285F4]/20 via-[#34A853]/10 to-[#FBBC04]/20 bg-[#1C1C1E]/90 backdrop-blur-2xl border border-[#4285F4]/40 rounded-[28px] p-4 flex items-center justify-between gap-3 shadow-2xl relative overflow-hidden flex-shrink-0"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-[#4285F4]/20 border border-[#4285F4]/40 flex items-center justify-center text-[#4285F4] text-lg shadow-lg flex-shrink-0">
                                <FontAwesomeIcon icon={faStar} className="animate-pulse" />
                            </div>
                            <div className="flex flex-col min-w-0 text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#4285F4]">
                                    {i18n.language?.startsWith('ru') ? '⭐ Бонус за отзыв' : '⭐ Review Bonus'}
                                </span>
                                <span className="text-xs font-black text-white leading-tight truncate">
                                    {i18n.language?.startsWith('ru') ? `Получить скидку ${maxDiscount}% на 7 дней` : `Get ${maxDiscount}% off for 7 days`}
                                </span>
                                <span className="text-[10px] font-medium text-white/60 mt-0.5 truncate">
                                    {i18n.language?.startsWith('ru') ? 'Оставьте отзыв на Картах Google' : 'Leave a review on Google Maps'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleWriteGoogleReview(venueData.googleReviewLink || venueData.googleMapsUrl)}
                            disabled={isReviewPending}
                            className="px-4 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex-shrink-0 flex items-center gap-1.5"
                        >
                            {isReviewPending ? (
                                <span>10 сек...</span>
                            ) : (
                                <>
                                    <span>{i18n.language?.startsWith('ru') ? 'Отзыв' : 'Review'}</span>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* ── CONDITIONAL DISPLAY: DEPOSIT HOLDER vs REGULAR BATTERY ── */}
                {depositBalance > 0 ? (
                    /* ── DEPOSIT HOLDER VIEW (No battery, personal QR code for deduction) ── */
                    <div className="flex flex-col items-center w-full bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-[#D4AF37]/40 rounded-[28px] p-5 shadow-2xl relative overflow-hidden flex-shrink-0 text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center gap-2 mb-1">
                            <FontAwesomeIcon icon={faWallet} className="text-[#D4AF37] text-sm" />
                            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Ваш баланс депозита</span>
                        </div>

                        <div className="text-4xl font-black text-white tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                            {depositBalance.toLocaleString()} <span className="text-sm font-medium text-white/50">{venueCurrency}</span>
                        </div>

                        {/* Personal QR Code for Staff to Deduct Bill */}
                        <div className="bg-white p-3 rounded-2xl shadow-xl mb-3 border border-white/20">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                                    `https://bot-lab-21910.web.app/admin/#/deposit?uid=${auth.currentUser?.uid || auth.currentUser?.email || ''}&action=deduct`
                                )}`}
                                alt="Personal Deposit QR"
                                className="w-[160px] h-[160px] block mx-auto"
                            />
                        </div>
                        
                        <p className="text-[11px] font-bold text-white/70 tracking-wide uppercase">
                            Покажите этот QR-код официанту для списания чека
                        </p>
                    </div>
                ) : (
                    /* ── GLASS BATTERY CONTAINER (Modern Floating Card) ── */
                    <div className="flex flex-col items-center w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[28px] p-4 shadow-2xl relative overflow-hidden">
                        
                        {/* Inner highlight ring */}
                        <div className="absolute inset-0 border border-white/5 rounded-[28px] pointer-events-none mix-blend-overlay"></div>

                        {/* VIP Status Label */}
                        <p className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase mb-0">
                            {t('vip_battery_charge_label', 'VIP Battery Charge')}
                        </p>

                        {/* Massive Accent Number */}
                        <div 
                            className="h-[60px] overflow-hidden relative w-[180px] flex items-center justify-center"
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
                            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[#1C1C1E] to-transparent z-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#1C1C1E] to-transparent z-20 pointer-events-none" />

                            <motion.div 
                                animate={{ 
                                    scale: [1, 1.06, 1],
                                    textShadow: [
                                        `0 0 10px ${batCfg.fillColor}, 0 0 20px ${batCfg.fillColor}`,
                                        `0 0 20px ${batCfg.fillColor}, 0 0 40px ${batCfg.fillColor}, 0 0 60px ${batCfg.fillColor}`,
                                        `0 0 10px ${batCfg.fillColor}, 0 0 20px ${batCfg.fillColor}`
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                className="text-[56px] font-bold leading-[60px] tracking-tighter text-center"
                            >
                                {currentDiscount}%
                            </motion.div>
                        </div>
                        {(() => {
                            const dInfo = getDiscountTypeInfo();
                            return (
                                <div className="px-3.5 py-1 rounded-full border border-white/15 bg-white/5 flex items-center gap-1.5 mb-3 shadow-sm backdrop-blur-md">
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-white/90">
                                        {dInfo.badge}
                                    </span>
                                </div>
                            );
                        })()}

                        <div className="w-full relative z-10 pointer-events-none">
                            <PngBattery capacity={currentCapacity} />
                        </div>
                    </div>
                )}

                {/* ── VIP WI-FI BANNER ── */}
                {venueData?.has_captive_wifi && (
                    <>
                        <motion.div 
                            whileTap={{ scale: safeSessionStorage.getItem('is_captive_redirect') !== 'true' ? 0.98 : 1 }}
                            onClick={() => {
                                if (safeSessionStorage.getItem('is_captive_redirect') !== 'true') {
                                    setShowWifiModal(true);
                                }
                            }}
                            className="w-full bg-[#1C1C1E]/60 backdrop-blur-[45px] border border-white/10 rounded-[28px] p-4 flex items-center gap-4 relative overflow-hidden flex-shrink-0 cursor-pointer shadow-lg"
                            style={{
                                boxShadow: '0 0 15px rgba(255, 255, 255, 0.05), inset 0 0 10px rgba(255, 255, 255, 0.02)'
                            }}
                        >
                            <div className="absolute inset-0 border border-white/5 rounded-[28px] pointer-events-none" />
                            
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF41]/20 to-[#00FF41]/5 border border-[#00FF41]/30 flex items-center justify-center text-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                                <FontAwesomeIcon icon={faWifi} className="text-base animate-pulse" />
                            </div>
                            
                            <div className="flex flex-col flex-1">
                                <span className="font-bold text-[13px] text-white leading-tight">
                                    {i18n.language?.startsWith('ru') ? "📶 В этом заведении работает VIP Wi-Fi" : (i18n.language?.startsWith('vi') ? "📶 Wi-Fi VIP có sẵn tại địa điểm này" : "📶 VIP Wi-Fi is available at this venue")}
                                </span>
                                <span className="text-[10px] text-white/55 font-medium mt-0.5">
                                    {i18n.language?.startsWith('ru') ? `Сеть: ${venueData.wifi_ssid || 'Revo_Free_WiFi'} | Без пароля` : (i18n.language?.startsWith('vi') ? `Mạng: ${venueData.wifi_ssid || 'Revo_Free_WiFi'} | Không mật khẩu` : `Network: ${venueData.wifi_ssid || 'Revo_Free_WiFi'} | No password`)}
                                </span>
                            </div>
                            
                            {safeSessionStorage.getItem('is_captive_redirect') !== 'true' && (
                                <div className="text-white/40 text-xs">
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </div>
                            )}
                        </motion.div>

                        <AnimatePresence>
                            {showWifiModal && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-6"
                                    onClick={() => setShowWifiModal(false)}
                                >
                                    <motion.div 
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[40%] rounded-full blur-[50px] opacity-10 bg-[#00FF41]" />
                                        
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-[#00FF41]/10 border border-[#00FF41]/20 flex items-center justify-center text-[#00FF41] mb-4">
                                                <FontAwesomeIcon icon={faWifi} className="text-lg" />
                                            </div>
                                            <h3 className="text-lg font-black tracking-tight text-white mb-3">
                                                {i18n.language?.startsWith('ru') ? "Подключение к VIP Wi-Fi" : (i18n.language?.startsWith('vi') ? "Kết nối với Wi-Fi VIP" : "Connect to VIP Wi-Fi")}
                                            </h3>
                                            <p className="text-xs text-white/70 leading-relaxed mb-6">
                                                {i18n.language?.startsWith('ru') 
                                                    ? `Как подключиться: Откройте настройки Wi-Fi вашего смартфона, выберите открытую сеть "${venueData.wifi_ssid || 'Revo_Free_WiFi'}", и система автоматически авторизует ваше устройство с сохранением всех ваших скидок и депозитов.`
                                                    : (i18n.language?.startsWith('vi')
                                                        ? `Cách kết nối: Mở cài đặt Wi-Fi trên điện thoại của bạn, chọn mạng mở "${venueData.wifi_ssid || 'Revo_Free_WiFi'}" và hệ thống sẽ tự động ủy quyền cho thiết bị của bạn trong khi vẫn giữ nguyên tất cả các khoản chiết khấu và tiền gửi của bạn.`
                                                        : `How to connect: Open your smartphone's Wi-Fi settings, select the open network "${venueData.wifi_ssid || 'Revo_Free_WiFi'}", and the system will automatically authorize your device while preserving all your discounts and deposits.`
                                                    )}
                                            </p>
                                            <button
                                                onClick={() => setShowWifiModal(false)}
                                                className="w-full py-3.5 bg-white text-black font-extrabold rounded-[18px] text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
                                            >
                                                {i18n.language?.startsWith('ru') ? "Понятно" : (i18n.language?.startsWith('vi') ? "Đã hiểu" : "Got it")}
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}

                {/* ── DEPOSIT WALLET CARD ── */}
                {depositBalance > 0 && (
                    <div className="w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[28px] p-5 shadow-2xl relative overflow-hidden flex flex-col flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faWallet} className="text-emerald-400 text-lg" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Revoo Wallet</span>
                            </div>
                            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tier {currentDiscountTier} Active</span>
                            </div>
                        </div>
                        
                        <div className="text-3xl font-black text-white tracking-tight mb-4">
                            {depositBalance.toLocaleString()} <span className="text-xs font-medium text-white/50">{venueCurrency}</span>
                        </div>

                        {/* Next Tier Progress */}
                        {(() => {
                            const progressInfo = getNextTierProgress();
                            return (
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                        {progressInfo.isMax ? (
                                            <span className="text-emerald-400">🎉 Maximum tier unlocked</span>
                                        ) : (
                                            <>
                                                <span>Next tier: {progressInfo.nextThreshold.toLocaleString()} {venueCurrency}</span>
                                                <span>{progressInfo.progress.toFixed(0)}%</span>
                                            </>
                                        )}
                                    </div>
                                    {!progressInfo.isMax && (
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                                                style={{ width: `${progressInfo.progress}%`, transition: 'width 0.5s ease-out' }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* History Button */}
                        <button 
                            onClick={() => setIsHistoryOpen(true)}
                            className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/70 flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                        >
                            <FontAwesomeIcon icon={faChartPie} />
                            View Wallet History
                        </button>
                    </div>
                )}

                    {/* ── TOMORROW'S UPGRADE & VISIT OFFER CARD (Hidden for active deposit holders) ── */}
                    {depositBalance <= 0 && (
                        <div className="w-full bg-[#1C1C1E]/80 backdrop-blur-3xl border border-emerald-500/40 rounded-[28px] p-5 shadow-2xl relative overflow-hidden flex flex-col flex-shrink-0">
                            {/* Subtle ambient glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41]/10 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#00FF41]/20 border border-[#00FF41]/30 flex items-center justify-center text-[#00FF41]">
                                        <FontAwesomeIcon icon={faClock} className="text-sm" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Предложение визита</span>
                                </div>
                                <div className="bg-[#00FF41]/10 border border-[#00FF41]/30 rounded-full px-3 py-1">
                                    <span className="text-[10px] font-black text-[#00FF41] uppercase tracking-widest">Макс. выгода</span>
                                </div>
                            </div>

                            <div className="text-base font-black text-white mb-1.5 leading-snug">
                                Вернись завтра за максимальной скидкой {maxDiscount}%!
                            </div>
                            <p className="text-[11px] font-medium text-white/70 leading-relaxed mb-4">
                                Приходи к нам завтра и твоя скидка автоматически вырастет до максимальной. Чем регулярнее визиты, тем выше твой ВИП статус!
                            </p>

                            {/* 2-Column Tomorrow Discount & Timer Display */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-black/50 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-inner">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/50 mb-1">Завтра вас ждет</span>
                                    <motion.span 
                                        animate={{
                                            scale: [1, 1.08, 1],
                                            textShadow: [
                                                '0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)',
                                                '0 0 20px rgba(0,255,65,0.9), 0 0 35px rgba(0,255,65,0.7)',
                                                '0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.3)'
                                            ]
                                        }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                        className="text-3xl font-black text-[#00FF41] leading-none mt-0.5 inline-block"
                                    >
                                        {maxDiscount}%
                                    </motion.span>
                                </div>

                                <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-inner">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/50 mb-1">Сгорит через</span>
                                    <span className="text-sm font-black text-[#FFD700] flex items-center gap-1.5 mt-1">
                                        <FontAwesomeIcon icon={faClock} className="text-[11px] animate-spin" style={{ animationDuration: '10s' }} />
                                        {formatCountdown(liveSecondsLeft)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TOP UP DEPOSIT PROPOSAL CARD (Shown when deposit is 0) ── */}
                    {depositBalance <= 0 && (
                        <div className="w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-[#D4AF37]/40 rounded-[28px] p-5 shadow-2xl relative overflow-hidden flex flex-col flex-shrink-0">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center text-[#D4AF37]">
                                    <FontAwesomeIcon icon={faWallet} className="text-sm" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">💰 {t('deposit_qr_code')}</span>
                            </div>
                            
                            <div className="text-base font-bold text-white mb-1.5 leading-snug">
                                {t('lock_max_vip', { percent: depositDiscount })}
                            </div>
                            <p className="text-xs text-white/70 mb-3 leading-relaxed">
                                {t('ask_staff_topup', { percent: depositDiscount })}
                            </p>

                            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-3 text-center">
                                <span className="text-xs font-bold text-[#D4AF37]">
                                    {t('ask_waiter_scan_qr')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* iOS Settings-style Timeline Widget (Hidden for active deposit holders) */}
                    {depositBalance <= 0 && (
                        <>
                            <div className="w-full bg-[#1C1C1E] rounded-[24px] overflow-hidden flex flex-col border border-white/5 shadow-xl mt-0">
                                {timelineItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 relative px-4 hover:bg-white/5 transition-colors">
                                        {/* Icon Box */}
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}30` }}>
                                            <FontAwesomeIcon icon={faGift} className="text-[10px]" />
                                        </div>
                                        
                                        {/* Text labels */}
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

                            <p className="mt-4 text-[11px] font-medium text-white/40 text-center px-4 leading-relaxed tracking-wider">
                                {i18n.language === 'ru' ? 'Чем чаще ты посещаешь, тем выше ВИП статус и награда!' : 'The more often you visit, the higher your VIP status and reward!'}
                            </p>
                        </>
                    )}

            </div>

            {/* Sticky CTA (Hidden when active deposit exists) */}
            {depositBalance <= 0 && (
                <div className="fixed bottom-0 left-0 w-full p-4 pt-10 bg-gradient-to-t from-black via-black/90 to-transparent pb-6 z-50 flex justify-center">
                    <button
                        onClick={() => {
                            const guestEmailLS = safeStorage.getItem('guestEmail');
                            const guestEmailAuth = auth.currentUser?.email || '';
                            const resolvedEmail = guestEmailLS || guestEmailAuth;
                            const resolvedName = guestName || auth.currentUser?.displayName || '';
                            const currentVenue = activeVenueId || safeStorage.getItem('currentVenueId') || 'demo';

                            if (resolvedEmail && currentVenue && currentVenue !== 'demo') {
                                addDoc(collection(db, 'visits'), {
                                    guestEmail: resolvedEmail.toLowerCase(),
                                    guestName: resolvedName || 'Guest',
                                    venueId: currentVenue,
                                    discount: displayDiscount,
                                    uid: auth.currentUser?.uid || '',
                                    timestamp: serverTimestamp(),
                                    source: 'qr_test_button'
                                }).catch(e => console.warn("Visit log error:", e));
                            }

                            if (resolvedName || resolvedEmail) {
                                navigate('/thank-you', { state: { guestName: resolvedName || 'Friend', guestEmail: resolvedEmail, discountValue: displayDiscount, venueId: currentVenue, userRole } });
                            } else {
                                navigate('/activate', { state: { discount: displayDiscount, guestName: resolvedName, userRole } });
                            }
                        }}
                        className="w-[92%] max-w-[400px] h-[52px] text-black bg-white rounded-[18px] font-semibold text-[16px] active:scale-[0.97] transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                        {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                    </button>
                </div>
            )}


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
                                        { label: 'Current State', value: lastVisitDebug.daysAgoStr },
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
            {/* ── WALLET HISTORY MODAL ── */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end justify-center"
                    >
                        <div className="absolute inset-0" onClick={() => setIsHistoryOpen(false)} />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-[#1C1C1E] w-full max-w-md rounded-t-[36px] border-t border-white/10 p-6 relative z-10 flex flex-col max-h-[85vh] overflow-hidden text-white"
                        >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 flex-shrink-0" />
                            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <FontAwesomeIcon icon={faChartPie} className="text-emerald-400" />
                                    Wallet History & Stats
                                </h3>
                                <button 
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/50 active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            {(() => {
                                const totalDeposited = transactions
                                    .filter(t => t.transactionType === 'CREDIT' || t.type === 'CREDIT')
                                    .reduce((acc, t) => acc + Number(t.finalAmount ?? t.totalCredit ?? t.amount ?? 0), 0);
                                const totalSaved = transactions
                                    .filter(t => t.transactionType === 'DEBIT' || t.type === 'DEBIT')
                                    .reduce((acc, t) => acc + Number(t.discountAmountSaved ?? t.savedAmount ?? 0), 0);

                                return (
                                    <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Total Deposited</span>
                                            <span className="text-lg font-black text-white">{totalDeposited.toLocaleString()} {venueCurrency}</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Total Saved</span>
                                            <span className="text-lg font-black text-emerald-400">{totalSaved.toLocaleString()} {venueCurrency}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3 flex-shrink-0">Transaction List</div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                {transactions.length === 0 ? (
                                    <div className="text-center text-xs text-white/30 py-8 font-medium">No transactions yet</div>
                                ) : (
                                    transactions.map((tx) => {
                                        const isCredit = tx.transactionType === 'CREDIT' || tx.type === 'CREDIT';
                                        const txAmount = Number(tx.finalAmount ?? tx.totalCredit ?? tx.amount ?? 0);
                                        const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : (tx.createdAt ? new Date(tx.createdAt) : new Date());
                                        const dateStr = date.toLocaleString('ru-RU');

                                        return (
                                            <div key={tx.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        <FontAwesomeIcon icon={isCredit ? faArrowUp : faArrowDown} className="text-xs" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-white">{isCredit ? 'Credit (Top Up)' : 'Debit (Deduction)'}</span>
                                                        <span className="text-[9px] text-white/30 font-medium mt-0.5">{dateStr}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isCredit ? '+' : '-'}{txAmount.toLocaleString()}
                                                    </span>
                                                    {!isCredit && tx.discountAmountSaved > 0 && (
                                                        <span className="text-[9px] text-emerald-400 font-bold mt-0.5">Saved {Number(tx.discountAmountSaved).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── GOOGLE REVIEW SUCCESS MODAL ── */}
            <AnimatePresence>
                {showReviewSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6"
                        onClick={() => setShowReviewSuccessModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-[#1C1C1E] border border-[#4285F4]/40 rounded-[32px] p-6 shadow-2xl relative overflow-hidden text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[40%] rounded-full blur-[50px] opacity-20 bg-[#4285F4]" />
                            
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-3xl bg-[#4285F4]/20 border border-[#4285F4]/40 flex items-center justify-center text-[#4285F4] text-2xl mb-4 shadow-xl">
                                    <FontAwesomeIcon icon={faStar} className="animate-bounce" />
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-white mb-2 leading-tight">
                                    {i18n.language?.startsWith('ru') ? '🎉 СКИДКА НА 7 ДНЕЙ!' : '🎉 7-DAY DISCOUNT ACTIVATED!'}
                                </h3>
                                <p className="text-xs text-white/80 leading-relaxed mb-6">
                                    {i18n.language?.startsWith('ru') 
                                        ? `Спасибо за отзыв на Google Картах! Вам зафиксирована максимальная регулярная скидка ${maxDiscount}% на 7 дней.`
                                        : `Thank you for your Google Maps review! Your maximum regular discount of ${maxDiscount}% has been locked for 7 days.`}
                                </p>
                                <button
                                    onClick={() => setShowReviewSuccessModal(false)}
                                    className="w-full py-4 bg-[#4285F4] text-white font-extrabold rounded-[18px] text-xs uppercase tracking-wider active:scale-[0.98] transition-transform shadow-[0_0_25px_rgba(66,133,244,0.4)]"
                                >
                                    {i18n.language?.startsWith('ru') ? 'Отлично!' : 'Awesome!'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TestQRPage;
