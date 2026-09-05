import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faExclamationTriangle, faStar, faClock, faUser, faWallet, faChartPie, faTimes, faArrowUp, faArrowDown, faWifi, faChevronRight, faReceipt, faBolt } from '@fortawesome/free-solid-svg-icons';
import UserMenu from './UserMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth, functions } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { RewardCalculator } from './logic/RewardCalculator';
import PngBattery, { getBatteryConfig } from './PngBattery';
import LoadingBatteryScreen from './LoadingBatteryScreen';
import RevooStories from './RevooStories';
import { convertToGoogleReviewUrl } from './logic/googleMaps';
import giftxBox3D from './assets/giftx-box-3d.png';

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
    const prevBalRef = useRef(null);

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
            const searchParams = new URLSearchParams(window.location.search);
            const depParam = searchParams.get('deposit');
            if (depParam === 'true' || depParam === '1' || Number(depParam) > 0) {
                return Number(depParam) > 1 ? Number(depParam) : 5000000;
            }
            const guestEmail = safeStorage.getItem('guestEmail');
            if (!guestEmail) return 0;
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
    }, [status]);

    const searchParams = new URLSearchParams(location.search);
    const utmSource = searchParams.get('utm_source');
    const isGoogleMaps = utmSource === 'google_maps';

    useEffect(() => {
        const rawId = searchParams.get('id') || searchParams.get('v') || searchParams.get('venueId') || searchParams.get('venue_id') || 'default_venue';
        const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
        
        safeStorage.setItem('currentVenueId', venueId);
        setActiveVenueId(venueId);

        const cachedVenueRaw = safeStorage.getItem(`venue_cache_${venueId}`);
        const cachedName = safeStorage.getItem('guestName');
        if (cachedName) setGuestName(cachedName);

        if (cachedVenueRaw) {
            try {
                const cachedVenue = JSON.parse(cachedVenueRaw);
                const nameToSet = cachedVenue.id === 'default_venue' ? 'Unknown' : (cachedVenue.name || 'Unknown');
                setVenueName(nameToSet);
                if (cachedVenue.loyaltyConfig) setLoyaltyConfig(cachedVenue.loyaltyConfig);
                setVenueData(cachedVenue);
            } catch (e) {}
        }

        const safetyTimeoutId = setTimeout(() => {
            if (!isDataReadyRef.current) {
                console.warn("Safety timeout: forcing data-ready state");
                setIsDataReady(true);
                setStatus('first');
            }
        }, 3000);

        let unsubscribeUser = null;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try { await signInAnonymously(auth); } catch (e) {
                    console.error("Anonymous sign-in failed:", e);
                    if (statusRef.current === 'loading') setStatus('first');
                }
                return;
            }

            const checkUserAndVenue = async () => {
                try {
                    let venueData = null;
                    let userData = null;

                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    userData = userSnap.exists() ? userSnap.data() : null;

                    let targetVenueId = venueId;
                    if ((!targetVenueId || targetVenueId === 'default_venue' || targetVenueId === 'demo') && userData?.deposit_venue_id) {
                        targetVenueId = userData.deposit_venue_id;
                    }

                    if (targetVenueId && targetVenueId !== 'demo') {
                        const venueRef = doc(db, 'venues', targetVenueId);
                        const venueSnap = await getDoc(venueRef);
                        if (venueSnap.exists()) {
                            venueData = venueSnap.data();
                        } else {
                            const qSlug = query(collection(db, 'venues'), where('slug', '==', targetVenueId));
                            const qSlugSnap = await getDocs(qSlug);
                            if (!qSlugSnap.empty) {
                                venueData = qSlugSnap.docs[0].data();
                            } else if (userData?.deposit_venue_id) {
                                const depVenueSnap = await getDoc(doc(db, 'venues', userData.deposit_venue_id));
                                if (depVenueSnap.exists()) {
                                    venueData = depVenueSnap.data();
                                }
                            }
                        }
                    }

                    if (!venueData && (targetVenueId === 'demo' || !targetVenueId)) {
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
                    }

                    if (!venueData) { 
                        if (statusRef.current === 'loading') setStatus('first');
                        return; 
                    }

                    const nameToSet = activeVenueId === 'default_venue' ? 'Unknown' : (venueData.name || 'Unknown');
                    setVenueName(nameToSet);
                    if (venueData.name) safeStorage.setItem('currentVenueName', venueData.name);
                    safeStorage.setItem(`venue_cache_${venueId}`, JSON.stringify(venueData));
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

                    setVenueCurrency(venueData.currency || 'VND');

                    const qTiers = query(
                        collection(db, 'deposit_tiers'), 
                        where('venueId', '==', venueId)
                    );
                    getDocs(qTiers).then(tiersSnap => {
                        const fetchedTiers = tiersSnap.docs.map(doc => doc.data());
                        setDepositTiers(fetchedTiers);
                    }).catch(err => console.error("Error fetching deposit tiers:", err));

                    let isFirstDepositSnapshot = true;
                    const targetUid = user.uid;
                    const listenUid = targetUid;
                    unsubscribeUser = onSnapshot(doc(db, 'users', listenUid), (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setUserProfile(data);

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


                            prevBalRef.current = balance;

                            setDepositBalance(balance);
                            safeStorage.setItem('cached_deposit_balance', String(balance));
                            setCurrentDiscountTier(Number(data.current_discount_tier ?? 4));

                            if (isFirstDepositSnapshot) {
                                isFirstDepositSnapshot = false;
                                depositReadyRef.current = true;
                                if (discountReadyRef.current && !isDataReadyRef.current) {
                                    isDataReadyRef.current = true;
                                    setIsDataReady(true);
                                    setStatus('first');
                                }
                            }

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
                            setDepositBalance(0);
                            safeStorage.removeItem('cached_deposit_balance');
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

                    let visitDocs = [];
                    try {
                        const uidsToTry = [user?.uid, targetUid].filter(Boolean);
                        for (const currentUid of uidsToTry) {
                            if (visitDocs.length > 0) break;
                            const qUidVisits = query(collection(db, 'visits'), where('uid', '==', currentUid), where('venueId', '==', venueId));
                            const querySnapUid = await getDocs(qUidVisits);
                            if (!querySnapUid.empty) {
                                visitDocs = querySnapUid.docs;
                            }
                        }
                        if (visitDocs.length === 0 && email) {
                            const qEmailVisits = query(collection(db, 'visits'), where('guestEmail', '==', email), where('venueId', '==', venueId));
                            const querySnapEmail = await getDocs(qEmailVisits);
                            if (!querySnapEmail.empty) {
                                visitDocs = querySnapEmail.docs;
                            }
                        }
                        if (visitDocs.length > 0) {
                            visitDocs.sort((a, b) => {
                                const tA = a.data().timestamp?.seconds || (a.data().timestamp?.toDate ? Math.floor(a.data().timestamp.toDate().getTime() / 1000) : 0);
                                const tB = b.data().timestamp?.seconds || (b.data().timestamp?.toDate ? Math.floor(b.data().timestamp.toDate().getTime() / 1000) : 0);
                                return tB - tA;
                            });
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

                        result = RewardCalculator.calculate(lastVisitDateStr, now, venueData.loyaltyConfig, tz, isDayActive, userProfile?.hasLockedDiscount || false, venueData.baseDiscount || 5);
                        calculatedDiscount = result.discount;

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

                        const debugDays = uniqueDays.map(d => d.dateStr);
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
                        result = RewardCalculator.calculate(null, now, venueData.loyaltyConfig, tz, false, userProfile?.hasLockedDiscount || false, venueData.baseDiscount || 5);
                        calculatedDiscount = result.discount;
                        debugInfo.diffDays = result.diffDays ?? 'N/A';
                    }

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
                    discountReadyRef.current = true;
                    if (depositReadyRef.current && !isDataReadyRef.current) {
                        isDataReadyRef.current = true;
                        setIsDataReady(true);
                        setStatus('first');
                    }
                } catch (e) {
                    console.error("Error in checkUserAndVenue:", e);
                    setLastVisitDebug({ error: e.message || String(e) });
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

    const [showSmartReviewModal, setShowSmartReviewModal] = useState(false);
    const [npsStep, setNpsStep] = useState('stars');
    const [starRating, setStarRating] = useState(0);
    const [hoverStar, setHoverStar] = useState(0);
    const [complaintText, setComplaintText] = useState('');
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

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
            const currentVenueId = activeVenueId || safeStorage.getItem('currentVenueId') || 'unknown';
            await addDoc(collection(db, 'complaints'), {
                venueId: currentVenueId,
                guestName: guestName || 'Guest',
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

    const handleWriteGoogleReview = (url) => {
        if (!url) return;
        setShowSmartReviewModal(false);
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
        const effectiveUid = safeStorage.getItem('effectiveUid') || userProfile?.id;
        const email = (userProfile?.email || safeStorage.getItem('guestEmail') || '').toLowerCase();
        if (!uid && !effectiveUid && !email) return;

        const targetId = effectiveUid || uid || email;

        let qTx;
        if (email) {
            qTx = query(collection(db, 'deposit_transactions'), where('guestEmail', '==', email));
        } else {
            qTx = query(collection(db, 'deposit_transactions'), where('userId', '==', targetId));
        }

        let isInitialTxLoad = true;

        const unsubTx = onSnapshot(qTx, (snap) => {
            let txList = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const currentVenue = activeVenueId || safeStorage.getItem('currentVenueId') || venueId || 'demo';
            txList = txList.filter(tx => !tx.venueId || tx.venueId === currentVenue || currentVenue === 'demo');

            txList.sort((a, b) => {
                const tA = a.createdAt?.seconds || (a.createdAt?.toDate ? Math.floor(a.createdAt.toDate().getTime() / 1000) : 0);
                const tB = b.createdAt?.seconds || (b.createdAt?.toDate ? Math.floor(b.createdAt.toDate().getTime() / 1000) : 0);
                return tB - tA;
            });
            setTransactions(txList);

            // Lazy retrofit for missing timestamps
            txList.forEach(tx => {
                if (!tx.createdAt && !tx.timestamp) {
                    const defaultDate = new Date();
                    defaultDate.setHours(12, 0, 0, 0);
                    updateDoc(doc(db, 'deposit_transactions', tx.id), {
                        createdAt: defaultDate,
                        timestamp: defaultDate
                    }).catch(console.warn);
                } else if (!tx.createdAt) {
                    updateDoc(doc(db, 'deposit_transactions', tx.id), {
                        createdAt: tx.timestamp
                    }).catch(console.warn);
                } else if (!tx.timestamp) {
                    updateDoc(doc(db, 'deposit_transactions', tx.id), {
                        timestamp: tx.createdAt
                    }).catch(console.warn);
                }
            });

            if (txList.length > 0) {
                const latestTx = txList[0];
                const rawBal = latestTx.newBalance ?? latestTx.balanceAfter;
                if (rawBal !== undefined && rawBal !== null) {
                    const latestBal = Number(rawBal);
                    if (!isNaN(latestBal)) {
                        if (!isInitialTxLoad || prevBalRef.current === null) {
                            prevBalRef.current = latestBal;
                            setDepositBalance(latestBal);
                            safeStorage.setItem('cached_deposit_balance', String(latestBal));
                        }
                    }
                }
            }
            
            isInitialTxLoad = false;
        }, (err) => {
            console.error("Error loading transactions:", err);
        });

        return () => unsubTx();
    }, [auth.currentUser?.uid, userProfile?.email, depositBalance]);

    const handleStoriesComplete = useCallback(() => {
        setStoriesCompleted(true);
        safeStorage.setItem('onboardingCompleted', 'true');
    }, []);

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

    if (status === 'loading') {
        return <LoadingBatteryScreen />;
    }

    // using searchParams declared at component top
    const hasDepositQuery = searchParams.get('deposit') === 'true' || searchParams.get('deposit') === '1' || Number(searchParams.get('deposit')) > 0;
    const isUserLoggedIn = Boolean((auth.currentUser && !auth.currentUser.isAnonymous && (auth.currentUser.email || userProfile?.email || safeStorage.getItem('guestEmail'))) || hasDepositQuery);
    const hasGoogleReviewConfigured = Boolean(venueData?.googleReviewLink || venueData?.googleMapsUrl);
    const hasCompletedReview = userProfile?.googleReviews?.[activeVenueId] === 'completed' || safeStorage.getItem('googleReviewClaimed') === 'true' || safeStorage.getItem(`googleReviewClaimed_${activeVenueId}`) === 'true';
    
    const isDepositActive = ((isUserLoggedIn && depositBalance > 0) || hasDepositQuery) && (!hasGoogleReviewConfigured || hasCompletedReview);

    if (isDataReady && !storiesCompleted && !isDepositActive) {
        return <RevooStories onComplete={handleStoriesComplete} />;
    }

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

        if (val <= minVal) return 10;
        if (val >= maxVal) return 100;

        const index = sortedTiers.indexOf(val);
        if (index !== -1) {
            const ratio = index / (sortedTiers.length - 1);
            if (ratio <= 0.34) return 25;
            if (ratio <= 0.67) return 50;
            return 100;
        }

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

    const displayDiscount = isDepositActive 
        ? (activeTier?.discountPercentage || discount) 
        : (isReviewDiscountActive ? maxDiscount : discount);

    const currentDiscount = displayDiscount;
    const mappedCapacity = getMappedCapacity(displayDiscount, loyaltyConfig);

    let depositCapacity = 100;
    if (isDepositActive) {
        let maxThreshold = 1000000;
        if (depositTiers && depositTiers.length > 0) {
            const maxFromTiers = Math.max(...depositTiers.map(t => Number(t.minBalanceThreshold || t.threshold || 0)).filter(p => p > 0));
            if (maxFromTiers > 0) maxThreshold = maxFromTiers;
        } else if (venueData?.depositConfig?.maxThreshold) {
            maxThreshold = Number(venueData.depositConfig.maxThreshold);
        }
        
        const ratio = depositBalance / maxThreshold;
        if (ratio >= 0.75) {
            depositCapacity = 100;
        } else if (ratio >= 0.40) {
            depositCapacity = 50;
        } else if (ratio >= 0.20) {
            depositCapacity = 25;
        } else {
            depositCapacity = 10;
        }
    }

    const currentCapacity = isDepositActive ? depositCapacity : mappedCapacity;
    const batCfg = getBatteryConfig(currentCapacity);

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
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: batCfg.fillColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: batCfg.fillColor }} />

            <div 
                className="flex justify-between items-start w-full px-4 pt-4 pb-2 relative z-50 min-h-[90px]"
                style={{
                    paddingTop: 'max(env(safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), 16px)'
                }}
            >
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-start z-20">
                    {isUserLoggedIn ? (
                        <UserMenu 
                            user={auth.currentUser}
                            isGuestView={true}
                            venueColor={batCfg.fillColor}
                            trigger={
                                <div className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-lg text-white/80 hover:text-white">
                                    <FontAwesomeIcon icon={faUser} className="text-sm" />
                                </div>
                            }
                        />
                    ) : (
                        <div 
                            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-xl border border-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-lg text-white/80 hover:text-white"
                            onClick={() => {
                                const targetRoute = isGoogleMaps ? '/google-activate' : '/activate';
                                navigate(targetRoute, { state: { returnTo: 'profile', fromProfile: true, discount, guestName, userRole, venueId: activeVenueId, fromGoogleMaps: isGoogleMaps } })
                            }}
                        >
                            <FontAwesomeIcon icon={faUser} className="text-sm" />
                        </div>
                    )}
                </div>

                <div 
                    className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-110px)] flex flex-col items-center text-center cursor-pointer select-none active:opacity-75 transition-opacity z-10 pt-1"
                    onClick={() => setDebugClicks(c => c + 1)}
                >
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.1em] mb-1.5 whitespace-nowrap">
                        {t('glad_to_see_you_in', 'РАДЫ ВИДЕТЬ ВАС В')}
                    </span>
                    <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-white leading-[1.1] line-clamp-2 max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {venueName || "REVOO VENUE"}
                    </h1>
                </div>

                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-end z-20">
                    <LanguageSwitcher />
                </div>
            </div>

            <div className="flex flex-col items-center justify-start mt-1 px-6 pb-[140px] w-full max-w-md mx-auto z-10 gap-2.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>

                {/* Fixed height spacer for guest name to prevent layout shift */}
                <div className="h-[24px] flex flex-col items-center -mt-1 mb-1 justify-center w-full">
                    {guestName && (
                        <div 
                            className="text-center flex flex-col items-center cursor-pointer select-none"
                            onClick={() => setDebugClicks(c => c + 1)}
                        >
                            <div className="text-sm font-semibold tracking-tight text-white/80 flex items-center gap-1.5">
                                <span>{t('hero_welcome_back', 'Welcome Back!')}</span>
                                <span className="text-amber-400 font-extrabold truncate max-w-[200px]">{guestName}</span>
                            </div>
                        </div>
                    )}
                </div>

                {isDepositActive ? (
                    <div className="flex flex-col items-center w-full bg-[#1C1C1E]/80 backdrop-blur-[40px] border border-[#D4AF37]/40 rounded-[28px] p-5 shadow-2xl relative overflow-hidden flex-shrink-0 text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center gap-2 mb-1">
                            <FontAwesomeIcon icon={faWallet} className="text-[#D4AF37] text-sm" />
                            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">{t('deposit_balance_title', 'Your Deposit Balance')}</span>
                        </div>

                        <div className="text-4xl font-black text-white tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                            {depositBalance.toLocaleString()} <span className="text-sm font-medium text-white/50">{venueCurrency}</span>
                        </div>

                        <div className="bg-white p-3 rounded-2xl shadow-xl mb-3 border border-white/20">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                                    `https://bot-lab-21910.web.app/admin/deposit?search=${auth.currentUser?.uid || userProfile?.id || userProfile?.email || auth.currentUser?.email || safeStorage.getItem('effectiveUid') || safeStorage.getItem('guestEmail') || guestName || ''}&action=deduct`
                                )}`}
                                alt="Personal Deposit QR"
                                className="w-[160px] h-[160px] block mx-auto"
                            />
                        </div>
                        
                        <p className="text-[11px] font-bold text-white/70 tracking-wide uppercase">
                            {t('show_qr_instruction', 'Show this QR code to staff to deduct your bill')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] border border-white/10 rounded-[28px] p-4 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 border border-white/5 rounded-[28px] pointer-events-none mix-blend-overlay"></div>

                        <p className="text-[28px] sm:text-[32px] font-black tracking-tight text-white uppercase mb-3 mt-6 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] text-center leading-tight">
                            ВАША СКИДКА СЕГОДНЯ
                        </p>

                        <div 
                            className="h-[60px] overflow-hidden relative w-[180px] flex items-center justify-center mb-6"
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


                        <div className="w-full relative z-10 pointer-events-none">
                            <PngBattery capacity={currentCapacity} />
                        </div>

                        {(() => {
                            let sortedTiers = [3, 5, 7];
                            if (loyaltyConfig) {
                                if (Array.isArray(loyaltyConfig)) {
                                    const percs = loyaltyConfig.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
                                    if (percs.length > 0) sortedTiers = [...new Set(percs)].sort((a, b) => a - b);
                                } else {
                                    const percs = [
                                        Number(loyaltyConfig.percBase),
                                        Number(loyaltyConfig.percDecay2),
                                        Number(loyaltyConfig.percDecay1),
                                        Number(loyaltyConfig.percMedium),
                                        Number(loyaltyConfig.percVip),
                                        Number(loyaltyConfig.decayStages?.[0]?.discount)
                                    ].filter(p => !isNaN(p) && p > 0);
                                    if (percs.length > 0) sortedTiers = [...new Set(percs)].sort((a, b) => a - b);
                                }
                            }
                            const maxTier = Number(loyaltyConfig?.percVip) || sortedTiers[sortedTiers.length - 1] || 7;
                            const minTier = Number(loyaltyConfig?.percBase) || sortedTiers[0] || 3;
                            
                            let midTier = Number(loyaltyConfig?.decayStages?.[0]?.discount ?? loyaltyConfig?.percMedium ?? loyaltyConfig?.percDecay1 ?? loyaltyConfig?.percDecay2);
                            if (isNaN(midTier) || midTier <= 0) {
                                midTier = sortedTiers.length > 2 ? sortedTiers[Math.floor((sortedTiers.length - 1) / 2)] : (sortedTiers[1] || minTier);
                            }

                            const xDays = loyaltyConfig?.mediumDays || loyaltyConfig?.tier1DecayDays || (loyaltyConfig?.decayStages?.[0]?.days) || 7;

                            return (
                                <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col items-stretch text-left relative z-10 gap-3 mb-1">
                                    <p className="text-sm font-bold text-white text-center mb-1 drop-shadow-md">
                                        {t('the_more_you_visit_the_higher_discount', 'ЧЕМ ЧАЩЕ ПРИХОДИТЕ ТЕМ ВЫШЕ СКИДКА')}
                                    </p>
                                    
                                    <div className="flex items-center justify-between bg-black/40 p-4 rounded-[20px] border border-[#00FF41]/30 shadow-[0_0_15px_rgba(0,255,65,0.1)] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF41]/10 blur-xl rounded-full" />
                                        <div className="flex flex-col gap-1 z-10">
                                            <span className="text-[13px] font-black text-white/95 uppercase tracking-wider">ВАША СКИДКА ЗАВТРА</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-[24px] h-[10px] border border-[#00FF41]/50 rounded-[3px] p-[1px] flex items-center relative">
                                                    <div className="h-full bg-[#00FF41] rounded-[1px] w-full shadow-[0_0_5px_#00FF41]"></div>
                                                    <div className="absolute -right-[3px] w-[2px] h-[5px] bg-[#00FF41]/50 rounded-r-[1px]"></div>
                                                </div>
                                                <span className="text-[10px] font-extrabold text-[#00FF41] uppercase tracking-wider">МАКСИМУМ</span>
                                            </div>
                                        </div>
                                        <span className="text-[34px] font-black text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.4)] z-10 leading-none">{maxTier}%</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-black/20 p-3.5 rounded-[16px] border border-amber-400/20 shadow-inner px-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">ЧЕРЕЗ {xDays} ДНЕЙ</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-[18px] h-[8px] border border-amber-400/50 rounded-[2px] p-[1px] flex items-center relative">
                                                    <div className="h-full bg-amber-400 rounded-[1px] w-[60%] shadow-[0_0_5px_rgba(251,191,36,1)]"></div>
                                                    <div className="absolute -right-[3px] w-[2px] h-[4px] bg-amber-400/50 rounded-r-[1px]"></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">СРЕДНЯЯ</span>
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] leading-none">{midTier}%</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-black/20 p-3.5 rounded-[16px] border border-[#FF3131]/20 shadow-inner px-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">СКИДКА ВСЕГДА</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-[18px] h-[8px] border border-[#FF3131]/50 rounded-[2px] p-[1px] flex items-center relative">
                                                    <div className="h-full bg-[#FF3131] rounded-[1px] w-[20%] shadow-[0_0_5px_rgba(255,49,49,1)]"></div>
                                                    <div className="absolute -right-[3px] w-[2px] h-[4px] bg-[#FF3131]/50 rounded-r-[1px]"></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-[#FF3131]/80 uppercase tracking-wider">БАЗОВАЯ</span>
                                            </div>
                                        </div>
                                        <span className="text-xl font-black text-[#FF3131] drop-shadow-[0_0_8px_rgba(255,49,49,0.3)] leading-none">{minTier}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

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
                                     {t('vip_wifi_banner', '📶 VIP Wi-Fi is available at this venue')}
                                </span>
                                <span className="text-[10px] text-white/55 font-medium mt-0.5">
                                     {t('wifi_network_no_pass', { ssid: venueData.wifi_ssid || 'Revo_Free_WiFi', defaultValue: `Network: ${venueData.wifi_ssid || 'Revo_Free_WiFi'} | No password` })}
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
                                                {t('connect_vip_wifi', 'Connect to VIP Wi-Fi')}
                                            </h3>
                                            <p className="text-xs text-white/70 leading-relaxed mb-6">
                                                {t('wifi_instruction_popup', { ssid: venueData.wifi_ssid || 'Revo_Free_WiFi', defaultValue: `How to connect: Open your phone's Wi-Fi settings, select open network "${venueData.wifi_ssid || 'Revo_Free_WiFi'}", and access will authorize automatically.` })}
                                            </p>
                                            <button
                                                onClick={() => setShowWifiModal(false)}
                                                className="w-full py-3.5 bg-white text-black font-extrabold rounded-[18px] text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
                                            >
                                                {t('got_it', 'Got it')}
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}

                {isDepositActive && (
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

                        <button 
                            onClick={() => setIsHistoryOpen(true)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white/70 flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                        >
                            <FontAwesomeIcon icon={faChartPie} />
                            View Wallet History
                        </button>
                    </div>
                )}

                {isDepositActive && (() => {
                    const giftxUrl = venueData?.giftxUrl || 'https://giftx.app';
                    return (
                        <div className="w-full flex items-center justify-start my-2 pl-1 flex-shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => window.open(giftxUrl, '_blank', 'noopener,noreferrer')}
                                className="cursor-pointer flex items-center gap-2.5 bg-[#1C1C1E]/95 border-2 border-[#FF2A85]/60 rounded-2xl px-3.5 py-2 backdrop-blur-2xl shadow-[0_10px_25px_rgba(255,42,133,0.35)] h-[56px] select-none group hover:border-[#FF2A85] transition-all max-w-[220px]"
                                title="GiftX"
                            >
                                <div className="absolute top-0 left-0 w-24 h-24 bg-[#FF2A85]/15 rounded-full blur-xl pointer-events-none" />
                                
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
                        </div>
                    );
                })()}

            </div>

            {!isDepositActive && (
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

                            if (resolvedEmail) {
                                navigate('/thank-you', { 
                                    state: { 
                                        guestName: resolvedName || 'Guest', 
                                        guestEmail: resolvedEmail, 
                                        discountValue: displayDiscount, 
                                        venueId: currentVenue, 
                                        userRole 
                                    } 
                                });
                            } else {
                                const targetRoute = isGoogleMaps ? '/google-activate' : '/activate';
                                navigate(targetRoute, { 
                                    state: { 
                                        returnTo: 'thank-you',
                                        discountValue: displayDiscount,
                                        venueId: currentVenue,
                                        fromGoogleMaps: isGoogleMaps
                                    } 
                                });
                            }
                        }}
                        className="w-[92%] max-w-[400px] h-[52px] text-black bg-white rounded-[18px] font-semibold text-[16px] active:scale-[0.97] transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                        {(guestName || safeStorage.getItem('guestEmail')) ? t('get_my_reward', 'Get My Reward') : t('get_my_discount')}
                    </button>
                </div>
            )}

            {debugClicks >= 5 && (() => {
                const resolvedEmail = auth.currentUser?.email || userProfile?.email || safeStorage.getItem('guestEmail') || 'Гость (без почты)';
                const resolvedUid = auth.currentUser?.uid || safeStorage.getItem('effectiveUid') || 'Anonymous / Local';
                const resolvedName = guestName || auth.currentUser?.displayName || userProfile?.displayName || userProfile?.name || safeStorage.getItem('guestName') || 'Гость';
                const resolvedVenueId = activeVenueId || venueData?.id || 'demo';
                const resolvedVenueName = (activeVenueId === 'default_venue' || (!venueName && !venueData?.name)) ? 'Unknown' : (venueName || venueData?.name || 'Unknown');
                const resolvedRole = userRole || userProfile?.role || 'guest';
                const lastVisitText = lastVisitDebug?.lastVisitDisplay || lastVisitDebug?.daysAgoStr || (lastVisitDebug?.isDayActive ? 'Сегодня' : 'Никогда');
                const historyText = lastVisitDebug?.history || 'Нет данных';
                const diffDaysText = lastVisitDebug?.diffDays !== undefined ? String(lastVisitDebug.diffDays) : (lastVisitDebug?.isDayActive ? '0 (Активен)' : 'N/A');
                const timerText = liveSecondsLeft > 0 ? formatCountdown(liveSecondsLeft) : 'Не активен';
                const reviewBonusText = isReviewDiscountActive ? `Активен (${reviewDaysLeft}д ${reviewHoursLeft}ч)` : 'Не активен';
                const depositText = `${depositBalance.toLocaleString()} ${venueData?.currency || 'VND'}${isDepositActive ? ' (VIP зафиксирован)' : ''}`;

                return (
                    <div 
                        className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-2xl" 
                        onClick={() => setDebugClicks(0)}
                    >
                        <div 
                            className="bg-[#1C1C1E] w-full max-w-sm rounded-[32px] p-6 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400 text-base" />
                                    <span className="text-white font-black text-sm tracking-wide">Диагностика системы</span>
                                </div>
                                <button
                                    onClick={() => setDebugClicks(0)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {lastVisitDebug?.error && (
                                <div className="p-3 mb-3 bg-red-500/20 border border-red-500/40 rounded-2xl flex flex-col">
                                    <span className="text-[11px] font-bold text-red-400 mb-0.5">Ошибка загрузки</span>
                                    <span className="text-xs font-semibold text-white break-words">{lastVisitDebug.error}</span>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                {[
                                    { label: 'Гость / Имя', value: resolvedName, color: 'text-white' },
                                    { label: 'Email', value: resolvedEmail, color: 'text-amber-400' },
                                    { label: 'User UID', value: resolvedUid, color: 'text-white/60' },
                                    { label: 'Роль', value: resolvedRole, color: 'text-blue-400' },
                                    { label: 'Заведение', value: `${resolvedVenueName} (${resolvedVenueId})`, color: 'text-white' },
                                    { label: 'Текущая скидка', value: `${currentDiscount}% (Базовая: ${discount}%)`, color: 'text-[#00FF41]' },
                                    { label: 'Заряд батареи', value: `${mappedCapacity}% (${batCfg.statusKey})`, color: 'text-[#00FF41]' },
                                    { label: 'Баланс депозита', value: depositText, color: isDepositActive ? 'text-[#00FF41]' : 'text-white/70' },
                                    { label: 'Таймер сгорания', value: timerText, color: liveSecondsLeft > 0 ? 'text-[#FFD700]' : 'text-white/40' },
                                    { label: 'Бонус за отзыв', value: reviewBonusText, color: isReviewDiscountActive ? 'text-amber-400' : 'text-white/40' },
                                    { label: 'Последний визит', value: lastVisitText, color: 'text-white' },
                                    { label: 'DiffDays', value: diffDaysText, color: 'text-amber-400' },
                                    { label: 'История визитов', value: historyText, color: 'text-white/70' },
                                    { label: 'Часовой пояс', value: venueData?.timezone || 'Asia/Dubai', color: 'text-white/50' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0">
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{item.label}</span>
                                        <span className={`text-[12px] font-semibold break-all ${item.color || 'text-white/80'}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                <button
                                    onClick={() => {
                                        const diagText = JSON.stringify({
                                            name: resolvedName,
                                            email: resolvedEmail,
                                            uid: resolvedUid,
                                            venueId: resolvedVenueId,
                                            venueName: resolvedVenueName,
                                            discount: currentDiscount,
                                            deposit: depositBalance,
                                            isDepositActive,
                                            lastVisit: lastVisitText,
                                            history: historyText,
                                            timezone: venueData?.timezone || 'Asia/Dubai',
                                            timestamp: new Date().toISOString()
                                        }, null, 2);
                                        navigator.clipboard?.writeText(diagText);
                                        alert('Данные диагностики скопированы в буфер обмена!');
                                    }}
                                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                                >
                                    📋 Скопировать
                                </button>
                                <button
                                    onClick={() => setDebugClicks(0)}
                                    className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#c49f27] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
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
                                    .reduce((acc, t) => {
                                        const amt = Number(t.finalAmount ?? t.amount ?? 0);
                                        const savedVal = t.discountAmountSaved ?? t.savedAmount ?? (amt * (depositDiscount / 100));
                                        return acc + Number(savedVal || 0);
                                    }, 0);

                                return (
                                    <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Пополнено всего</span>
                                            <span className="text-lg font-black text-white">{totalDeposited.toLocaleString()} {venueCurrency}</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Сэкономлено</span>
                                            <span className="text-lg font-black text-emerald-400">{Math.round(totalSaved).toLocaleString()} {venueCurrency}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3 flex-shrink-0">История транзакций</div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                {transactions.length === 0 ? (
                                    <div className="text-center text-xs text-white/30 py-8 font-medium">Нет транзакций</div>
                                ) : (
                                    transactions.map((tx) => {
                                        const isCredit = tx.transactionType === 'CREDIT' || tx.type === 'CREDIT';
                                        const txAmount = Number(tx.finalAmount ?? tx.totalCredit ?? tx.amount ?? 0);
                                        const savedForTx = isCredit ? 0 : Number(tx.discountAmountSaved ?? tx.savedAmount ?? (txAmount * (depositDiscount / 100)));
                                        const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : (tx.createdAt ? new Date(tx.createdAt) : new Date());
                                        const dateStr = date.toLocaleString('ru-RU');

                                        return (
                                            <div key={tx.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        <FontAwesomeIcon icon={isCredit ? faArrowUp : faArrowDown} className="text-xs" />
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-xs font-bold text-white">{isCredit ? 'Пополнение' : 'Списание по чеку'}</span>
                                                        <span className="text-[9px] text-white/30 font-medium mt-0.5">{dateStr}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isCredit ? '+' : '-'}{txAmount.toLocaleString()}
                                                    </span>
                                                    {!isCredit && savedForTx > 0 && (
                                                        <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                                                            Сэкономлено: {Math.round(savedForTx).toLocaleString()} {venueCurrency}
                                                        </span>
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

            <AnimatePresence>
                {showSmartReviewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <div className="absolute inset-0" onClick={() => setShowSmartReviewModal(false)} />
                        
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden w-full max-w-sm z-10"
                        >
                            <button
                                onClick={() => setShowSmartReviewModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-xs transition-colors"
                            >
                                ✕
                            </button>

                            {npsStep === 'stars' && (
                                <>
                                    <h3 className="text-xl font-black text-white mb-2 leading-tight mt-2">
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
                                    <h3 className="text-lg font-black text-white mb-2 mt-2">Что пошло не так?</h3>
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
                                    <h3 className="text-lg font-black text-white mb-2 mt-2">Спасибо!</h3>
                                    <p className="text-sm text-white/70 mb-6">Мы обязательно исправим эту ситуацию.</p>
                                    <button onClick={() => setShowSmartReviewModal(false)} className="w-full py-3 rounded-xl bg-[#00FF41] text-black font-bold uppercase text-xs">Закрыть</button>
                                </>
                            )}
                            {npsStep === 'google_offer' && (
                                <>
                                    <h3 className="text-xl font-black text-white mb-2 leading-tight mt-2">
                                        Спасибо за высокую оценку!
                                    </h3>
                                    <p className="text-sm font-medium text-white/80 mb-6 leading-relaxed">
                                        Оставьте отзыв на Google Maps, чтобы получить максимальную скидку прямо сейчас!
                                    </p>
                                    <button
                                        onClick={() => handleWriteGoogleReview(venueData?.googleReviewLink || venueData?.googleMapsUrl)}
                                        className="w-full py-3.5 rounded-xl bg-[#00FF41] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,65,0.3)] transition-all active:scale-95"
                                    >
                                        ПЕРЕЙТИ НА GOOGLE MAPS
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    {t('discount_7_days_activated', '🎉 7-DAY DISCOUNT ACTIVATED!')}
                                </h3>
                                <p className="text-xs text-white/80 leading-relaxed mb-6">
                                    {t('review_thanks_credited', { percent: maxDiscount, defaultValue: `Thank you for your review! You have received a maximum ${maxDiscount}% discount for the next 7 days.` })}
                                </p>
                                <button
                                    onClick={() => setShowReviewSuccessModal(false)}
                                    className="w-full py-4 bg-[#4285F4] text-white font-extrabold rounded-[18px] text-xs uppercase tracking-wider active:scale-[0.98] transition-transform shadow-[0_0_25px_rgba(66,133,244,0.4)]"
                                >
                                    {t('awesome', 'Awesome!')}
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
