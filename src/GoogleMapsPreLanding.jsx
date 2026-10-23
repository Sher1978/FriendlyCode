import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth, googleProvider } from './firebase';
import { doc, getDoc, query, collection, where, getDocs, setDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut 
} from 'firebase/auth';
import { findAndMergeUserByEmail } from './logic/userDeduplication';
import { logVenueClick } from './logic/analytics';
import { RewardCalculator } from './logic/RewardCalculator';
import { ServiceStorefront } from './modules/services';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faTelegram, faWhatsapp, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faMapLocationDot, faEnvelope, faPaperPlane, faPhone, faArrowLeft, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Helpers for balance & currency
const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch (e) {} }
};

const parseBalance = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'object') {
    const inner = val.balance ?? val.amount ?? val.value ?? 0;
    const num = Number(inner);
    return isNaN(num) ? 0 : num;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const formatPrice = (amount, currency = 'VND') => {
  const num = Math.round(Number(amount) || 0);
  if (currency === 'VND') {
    return `${num.toLocaleString('vi-VN')} ₫`;
  } else if (currency === 'AED') {
    return `${num.toLocaleString()} AED`;
  } else if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return `${num.toLocaleString()} ${currency}`;
};

// Evaluate Active Happy Hour for Delivery
function checkActiveHappyHour(happyHours = [], timezone = 'Asia/Ho_Chi_Minh') {
  if (!Array.isArray(happyHours) || happyHours.length === 0) return null;
  try {
    const now = new Date();
    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(now);
    const dayMap = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
    const currentDay = dayMap[dayName] || 1;

    const parts = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone, 
      hour: 'numeric', 
      minute: 'numeric', 
      hour12: false 
    }).formatToParts(now);

    const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
    const currentDecimalHour = hour + minute / 60;

    for (const rule of happyHours) {
      if (rule.isActive === false) continue;
      const days = rule.daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(currentDay)) continue;

      const startRaw = rule.startHour || rule.startTime || '00:00';
      const endRaw = rule.endHour || rule.endTime || '23:59';
      const [startH, startM] = startRaw.split(':').map(Number);
      const [endH, endM] = endRaw.split(':').map(Number);
      const startDec = (startH || 0) + (startM || 0) / 60;
      const endDec = (endH || 24) + (endM || 0) / 60;

      if (currentDecimalHour >= startDec && currentDecimalHour <= endDec) {
        return {
          ...rule,
          name: rule.name || rule.title || 'Happy Hours',
          startHour: startRaw,
          endHour: endRaw,
          discountBonus: Number(rule.discountBonus ?? rule.discountPercent ?? 0)
        };
      }
    }
  } catch (e) {
    console.warn("Happy hour check warning:", e);
  }
  return null;
}

const GoogleMapsPreLanding = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const rawId = searchParams.get('id') || searchParams.get('v') || 'demo';
  const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication & Guest State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [guestName, setGuestName] = useState(() => safeStorage.getItem('guestName') || '');
  const [guestPhone, setGuestPhone] = useState(() => safeStorage.getItem('guestPhone') || '');
  const [guestEmail, setGuestEmail] = useState(() => safeStorage.getItem('guestEmail') || '');
  const [guestTelegram, setGuestTelegram] = useState(() => safeStorage.getItem('guestTelegram') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [authTriggerReason, setAuthTriggerReason] = useState('manual');
  const [depositBalance, setDepositBalance] = useState(() => Number(safeStorage.getItem('cached_deposit_balance') || 0));
  const [selectedProductModalItem, setSelectedProductModalItem] = useState(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Multi-Provider Auth Sub-state
  const [authMethod, setAuthMethod] = useState('options'); // 'options' | 'telegram' | 'magic_link' | 'phone'
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [telegramInput, setTelegramInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Discount Calculation & Visit History State
  const [personalDiscount, setPersonalDiscount] = useState(5);
  const [activeHappyHour, setActiveHappyHour] = useState(null);
  const [userTierStatus, setUserTierStatus] = useState('new');
  const [userVisits, setUserVisits] = useState([]);
  const [isGrabBagScenario, setIsGrabBagScenario] = useState(false);

  // Menu, Filtering & Delivery Mode State
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState({}); // { [itemId]: { item, count } }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState('delivery'); // 'delivery' | 'pickup'
  const [deliveryAddress, setDeliveryAddress] = useState(() => safeStorage.getItem('deliveryAddress') || '');
  const [orderComment, setOrderComment] = useState('');
  const [useDeposit, setUseDeposit] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('vietqr');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // PDF & Photo Menu State
  const [activeViewTab, setActiveViewTab] = useState('delivery'); // 'delivery' | 'pdf'
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const modalContainerRef = useRef(null);

  const [pdfPages, setPdfPages] = useState([]);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfThumbUrl, setPdfThumbUrl] = useState(null);

  // Fetch Venue
  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const docRef = doc(db, 'venues', venueId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVenue({ id: docSnap.id, ...docSnap.data() });
        } else {
          const qSlug = query(collection(db, 'venues'), where('slug', '==', venueId));
          const qSlugSnap = await getDocs(qSlug);
          if (!qSlugSnap.empty) {
            setVenue({ id: qSlugSnap.docs[0].id, ...qSlugSnap.docs[0].data() });
          }
        }
      } catch (e) {
        console.error("Error fetching venue:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [venueId]);

  // Check Magic Link on Mount & Redirect Result
  useEffect(() => {
    const handleAuthRedirectAndLink = async () => {
      try {
        // 1. Check Magic Link
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = safeStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Пожалуйста, подтвердите ваш Email для завершения входа:');
          }
          if (email) {
            const res = await signInWithEmailLink(auth, email, window.location.href);
            if (res?.user) {
              const u = res.user;
              const displayName = u.displayName || email.split('@')[0];
              setGuestName(displayName);
              setGuestEmail(email);
              safeStorage.setItem('guestName', displayName);
              safeStorage.setItem('guestEmail', email);

              await findAndMergeUserByEmail(db, email, u.uid, {
                displayName,
                venueId
              });

              // Restore pending cart item
              const savedPending = safeStorage.getItem('pendingCartItem');
              if (savedPending) {
                try {
                  const item = JSON.parse(savedPending);
                  const id = item.id || item.name;
                  setCart(prev => ({ ...prev, [id]: { item, count: 1 } }));
                  safeStorage.removeItem('pendingCartItem');
                } catch (e) {}
              }

              // Clean address bar so email link token doesn't linger
              const cleanUrl = window.location.pathname + `?id=${venueId}&utm_source=google_maps`;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }
          return;
        }

        // 2. Check Google Redirect Result
        const redirectRes = await getRedirectResult(auth);
        if (redirectRes?.user) {
          const u = redirectRes.user;
          const displayName = u.displayName || u.email?.split('@')[0] || 'Google Guest';
          const email = u.email || '';

          setGuestName(displayName);
          safeStorage.setItem('guestName', displayName);
          if (email) {
            setGuestEmail(email);
            safeStorage.setItem('guestEmail', email);
          }

          await findAndMergeUserByEmail(db, email, u.uid, {
            displayName,
            venueId
          });

          const savedPending = safeStorage.getItem('pendingCartItem');
          if (savedPending) {
            try {
              const item = JSON.parse(savedPending);
              const id = item.id || item.name;
              setCart(prev => ({ ...prev, [id]: { item, count: 1 } }));
              safeStorage.removeItem('pendingCartItem');
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Auth redirect / email link check error:", err);
      }
    };

    handleAuthRedirectAndLink();
  }, [venueId]);

  // Auth State Listener & Deposit Snapshot (Ensures browser session UID for anonymous users too)
  useEffect(() => {
    let unsubUserDoc = null;
    RewardCalculator.getBrowserSessionUid();

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.isAnonymous) {
          RewardCalculator.saveAnonymousUid(currentUser.uid);
        }
        // Subscribe to user doc for live deposit balance & discount tier
        unsubUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile(data);
            const resolvedName = data.displayName || data.name || currentUser.displayName;
            if (resolvedName && !guestName) {
              setGuestName(resolvedName);
              safeStorage.setItem('guestName', resolvedName);
            }
            if (data.phone && !guestPhone) {
              setGuestPhone(data.phone);
              safeStorage.setItem('guestPhone', data.phone);
            }
            if (data.email && !guestEmail) {
              setGuestEmail(data.email);
              safeStorage.setItem('guestEmail', data.email);
            }
            if (data.telegram && !guestTelegram) {
              setGuestTelegram(data.telegram);
              safeStorage.setItem('guestTelegram', data.telegram);
            }

            // Extract deposit balance for this venue (matches TestQRPage logic)
            let bal = 0;
            if (data.deposit_balances && venueId && data.deposit_balances[venueId] !== undefined) {
              bal = parseBalance(data.deposit_balances[venueId]);
            } else if (data.deposits && venueId && data.deposits[venueId] !== undefined) {
              const val = data.deposits[venueId];
              bal = parseBalance(typeof val === 'object' ? (val.balance || 0) : val);
            } else if (data.deposit_balances && data.deposit_venue_id && data.deposit_balances[data.deposit_venue_id] !== undefined) {
              bal = parseBalance(data.deposit_balances[data.deposit_venue_id]);
            } else if (data.deposit_balance !== undefined && Number(data.deposit_balance) > 0) {
              bal = parseBalance(data.deposit_balance);
            } else if (data.deposit_venue_id && (data.deposit_venue_id === venueId || !venueId || venueId === 'demo')) {
              bal = parseBalance(data.deposit_balance || 0);
            } else if (data.deposit_balances && Object.keys(data.deposit_balances).length > 0) {
              const vals = Object.values(data.deposit_balances).map(Number).filter(v => !isNaN(v) && v > 0);
              bal = vals.length > 0 ? Math.max(...vals) : 0;
            } else {
              bal = parseBalance(data.deposit_balance || 0);
            }
            setDepositBalance(bal);
            safeStorage.setItem('cached_deposit_balance', String(bal));
          }
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setDepositBalance(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [venueId, guestName, guestPhone, guestEmail, guestTelegram]);

  // Effective Delivery Loyalty Configuration & Dynamic Discounts
  const deliveryLoyaltyConfig = venue?.deliveryLoyaltyConfig || {};
  const venueCurrency = venue?.currency || 'VND';
  const venueTimezone = venue?.timezone || 'Asia/Ho_Chi_Minh';

  // Evaluate Happy Hour
  useEffect(() => {
    const hh = checkActiveHappyHour(deliveryLoyaltyConfig?.happyHours, venueTimezone);
    setActiveHappyHour(hh);
    const interval = setInterval(() => {
      setActiveHappyHour(checkActiveHappyHour(deliveryLoyaltyConfig?.happyHours, venueTimezone));
    }, 60000);
    return () => clearInterval(interval);
  }, [deliveryLoyaltyConfig, venueTimezone]);

  // Live listener for completed order status updates (e.g. staff deposit deduction approval)
  useEffect(() => {
    if (!completedOrder?.id) return;
    const unsub = onSnapshot(doc(db, 'orders', completedOrder.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompletedOrder(prev => prev ? ({ ...prev, ...data }) : null);
      }
    }, (err) => console.warn("Live order subscription note:", err));
    return () => unsub();
  }, [completedOrder?.id]);

  // Calculate Effective User Identity
  const effectiveEmail = guestEmail || user?.email || userProfile?.email || '';
  const effectiveTelegram = guestTelegram || userProfile?.telegram || '';
  const effectiveDisplayName = 
    guestName || 
    user?.displayName || 
    userProfile?.displayName || 
    userProfile?.name || 
    (effectiveEmail ? effectiveEmail.split('@')[0] : '') || 
    effectiveTelegram || 
    'Гость';

  const effectiveContact = 
    guestPhone || 
    userProfile?.phone || 
    effectiveEmail || 
    effectiveTelegram || 
    '';

  const isUserIdentified = Boolean(
    (user || effectiveEmail || guestPhone || guestName || depositBalance > 0) && (
      guestName || 
      guestPhone || 
      effectiveEmail || 
      effectiveTelegram ||
      user?.displayName || 
      user?.email || 
      userProfile?.name || 
      userProfile?.displayName || 
      userProfile?.phone || 
      userProfile?.email ||
      userProfile?.telegram ||
      depositBalance > 0
    )
  );

  // Fetch Visit & Order History (Works for both Logged-in and Anonymous Browser Sessions)
  // Also handles Scenario 2 (Grab Bag QR Scan -> equated to today's order -> immediate Tier 3)
  useEffect(() => {
    if (!venueId) return;
    let isMounted = true;

    const loadVisitHistory = async () => {
      const todayStr = RewardCalculator.getVenueDateString(new Date(), venueTimezone);
      const isGrabBag = RewardCalculator.checkGrabBagScenario(venueId, todayStr, location.search);
      if (isMounted) setIsGrabBagScenario(isGrabBag);

      // If client scanned the Grab Bag QR code, equate it to an order today in Firestore visits (once per day)
      if (isGrabBag && venueId !== 'demo') {
        const grabLogKey = `grab_bag_logged_${venueId}_${todayStr}`;
        if (!safeStorage.getItem(grabLogKey)) {
          safeStorage.setItem(grabLogKey, 'true');
          const sessionUid = user?.uid || safeStorage.getItem('effectiveUid') || RewardCalculator.getBrowserSessionUid();
          addDoc(collection(db, 'visits'), {
            uid: sessionUid,
            userId: sessionUid,
            guestName: effectiveDisplayName || 'Grab Guest',
            guestEmail: (effectiveEmail || 'guest').toLowerCase(),
            venueId,
            discount: 20,
            timestamp: serverTimestamp(),
            status: 'vip',
            source: 'grab_bag_qr',
            isAggregatorBagScan: true,
            acquisition_source: 'grab_bag'
          }).catch(e => console.warn("Grab bag visit log note:", e));
        }
      }

      try {
        const candidateUids = Array.from(new Set([
          user?.uid,
          safeStorage.getItem('effectiveUid'),
          RewardCalculator.getAnonymousUid(),
          RewardCalculator.getBrowserSessionUid()
        ].filter(Boolean)));

        const queries = [];
        for (const cUid of candidateUids) {
          queries.push(getDocs(query(collection(db, 'visits'), where('venueId', '==', venueId), where('uid', '==', cUid))));
          queries.push(getDocs(query(collection(db, 'visits'), where('venueId', '==', venueId), where('userId', '==', cUid))));
        }
        if (effectiveEmail && effectiveEmail.includes('@')) {
          queries.push(getDocs(query(collection(db, 'visits'), where('venueId', '==', venueId), where('guestEmail', '==', effectiveEmail.toLowerCase()))));
        }

        const snaps = await Promise.all(queries);
        const docsMap = new Map();
        snaps.forEach(s => s.docs.forEach(d => docsMap.set(d.id, d.data())));
        if (isMounted) {
          setUserVisits(Array.from(docsMap.values()));
        }
      } catch (err) {
        console.warn("Visit history fetch note:", err);
      }
    };

    loadVisitHistory();
    return () => { isMounted = false; };
  }, [venueId, user?.uid, effectiveEmail, venueTimezone, location.search]);

  // Compute Active Loyalty Discount using RewardCalculator (Calendar Date + Deposit + Grab Bag Scenario 2)
  const activeLoyaltyConfig = useMemo(() => {
    if (!venue) return {};
    let cfg = venue.loyaltyConfig || venue.tiers || {};
    if (deliveryLoyaltyConfig.useCustomDeliveryTiers) {
      cfg = {
        percBase: Number(deliveryLoyaltyConfig.percBase ?? 5),
        percMedium: Number(deliveryLoyaltyConfig.percMedium ?? 15),
        percDecay1: Number(deliveryLoyaltyConfig.percMedium ?? 15),
        percVip: Number(deliveryLoyaltyConfig.percVip ?? 20),
        percDeposit: Number(deliveryLoyaltyConfig.percDeposit ?? 25),
        vipWindowDays: Number(deliveryLoyaltyConfig.vipWindowDays ?? 1),
        mediumDays: Number(deliveryLoyaltyConfig.mediumDays ?? 7),
        tier1DecayDays: Number(deliveryLoyaltyConfig.mediumDays ?? 7),
      };
    }
    return cfg;
  }, [venue, deliveryLoyaltyConfig]);

  const normalizedTiers = useMemo(() => {
    return RewardCalculator.normalizeConfig(activeLoyaltyConfig, Number(deliveryLoyaltyConfig.percBase || 5));
  }, [activeLoyaltyConfig, deliveryLoyaltyConfig.percBase]);

  const baseTierDiscount = normalizedTiers.percBase;
  const [hasVisitedToday, setHasVisitedToday] = useState(false);
  const todayStr = useMemo(() => RewardCalculator.getVenueDateString(new Date(), venueTimezone), [venueTimezone]);
  const browserSessionUid = useMemo(() => RewardCalculator.getBrowserSessionUid(), []);

  useEffect(() => {
    if (!venue) return;

    const now = new Date();
    const { isDayActive, lastVisitDateStr, isGrabBagActive } = RewardCalculator.resolveVisitHistory(
      userVisits,
      venueId,
      now,
      venueTimezone,
      location.search
    );

    setIsGrabBagScenario(isGrabBagActive);
    setHasVisitedToday(isDayActive);

    const calcResult = RewardCalculator.calculate(
      lastVisitDateStr,
      now,
      activeLoyaltyConfig,
      venueTimezone,
      isDayActive,
      false, // In online order flow, deposit does NOT override discount: regular tier strictly applies!
      baseTierDiscount,
      depositBalance,
      isGrabBagActive,
      true // isOnlineOrder = true
    );

    setPersonalDiscount(calcResult.discount);
    setUserTierStatus(calcResult.status);
  }, [venue, venueId, userVisits, activeLoyaltyConfig, baseTierDiscount, depositBalance, venueTimezone, location.search]);

  // Calculate Max Regular Discount (Tier 3) + Happy Hour Bonus
  const maxPossibleDiscount = useMemo(() => {
    let max = normalizedTiers.percVip || 20;
    if (activeHappyHour?.discountBonus) {
      max += Number(activeHappyHour.discountBonus);
    }
    return max;
  }, [normalizedTiers, activeHappyHour]);

  const happyHourBonus = activeHappyHour?.discountBonus ? Number(activeHappyHour.discountBonus) : 0;
  const rawPickupBonus = deliveryLoyaltyConfig?.pickupBonusPercent ?? deliveryLoyaltyConfig?.pickupBonusDiscount ?? 0;
  const pickupBonus = (deliveryType === 'pickup' && Number(rawPickupBonus) > 0) 
    ? Number(rawPickupBonus) 
    : 0;

  // In Scenario 2 (Grab Bag QR), even before login the customer sees their active Tier 3 discount;
  // Once identified (or in Scenario 2), currentDiscountRate applies personalDiscount + bonuses.
  const currentDiscountRate = isUserIdentified 
    ? (personalDiscount + happyHourBonus + pickupBonus)
    : (isGrabBagScenario ? (normalizedTiers.percVip + happyHourBonus + pickupBonus) : 0);


  // Raw gmConfig
  const gmConfig = venue?.gmConfig || {
    businessType: 'horeca',
    menuItems: [],
    menuPdfUrl: '',
    menuPhotos: [],
    services: []
  };

  const isHoreca = gmConfig.businessType === 'horeca';
  const menuItems = useMemo(() => {
    let items = (gmConfig.menuItems || venue?.menuItems || []).filter(
      item => item.isPublished !== false && item.isAvailable !== false && item.price !== '0' && item.name !== 'Новый пункт'
    );
    if (items.length === 0) {
      items = [
        {
          id: 'item_pho_bo',
          name: 'Фо Бо Особенный (Phở Bò Đặc Biệt)',
          category: 'Супы & Лапша',
          description: 'Насыщенный говяжий бульон 12-часовой варки, мраморная говядина, рисовая лапша и свежая зелень',
          price: '120000',
          aggregatorPrice: '155000',
          currency: venueCurrency,
          imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60',
          isPublished: true,
          isAvailable: true
        },
        {
          id: 'item_nem_ran',
          name: 'Немы с морепродуктами (Nem Rán)',
          category: 'Закуски',
          description: 'Хрустящие спринг-роллы с начинкой из креветок, кальмара, овощей и древесных грибов',
          price: '85000',
          aggregatorPrice: '110000',
          currency: venueCurrency,
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
          isPublished: true,
          isAvailable: true
        },
        {
          id: 'item_ca_phe',
          name: 'Вьетнамский яичный кофе (Cà Phê Trứng)',
          category: 'Напитки',
          description: 'Традиционный крепкий кофе робуста с густой взбитой яично-карамельной пенкой',
          price: '50000',
          aggregatorPrice: '65000',
          currency: venueCurrency,
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
          isPublished: true,
          isAvailable: true
        }
      ];
    }
    return items;
  }, [gmConfig.menuItems, venue?.menuItems, venueCurrency]);

  const categories = useMemo(() => {
    const set = new Set();
    menuItems.forEach(i => { if (i.category) set.add(i.category.trim()); });
    return ['all', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return menuItems;
    return menuItems.filter(i => (i.category || '').trim() === activeCategory);
  }, [menuItems, activeCategory]);

  // Cart operations
  const addToCart = (item) => {
    if (!isUserIdentified) {
      setPendingCartItem(item);
      setAuthTriggerReason('cart');
      setIsAuthModalOpen(true);
      return;
    }
    const id = item.id || item.name;
    setCart(prev => {
      const existing = prev[id];
      const count = (existing?.count || 0) + 1;
      return { ...prev, [id]: { item, count } };
    });
  };

  const removeFromCart = (item) => {
    const id = item.id || item.name;
    setCart(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.count <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { item, count: existing.count - 1 } };
    });
  };

  // Cart Totals & Savings vs Aggregators
  const { cartCount, cartSubtotal, cartSavingsVsAggregator, discountedSubtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let savings = 0;

    const rate = isUserIdentified ? currentDiscountRate : maxPossibleDiscount;

    Object.values(cart).forEach(({ item, count: qty }) => {
      const rawPrice = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
      const rawAggPrice = parseFloat(String(item.aggregatorPrice || 0).replace(/[^0-9.]/g, '')) || 0;
      
      count += qty;
      subtotal += rawPrice * qty;

      if (rawAggPrice > 0) {
        const discounted = Math.round(rawPrice * (1 - rate / 100));
        savings += (rawAggPrice - discounted) * qty;
      } else {
        const discounted = Math.round(rawPrice * (1 - rate / 100));
        savings += (rawPrice - discounted) * qty;
      }
    });

    const discountAmount = Math.round(subtotal * (currentDiscountRate / 100));
    const finalSub = subtotal - discountAmount;

    return {
      cartCount: count,
      cartSubtotal: subtotal,
      cartSavingsVsAggregator: Math.max(0, savings),
      discountedSubtotal: Math.max(0, finalSub)
    };
  }, [cart, currentDiscountRate, maxPossibleDiscount, isUserIdentified]);

  // Delivery Fee & Threshold
  const freeThreshold = Number(deliveryLoyaltyConfig?.freeDeliveryThreshold || 0);
  const baseDeliveryFee = deliveryType === 'pickup' ? 0 : 25000;
  const isFreeDelivery = freeThreshold > 0 && discountedSubtotal >= freeThreshold;
  const deliveryFee = isFreeDelivery || deliveryType === 'pickup' ? 0 : baseDeliveryFee;

  // Deposit usage
  const depositDeduction = useDeposit 
    ? Math.min(depositBalance, discountedSubtotal + deliveryFee) 
    : 0;
  const finalOrderTotal = Math.max(0, discountedSubtotal + deliveryFee - depositDeduction);

  const isRevoo = typeof window !== 'undefined' && (window.location.hostname.includes('revoo') || safeStorage.getItem('brandOverride') === 'revoo');
  const botName = isRevoo ? 'revoogiftx_bot' : 'FriendIycode_bot';

  // Helper: Post-Auth State Fulfillment
  const finalizeAuthSuccess = (name, email = '', phone = '', telegram = '') => {
    if (name) {
      setGuestName(name);
      safeStorage.setItem('guestName', name);
    }
    if (email) {
      setGuestEmail(email);
      safeStorage.setItem('guestEmail', email);
    }
    if (phone) {
      setGuestPhone(phone);
      safeStorage.setItem('guestPhone', phone);
    }
    if (telegram) {
      setGuestTelegram(telegram);
      safeStorage.setItem('guestTelegram', telegram);
    }

    // Auto-add pending cart item if user clicked dish before login
    if (pendingCartItem) {
      const id = pendingCartItem.id || pendingCartItem.name;
      setCart(prev => {
        const existing = prev[id];
        const count = (existing?.count || 0) + 1;
        return { ...prev, [id]: { item: pendingCartItem, count } };
      });
      setPendingCartItem(null);
      safeStorage.removeItem('pendingCartItem');
    }

    setIsAuthModalOpen(false);
    setAuthMethod('options');
    setAuthError('');
  };

  // 1. Google (Gmail) Sign-In
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      let result = null;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupError) {
        console.warn("signInWithPopup blocked or failed, checking redirect fallback:", popupError);
        if (popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
          setIsAuthLoading(false);
          return;
        }
        if (pendingCartItem) {
          safeStorage.setItem('pendingCartItem', JSON.stringify(pendingCartItem));
        }
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      if (result?.user) {
        const u = result.user;
        const displayName = u.displayName || u.email?.split('@')[0] || 'Google Guest';
        const email = u.email || '';

        try {
          await findAndMergeUserByEmail(db, email, u.uid, {
            displayName,
            venueId
          });
        } catch (mergeErr) {
          console.warn("findAndMergeUserByEmail warning:", mergeErr);
        }

        finalizeAuthSuccess(displayName, email);
      }
    } catch (err) {
      console.error("Google Auth error:", err);
      setAuthError(err.message || 'Ошибка входа через Google');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 2. Telegram Auth
  const handleTelegramClick = () => {
    setAuthError('');
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      handleTelegramWebAppAuth();
    } else {
      setAuthMethod('telegram');
    }
  };

  const handleTelegramWebAppAuth = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (!tgUser) return;
      const tgName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Telegram Guest';
      const tgHandle = tgUser.username ? `@${tgUser.username}` : '';
      const tgEmail = tgUser.username ? `${tgUser.username.toLowerCase()}@telegram.user` : `tg_${tgUser.id}@telegram.user`;

      let currentUid = user?.uid;
      if (!currentUid) {
        try {
          const anonRes = await signInAnonymously(auth);
          currentUid = anonRes.user.uid;
          setUser(anonRes.user);
        } catch (e) {
          currentUid = `tg_${tgUser.id}`;
        }
      }

      await findAndMergeUserByEmail(db, tgEmail, currentUid, {
        displayName: tgName,
        telegram: tgHandle,
        venueId
      });

      finalizeAuthSuccess(tgName, tgEmail, '', tgHandle);
    } catch (err) {
      console.error("Telegram WebApp Auth error:", err);
      setAuthError(err.message || 'Ошибка Telegram WebApp');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleTelegramManualAuth = async (e) => {
    if (e) e.preventDefault();
    const handle = (telegramInput || '').trim();
    if (!handle) {
      setAuthError('Укажите ваш @username в Telegram');
      return;
    }
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const syntheticEmail = `${cleanHandle.replace('@', '').toLowerCase()}@telegram.user`;
    const displayName = cleanHandle;

    setIsAuthLoading(true);
    setAuthError('');
    try {
      let currentUid = user?.uid;
      if (!currentUid) {
        const anonRes = await signInAnonymously(auth);
        currentUid = anonRes.user.uid;
        setUser(anonRes.user);
      }

      await findAndMergeUserByEmail(db, syntheticEmail, currentUid, {
        displayName,
        telegram: cleanHandle,
        venueId
      });

      finalizeAuthSuccess(displayName, syntheticEmail, '', cleanHandle);
    } catch (err) {
      console.error("Telegram manual auth error:", err);
      setAuthError(err.message || 'Ошибка авторизации');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 3. Email Magic Link
  const handleSendMagicLink = async (e) => {
    if (e) e.preventDefault();
    const email = (magicEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAuthError('Пожалуйста, укажите корректный Email');
      return;
    }

    setIsAuthLoading(true);
    setAuthError('');
    try {
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      safeStorage.setItem('emailForSignIn', email);
      if (pendingCartItem) {
        safeStorage.setItem('pendingCartItem', JSON.stringify(pendingCartItem));
      }
      setMagicLinkSent(true);
    } catch (err) {
      console.error("Send Magic Link error:", err);
      setAuthError(err.message || 'Не удалось отправить ссылку на email');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 4. Quick Phone / WhatsApp handler
  const handleQuickLogin = async (e) => {
    if (e) e.preventDefault();
    if (!guestPhone.trim() && !guestName.trim()) {
      setAuthError("Пожалуйста, введите телефон или имя");
      return;
    }

    setIsAuthLoading(true);
    setAuthError('');
    try {
      let currentUid = user?.uid;
      if (!currentUid) {
        const cred = await signInAnonymously(auth);
        currentUid = cred.user.uid;
        setUser(cred.user);
      }

      const cleanName = guestName.trim() || 'Гость';
      const cleanPhone = guestPhone.trim() || '';

      const isTestUser = cleanName.toLowerCase().includes('test') || cleanName.toLowerCase().includes('sherlock') || cleanPhone.includes('999 8888');
      const userData = {
        name: cleanName,
        phone: cleanPhone,
        ...(isTestUser ? { isTestUser: true } : {}),
        updatedAt: serverTimestamp(),
        lastVisitVenueId: venueId
      };

      await setDoc(doc(db, 'users', currentUid), userData, { merge: true });
      finalizeAuthSuccess(cleanName, '', cleanPhone);
    } catch (err) {
      console.warn("Login fallback note:", err);
      finalizeAuthSuccess(guestName.trim() || 'Гость', '', guestPhone.trim());
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out note:", e);
    }
    safeStorage.setItem('guestName', '');
    safeStorage.setItem('guestPhone', '');
    safeStorage.setItem('guestEmail', '');
    safeStorage.setItem('guestTelegram', '');
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestTelegram('');
    setUser(null);
    setUserProfile(null);
    setDepositBalance(0);
    setCart({});
    setIsProfileModalOpen(false);
  };

  // Submit Direct Delivery Order
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cartCount === 0) return;
    if (!isUserIdentified) {
      setIsAuthModalOpen(true);
      return;
    }
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      alert("Укажите адрес доставки");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      safeStorage.setItem('deliveryAddress', deliveryAddress);
      const orderId = `REV-${Date.now().toString().slice(-6)}`;

      const itemsList = Object.values(cart).map(({ item, count }) => ({
        id: item.id || item.name,
        name: item.name,
        price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
        aggregatorPrice: parseFloat(String(item.aggregatorPrice || 0).replace(/[^0-9.]/g, '')) || 0,
        count
      }));

      const orderData = {
        orderId,
        venueId,
        venueName: venue?.name || 'Revoo Venue',
        customer: {
          uid: user?.uid || 'guest',
          name: effectiveDisplayName,
          phone: guestPhone || '',
          email: effectiveEmail || '',
          telegram: effectiveTelegram || '',
          address: deliveryType === 'delivery' ? deliveryAddress : 'Самовывоз',
          comment: orderComment
        },
        deliveryType,
        items: itemsList,
        subtotal: cartSubtotal,
        discountPercentage: currentDiscountRate,
        discountAmount: Math.round(cartSubtotal * (currentDiscountRate / 100)),
        deliveryFee,
        depositDeducted: depositDeduction,
        depositStatus: depositDeduction > 0 ? 'pending_approval' : 'not_used',
        totalPayable: finalOrderTotal,
        currency: venueCurrency,
        paymentMethod: selectedPaymentMethod,
        status: 'new',
        createdAt: serverTimestamp()
      };

      // Save order to Firestore
      let finalDocId = orderId;
      try {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        finalDocId = docRef.id;
      } catch (saveErr) {
        console.warn("Firestore order save note (proceeding with local order state):", saveErr);
      }

      // Record today's calendar date visit in localStorage and Firestore 'visits' for dynamic discount calculation tomorrow
      RewardCalculator.recordLocalVisitDate(venueId, todayStr, isGrabBagScenario);
      try {
        await addDoc(collection(db, 'visits'), {
          venueId,
          uid: user?.uid || browserSessionUid,
          userId: user?.uid || browserSessionUid,
          anonUid: RewardCalculator.getAnonymousUid() || browserSessionUid,
          browserSessionUid,
          guestEmail: (effectiveEmail || '').toLowerCase(),
          userEmail: (effectiveEmail || '').toLowerCase(),
          guestName: effectiveDisplayName || 'Guest',
          guestPhone: guestPhone || '',
          visitDateStr: todayStr,
          timestamp: serverTimestamp(),
          type: 'online_order',
          source: isGrabBagScenario ? 'grab_bag_online_order' : 'google_maps_online_order',
          discountEarned: currentDiscountRate,
          orderId,
        });
      } catch (visitErr) {
        console.warn("Firestore online_order visit log note:", visitErr);
      }
      setUserVisits(prev => [{ visitDateStr: todayStr, timestamp: new Date() }, ...prev]);
      
      // When deposit is requested, staff confirms and deducts in the Admin Online Orders Screen
      if (depositDeduction > 0 && user?.uid) {
        console.log(`Deposit deduction of ${depositDeduction} requested for order #${orderId}; waiting for staff confirmation in Admin`);
      }

      // Clear cart & show completed state
      setCart({});
      setIsCartOpen(false);
      setCompletedOrder({ ...orderData, id: finalDocId });
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Ошибка оформления заказа: " + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Dynamic script loader for PDF.js
  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js failed to load'));
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // PDF Preview Loader
  useEffect(() => {
    if (!gmConfig.menuPdfUrl) return;
    let isMounted = true;

    const loadPdf = async () => {
      setPdfLoading(true);
      try {
        const pdfjsLib = await loadPdfJs();
        let pdfData = { url: gmConfig.menuPdfUrl };
        try {
          const res = await fetch(gmConfig.menuPdfUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            pdfData = { data: buffer };
          }
        } catch (fetchErr) {
          console.warn("PDF ArrayBuffer fetch fallback:", fetchErr);
        }

        const loadingTask = pdfjsLib.getDocument({
          ...pdfData,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        setPdfNumPages(pdf.numPages);

        // Page 1 Thumbnail
        try {
          const page1 = await pdf.getPage(1);
          const viewport1 = page1.getViewport({ scale: 0.5 });
          const canvas1 = document.createElement('canvas');
          const ctx1 = canvas1.getContext('2d');
          canvas1.width = viewport1.width;
          canvas1.height = viewport1.height;
          await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise;
          if (isMounted) {
            setPdfThumbUrl(canvas1.toDataURL('image/jpeg', 0.75));
          }
        } catch (thumbErr) {
          console.warn("Thumbnail render warning:", thumbErr);
        }

        // Full Pages
        const pageUrls = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (!isMounted) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          pageUrls.push(canvas.toDataURL('image/jpeg', 0.85));
        }

        if (isMounted) {
          setPdfPages(pageUrls);
        }
      } catch (err) {
        console.warn("PDF render fallback:", err);
      } finally {
        if (isMounted) setPdfLoading(false);
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [gmConfig.menuPdfUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-[#83E1D9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If venue is a service business (Barbershop, Clinic, Spa), render the dedicated Revoo Services Storefront
  const isServices = venue?.businessType === 'services' || gmConfig?.businessType === 'services';
  if (isServices) {
    return <ServiceStorefront venue={venue} />;
  }

  // VietQR URL builder
  const paymentConfig = venue?.paymentConfig || {};
  const bankBin = paymentConfig.bankBin || "970422";
  const accNum = paymentConfig.accountNumber || "0901234567";
  const accName = paymentConfig.accountName || venue?.name || 'REVOO VENUE';
  const vietQrUrl = completedOrder && completedOrder.totalPayable > 0
    ? `https://img.vietqr.io/image/${bankBin}-${accNum}-compact2.png?amount=${completedOrder.totalPayable}&addInfo=${completedOrder.orderId}&accountName=${encodeURIComponent(accName)}`
    : null;

  return (
    <div className="min-h-screen bg-[#131314] font-sans text-white pb-28 select-none">
      
      {/* Top Header - Dark Google Maps Header */}
      <div className="bg-[#131314] sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#202124] border-b border-[#3C4043]">
          {/* Left: Back Arrow + Venue Name */}
          <div 
            className="flex items-center min-w-0 mr-2 cursor-pointer active:opacity-75 transition-opacity"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue?.name || 'restaurant')}`;
              }
            }}
          >
            <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <div className="ml-2.5 text-[15px] sm:text-[16px] truncate font-medium text-white">{venue?.name || 'Заведение'}</div>
          </div>

          {/* Right: Compact Battery, Discount & Login in Google Maps Style */}
          <div className="flex items-center gap-1.5 shrink-0">
            {depositBalance > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDepositModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-600/25 hover:from-amber-500/30 hover:to-yellow-600/35 border border-amber-400/60 rounded-2xl px-2.5 py-1 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)] active:scale-95 transition-all cursor-pointer"
                title="Детали депозита и QR-код"
              >
                <span className="text-xs">💰</span>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[10px] text-amber-300 font-extrabold whitespace-nowrap">
                    {formatPrice(depositBalance, venueCurrency)}
                  </span>
                  <span className="text-[8px] text-amber-200/80 font-medium whitespace-nowrap">
                    Депозит
                  </span>
                </div>
              </button>
            )}
            {!isUserIdentified ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingCartItem(null);
                  setAuthTriggerReason('header');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#303134] hover:bg-[#3C4043] active:scale-95 border border-[#5F6368]/70 hover:border-emerald-500/70 rounded-2xl px-2.5 py-1 text-white shadow-sm transition-all"
                title="Заряжайте Вашу скидку покупками"
              >
                {/* Mini Battery Graphic */}
                <div className="flex items-center shrink-0">
                  <div className="w-5 h-3 border-[1.5px] border-emerald-400 rounded-[3px] p-[1px] bg-black/60 flex items-center shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                    <div 
                      className="h-full bg-emerald-400 rounded-[1px] shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                      style={{ width: isGrabBagScenario ? '100%' : '85%' }}
                    />
                  </div>
                  <div className="w-[2px] h-[4px] bg-emerald-400 rounded-r-[1px] -ml-[0.5px]" />
                </div>

                {/* Discount Value & Slogan */}
                <div className="flex flex-col text-left leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-extrabold text-[11px] tracking-tight whitespace-nowrap">
                      {isGrabBagScenario ? `-${maxPossibleDiscount}%` : `до ${maxPossibleDiscount}%`}
                    </span>
                    <span className="bg-[#83E1D9] text-[#003833] font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase shadow-sm whitespace-nowrap">
                      Войти
                    </span>
                  </div>
                  <span className="text-[8.5px] text-gray-300 font-medium whitespace-nowrap pt-0.5">
                    {isGrabBagScenario ? 'QR из Grab: скидка уже максимальная!' : 'Заряжайте Вашу скидку покупками'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                data-testid="profile-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#303134] hover:bg-[#3C4043] active:scale-95 border border-emerald-500/50 rounded-2xl px-2.5 py-1 text-white shadow-sm transition-all"
                title="Ваш профиль и скидка"
              >
                {/* Mini Battery Graphic with active charge level */}
                <div className="flex items-center shrink-0">
                  <div className="w-5 h-3 border-[1.5px] border-emerald-400 rounded-[3px] p-[1px] bg-black/60 flex items-center shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                    <div 
                      className="h-full bg-emerald-400 rounded-[1px] shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      style={{ width: `${Math.min(100, Math.max(30, (currentDiscountRate / maxPossibleDiscount) * 100))}%` }}
                    />
                  </div>
                  <div className="w-[2px] h-[4px] bg-emerald-400 rounded-r-[1px] -ml-[0.5px]" />
                </div>

                <div className="flex flex-col text-left leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-300 font-black text-[11px] whitespace-nowrap">
                      -{currentDiscountRate}%
                    </span>
                    <span className="text-gray-200 font-semibold text-[10px] truncate max-w-[70px] sm:max-w-[95px]">
                      {effectiveDisplayName}
                    </span>
                  </div>
                  <span className="text-[8.5px] text-emerald-400 font-medium whitespace-nowrap pt-0.5">
                    {isGrabBagScenario
                      ? `QR из Grab: скидка ${maxPossibleDiscount}% активна`
                      : hasVisitedToday || userTierStatus === 'vip' || depositBalance > 0
                        ? 'Батарея заряжена'
                        : `Сегодня ${baseTierDiscount}% • Завтра до ${maxPossibleDiscount}%`}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Venue Info Header */}
        <div className="px-4 pt-4 pb-2 flex justify-between items-start">
          <div>
            <h1 className="text-[25px] font-bold mb-1 leading-tight tracking-tight text-white">{venue?.name || 'Заведение'}</h1>
            <div className="flex items-center text-[13px] text-gray-300 mb-1">
              <span className="font-semibold mr-1 text-amber-400">4.9</span>
              <div className="flex text-yellow-500 mr-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span>(142) • 🚗 Доставка от 25 мин</span>
            </div>
            <div className="text-[13px] text-gray-400 mb-1">
              {venue?.category || 'Ресторан & Кафе'} • {venueCurrency}
            </div>
            <div className="text-[13px] flex items-center gap-2">
              <span className="text-[#81C995] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#81C995] animate-pulse"></span>
                Открыто для заказов
              </span>
              <span className="text-gray-400">• до 23:00</span>
            </div>
          </div>

          {/* Socials */}
          <div className="flex gap-2 shrink-0 ml-3">
            {gmConfig?.instagram && (
              <button 
                onClick={() => { logVenueClick(venue?.id || venueId, 'instagram'); window.open(gmConfig.instagram, '_blank'); }}
                className="w-9 h-9 rounded-full bg-[#202124] border border-[#3C4043] flex items-center justify-center text-gray-300 hover:text-white"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-4 h-4" />
              </button>
            )}
            {gmConfig?.tiktok && (
              <button 
                onClick={() => { logVenueClick(venue?.id || venueId, 'tiktok'); window.open(gmConfig.tiktok, '_blank'); }}
                className="w-9 h-9 rounded-full bg-[#202124] border border-[#3C4043] flex items-center justify-center text-gray-300 hover:text-white"
              >
                <FontAwesomeIcon icon={faTiktok} className="w-4 h-4" />
              </button>
            )}
            {gmConfig?.youtube && (
              <button 
                onClick={() => { logVenueClick(venue?.id || venueId, 'youtube'); window.open(gmConfig.youtube, '_blank'); }}
                className="w-9 h-9 rounded-full bg-[#202124] border border-[#3C4043] flex items-center justify-center text-gray-300 hover:text-white"
              >
                <FontAwesomeIcon icon={faYoutube} className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex px-4 py-2.5 gap-2 overflow-x-auto hide-scrollbar border-b border-white/5">
          <button 
            onClick={() => {
              logVenueClick(venue?.id || venueId, 'google_maps');
              window.open(venue?.googleMapsLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue?.name || 'restaurant')}`, '_blank');
            }}
            className="flex items-center gap-1.5 bg-[#83E1D9] text-[#003833] px-3.5 py-1.5 rounded-full font-bold text-xs whitespace-nowrap active:scale-95 transition-transform"
          >
            <FontAwesomeIcon icon={faMapLocationDot} className="w-3.5 h-3.5" />
            Маршрут
          </button>
          
          {(gmConfig?.phone || venue?.phone) && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'phone');
                window.open(`tel:${gmConfig?.phone || venue?.phone}`, '_self');
              }}
              className="flex items-center gap-1.5 bg-[#202124] text-gray-200 border border-[#3C4043] px-3.5 py-1.5 rounded-full font-medium text-xs whitespace-nowrap active:scale-95 transition-transform"
            >
              <svg className="w-3.5 h-3.5 text-[#83E1D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Позвонить
            </button>
          )}

          {gmConfig?.whatsapp && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'whatsapp');
                window.open(gmConfig.whatsapp, '_blank');
              }}
              className="flex items-center gap-1.5 bg-[#202124] text-[#81C995] border border-[#3C4043] px-3.5 py-1.5 rounded-full font-medium text-xs whitespace-nowrap active:scale-95 transition-transform"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          )}

          {gmConfig?.telegram && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'telegram');
                window.open(gmConfig.telegram, '_blank');
              }}
              className="flex items-center gap-1.5 bg-[#202124] text-[#83E1D9] border border-[#3C4043] px-3.5 py-1.5 rounded-full font-medium text-xs whitespace-nowrap active:scale-95 transition-transform"
            >
              <FontAwesomeIcon icon={faTelegram} className="w-3.5 h-3.5" />
              Telegram
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Discount & Customer Loyalty Bar (Scenario 1: Google Maps vs Scenario 2: Grab Bag QR) */}
      <div className="px-4 pt-3 pb-2">
        {!isUserIdentified ? (
          <div 
            onClick={() => {
              setPendingCartItem(null);
              setAuthTriggerReason('banner');
              setIsAuthModalOpen(true);
            }}
            className="cursor-pointer bg-gradient-to-r from-emerald-950/80 via-teal-900/60 to-[#202124] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {isGrabBagScenario ? '🛍️ QR из пакета Grab' : 'Прямой заказ'}
                </span>
                <span className="text-emerald-400 font-extrabold text-xs">
                  {isGrabBagScenario ? `Скидка УЖЕ ${maxPossibleDiscount}%` : `Скидка ДО ${maxPossibleDiscount}%`}
                </span>
                <span className="text-emerald-300 font-bold text-[11px]">
                  • Заряжайте Вашу скидку покупками!
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                {isGrabBagScenario
                  ? `Закажите завтра у нас напрямую (или прямо сейчас) — ваша скидка уже максимальная (${maxPossibleDiscount}%)! Мы приравняли сканирование QR в Grab к заказу у нас.`
                  : `Привет! Сегодня ваша скидка — минимальная (${baseTierDiscount}%), а завтра после заказа станет максимальной (${maxPossibleDiscount}%)! Не пропускайте!`}
              </p>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPendingCartItem(null);
                setAuthTriggerReason('banner_button');
                setIsAuthModalOpen(true);
              }}
              className="shrink-0 bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs px-3.5 py-2 rounded-xl shadow-md active:scale-95 transition-all"
            >
              Зарядить
            </button>
          </div>
        ) : (
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="cursor-pointer bg-gradient-to-r from-neutral-900 to-[#202124] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-3.5 shadow-lg flex items-center justify-between gap-2 active:scale-[0.99] transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-white text-xs font-bold truncate max-w-[150px]">
                  {effectiveDisplayName}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  -{currentDiscountRate}%
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">
                  {isGrabBagScenario
                    ? `🛍️ QR из Grab: скидка ${maxPossibleDiscount}% активна`
                    : hasVisitedToday || userTierStatus === 'vip' || depositBalance > 0
                      ? '🔋 Батарея заряжена'
                      : `⚡ Сегодня -${currentDiscountRate}% → Завтра -${maxPossibleDiscount}%`}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                {depositBalance > 0 
                  ? `💰 Баланс депозита: ${formatPrice(depositBalance, venueCurrency)} доступен для оплаты онлайн. На меню действует регулярная скидка -${currentDiscountRate}% по визитам.` 
                  : isGrabBagScenario
                    ? `Закажите завтра у нас напрямую (или прямо сейчас) — ваша скидка уже максимальная (${maxPossibleDiscount}%)!`
                    : hasVisitedToday || userTierStatus === 'vip'
                      ? `Спасибо за заказ сегодня! Ваша скидка на следующий заказ — ${maxPossibleDiscount}%! Повторите заказ завтра, чтобы не потерять её!`
                      : `Привет! Сегодня ваша скидка — минимальная (${baseTierDiscount}%), а завтра после заказа станет максимальной (${maxPossibleDiscount}%)! Не пропускайте!`}
              </p>
              {activeHappyHour && (
                <div className="text-orange-400 font-bold text-[11px] flex items-center gap-1">
                  ⚡ {activeHappyHour.name} (+{activeHappyHour.discountBonus}%)
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileModalOpen(true);
              }}
              className="text-[11px] text-gray-400 hover:text-white underline px-2 py-1"
            >
              Профиль
            </button>
          </div>
        )}
      </div>

      {/* Happy Hours Announcement Banner */}
      {activeHappyHour && (
        <div className="px-4 py-1.5">
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-orange-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <span className="font-bold">
                Счастливые часы прямо сейчас! Дополнительно +{activeHappyHour.discountBonus}% скидки!
              </span>
            </div>
            <span className="text-[10px] bg-orange-500/30 text-orange-200 px-2 py-0.5 rounded-full font-mono font-bold">
              до {activeHappyHour.endHour || '23:59'}
            </span>
          </div>
        </div>
      )}

      {/* Switcher Tab between Online Delivery Menu and PDF/Photo Menu */}
      {(gmConfig.usePdfMenu || gmConfig.menuPdfUrl || gmConfig.usePhotoMenu) && menuItems.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex gap-2">
          <button
            onClick={() => setActiveViewTab('delivery')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeViewTab === 'delivery'
                ? 'bg-[#83E1D9] text-[#003833] shadow-md'
                : 'bg-[#202124] text-gray-400 border border-[#3C4043]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            Онлайн-заказ ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveViewTab('pdf')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeViewTab === 'pdf'
                ? 'bg-[#83E1D9] text-[#003833] shadow-md'
                : 'bg-[#202124] text-gray-400 border border-[#3C4043]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Оригинальное меню (PDF)
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 space-y-4">

        {/* View Mode: Delivery Menu */}
        {activeViewTab === 'delivery' && (
          <>
            {/* Category Selector Pills */}
            {categories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-white text-black shadow-md'
                        : 'bg-[#202124] text-gray-300 border border-[#3C4043] hover:border-gray-400'
                    }`}
                  >
                    {cat === 'all' ? 'Все блюда' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items Grid */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredItems.map((item, idx) => {
                  const itemId = item.id || item.name;
                  const countInCart = cart[itemId]?.count || 0;
                  const rawBasePrice = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
                  const rawAggPrice = parseFloat(String(item.aggregatorPrice || 0).replace(/[^0-9.]/g, '')) || 0;
                  
                  const appliedRate = isUserIdentified ? currentDiscountRate : maxPossibleDiscount;
                  const discountedPrice = Math.round(rawBasePrice * (1 - appliedRate / 100));
                  const savings = rawAggPrice > 0 ? Math.max(0, rawAggPrice - discountedPrice) : 0;
                  const savingsPerc = rawAggPrice > 0 ? Math.round((savings / rawAggPrice) * 100) : appliedRate;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedProductModalItem(item)}
                      className="bg-[#202124] border border-[#3C4043] hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col cursor-pointer group hover:scale-[1.01]"
                    >
                      {/* Image Thumbnail with Savings Pill Overlay */}
                      <div className="relative h-44 w-full bg-neutral-900 overflow-hidden">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-neutral-800">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span className="text-[10px] mt-1 text-gray-500">Фото блюда</span>
                          </div>
                        )}

                        {/* Category Badge */}
                        {item.category && (
                          <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-[10px] font-semibold text-gray-300 px-2 py-0.5 rounded-md border border-white/10">
                            {item.category}
                          </span>
                        )}

                        {/* Aggregator Savings Badge */}
                        {rawAggPrice > 0 && savings > 0 && (
                          <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <span>Экономия -{savingsPerc}%</span>
                          </div>
                        )}
                      </div>

                      {/* Content & Price Section */}
                      <div className="p-3.5 flex flex-col flex-grow justify-between">
                        <div>
                          <h3 className="font-bold text-white text-[15px] leading-snug mb-1">{item.name}</h3>
                          {item.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-end justify-between gap-2 mt-auto">
                          {/* Price block */}
                          <div>
                            {rawAggPrice > 0 && (
                              <div className="text-[11px] text-gray-400 line-through">
                                В Grab: {formatPrice(rawAggPrice, venueCurrency)}
                              </div>
                            )}
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-emerald-400">
                                {formatPrice(discountedPrice, venueCurrency)}
                              </span>
                              {appliedRate > 0 && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  {formatPrice(rawBasePrice, venueCurrency)}
                                </span>
                              )}
                            </div>
                            {!isUserIdentified && (
                              <span className="text-[10px] text-emerald-400/80 font-medium">
                                *при входе до -{maxPossibleDiscount}%
                              </span>
                            )}
                          </div>

                          {/* Cart Button / Modifier */}
                          <div onClick={(e) => e.stopPropagation()}>
                            {countInCart === 0 ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                                className="bg-[#83E1D9] hover:bg-[#68c9c0] active:scale-95 text-[#003833] font-black text-xs px-3 py-2 rounded-xl shadow-md transition-all flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                В заказ
                              </button>
                            ) : (
                              <div className="flex items-center bg-[#2b2d30] border border-emerald-500/50 rounded-xl overflow-hidden p-0.5 shadow-md">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromCart(item);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-700 rounded-lg text-sm font-bold active:scale-90"
                                >
                                  -
                                </button>
                                <span className="px-2.5 text-xs font-black text-emerald-400">
                                  {countInCart}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(item);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-700 rounded-lg text-sm font-bold active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#202124] rounded-2xl p-8 border border-[#3C4043] text-center text-gray-400">
                Блюда в данной категории не найдены.
              </div>
            )}
          </>
        )}

        {/* View Mode: Original PDF or Photo Menu */}
        {activeViewTab === 'pdf' && (
          <div>
            {(gmConfig.usePdfMenu || gmConfig.menuPdfUrl) && !gmConfig.usePhotoMenu ? (
              <div 
                className="bg-[#202124] border border-[#3C4043] rounded-2xl overflow-hidden shadow-xl hover:border-amber-400/60 transition-all cursor-pointer group flex flex-col"
                onClick={() => setIsPdfModalOpen(true)}
              >
                <div className="relative h-48 w-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black overflow-hidden flex items-center justify-center border-b border-white/10">
                  {pdfThumbUrl || (pdfPages.length > 0 && pdfPages[0]) ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black/40">
                      <img 
                        src={pdfThumbUrl || pdfPages[0]} 
                        alt="Menu Preview" 
                        className="h-full object-contain shadow-2xl transition-transform duration-300 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#202124] via-transparent to-black/30" />
                    </div>
                  ) : pdfLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center p-4">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-amber-400">Генерация превью...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center p-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">PDF Документ</span>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-bold text-amber-400 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {pdfNumPages > 0 ? `PDF • ${pdfNumPages} стр.` : 'PDF Меню'}
                  </div>
                </div>

                <div className="p-4 flex flex-col items-center text-center space-y-2.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">Полное меню заведения</h3>
                  <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                    Нажмите для просмотра всех страниц в высоком качестве с возможностью масштабирования.
                  </p>
                  <button className="w-full py-3 rounded-xl bg-amber-400 text-black font-extrabold text-sm shadow-lg hover:bg-amber-300 active:scale-98 transition-all flex items-center justify-center gap-2 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    Открыть PDF Меню
                  </button>
                </div>
              </div>
            ) : gmConfig.usePhotoMenu && gmConfig.menuPhotos && gmConfig.menuPhotos.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 brand-scrollbar -mx-4 px-4">
                {gmConfig.menuPhotos.map((photoUrl, idx) => (
                  <div 
                    key={idx} 
                    className="flex-shrink-0 aspect-[3/4] w-64 rounded-2xl overflow-hidden snap-center shadow-md border border-neutral-700 cursor-pointer"
                    onClick={() => setSelectedPhotoIndex(idx)}
                  >
                    <img src={photoUrl} alt={`Menu ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="max-w-md mx-auto bg-gradient-to-r from-emerald-500 to-teal-400 text-black p-3.5 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-black text-sm">
                <span>🛒 {cartCount} блюд(а)</span>
                <span>•</span>
                <span>{formatPrice(discountedSubtotal, venueCurrency)}</span>
              </div>
              {cartSavingsVsAggregator > 0 && (
                <div className="text-[11px] font-bold text-emerald-950">
                  Выгода vs Grab: {formatPrice(cartSavingsVsAggregator, venueCurrency)}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
            >
              Оформить
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#1a1b1e] border-t sm:border border-[#3C4043] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#202124]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛍️</span>
                  <h2 className="text-lg font-bold text-white">Ваш заказ</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    -{currentDiscountRate}%
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 overflow-y-auto space-y-4">

                {/* Delivery or Pickup Toggle */}
                <div className="flex bg-[#202124] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      deliveryType === 'delivery' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400'
                    }`}
                  >
                    🚗 Доставка курьером
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      deliveryType === 'pickup' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400'
                    }`}
                  >
                    🛍️ Самовывоз {pickupBonus > 0 && `(-${pickupBonus}%)`}
                  </button>
                </div>

                {/* Free Delivery Bar */}
                {deliveryType === 'delivery' && freeThreshold > 0 && (
                  <div className="bg-[#202124] p-3 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">
                        {isFreeDelivery ? '🎉 Бесплатная доставка активна!' : 'До бесплатной доставки:'}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {isFreeDelivery 
                          ? '0 ₫' 
                          : formatPrice(Math.max(0, freeThreshold - discountedSubtotal), venueCurrency)}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((discountedSubtotal / freeThreshold) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2 divide-y divide-white/5">
                  {Object.values(cart).map(({ item, count }) => {
                    const rawPrice = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
                    const itemDiscounted = Math.round(rawPrice * (1 - currentDiscountRate / 100));
                    return (
                      <div key={item.id || item.name} className="pt-2 flex items-center justify-between gap-3">
                        <div className="flex-grow">
                          <h4 className="text-xs font-bold text-white leading-tight">{item.name}</h4>
                          <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                            {formatPrice(itemDiscounted, venueCurrency)} × {count} = {formatPrice(itemDiscounted * count, venueCurrency)}
                          </div>
                        </div>
                        <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-white/10 shrink-0">
                          <button 
                            onClick={() => removeFromCart(item)}
                            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{count}</span>
                          <button 
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Customer Details Form */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Имя получателя</label>
                    <input 
                      type="text" 
                      value={guestName} 
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ваше имя" 
                      className="w-full bg-[#202124] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Телефон для связи</label>
                    <input 
                      type="tel" 
                      value={guestPhone} 
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+84..." 
                      className="w-full bg-[#202124] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {deliveryType === 'delivery' && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Адрес доставки</label>
                      <input 
                        type="text" 
                        value={deliveryAddress} 
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Улица, дом, квартира / номер отеля" 
                        className="w-full bg-[#202124] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Комментарий к заказу</label>
                    <input 
                      type="text" 
                      value={orderComment} 
                      onChange={(e) => setOrderComment(e.target.value)}
                      placeholder="Например: без лука, позвонить в дверь" 
                      className="w-full bg-[#202124] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Deposit Balance Payment Option */}
                {depositBalance > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-amber-300 block">
                        💰 Оплата с депозита
                      </span>
                      <span className="text-[11px] text-gray-300">
                        Доступно: {formatPrice(depositBalance, venueCurrency)}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={useDeposit} 
                        onChange={(e) => setUseDeposit(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    </label>
                  </div>
                )}

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1.5">Способ оплаты</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('vietqr')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                        selectedPaymentMethod === 'vietqr'
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-[#202124] border-[#3C4043] text-gray-400'
                      }`}
                    >
                      <span>⚡</span>
                      <span>VietQR (Napas247)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                        selectedPaymentMethod === 'cash'
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-[#202124] border-[#3C4043] text-gray-400'
                      }`}
                    >
                      <span>💵</span>
                      <span>Наличными курьеру</span>
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-[#202124] rounded-xl p-3.5 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Сумма блюд:</span>
                    <span>{formatPrice(cartSubtotal, venueCurrency)}</span>
                  </div>
                  {currentDiscountRate > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Скидка ({currentDiscountRate}%):</span>
                      <span>-{formatPrice(Math.round(cartSubtotal * (currentDiscountRate / 100)), venueCurrency)}</span>
                    </div>
                  )}
                  {deliveryType === 'delivery' && (
                    <div className="flex justify-between text-gray-400">
                      <span>Доставка:</span>
                      <span>{deliveryFee === 0 ? 'Бесплатно' : formatPrice(deliveryFee, venueCurrency)}</span>
                    </div>
                  )}
                  {depositDeduction > 0 && (
                    <div className="flex justify-between text-amber-300 font-medium">
                      <span>Оплата с депозита:</span>
                      <span>-{formatPrice(depositDeduction, venueCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                    <span>К ОПЛАТЕ:</span>
                    <span className="text-emerald-400">{formatPrice(finalOrderTotal, venueCurrency)}</span>
                  </div>

                  {/* Battery Charge Incentive Soundbite */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-[11px] text-emerald-300 flex items-center gap-2 mt-2">
                    <span className="text-base shrink-0">🔋</span>
                    <span className="leading-tight">
                      <strong>Спасибо за заказ сегодня!</strong> Ваша скидка на следующий заказ — {maxPossibleDiscount}%! Повторите заказ завтра, чтобы не потерять её!
                    </span>
                  </div>
                </div>

              </div>

              {/* Drawer Footer CTA */}
              <div className="p-4 border-t border-white/10 bg-[#202124]">
                <button
                  type="button"
                  disabled={isSubmittingOrder}
                  onClick={handleCheckoutSubmit}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Подтвердить заказ • {formatPrice(finalOrderTotal, venueCurrency)}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal (Photos & Detailed Description) */}
      <AnimatePresence>
        {selectedProductModalItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProductModalItem(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-[#1C1C1E] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedProductModalItem(null)}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/95 active:scale-95 transition-all shadow-lg border border-white/10"
              >
                ✕
              </button>

              {/* Dish Photo */}
              <div className="relative h-64 sm:h-72 w-full bg-neutral-900 shrink-0 overflow-hidden">
                {selectedProductModalItem.imageUrl ? (
                  <img
                    src={selectedProductModalItem.imageUrl}
                    alt={selectedProductModalItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-neutral-800">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span className="text-xs mt-2 text-gray-400">Фото блюда</span>
                  </div>
                )}
                {selectedProductModalItem.category && (
                  <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-xs font-bold text-gray-200 px-3 py-1 rounded-full border border-white/15">
                    {selectedProductModalItem.category}
                  </span>
                )}
              </div>

              {/* Scrollable details */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {selectedProductModalItem.name}
                  </h2>
                </div>

                {selectedProductModalItem.description && (
                  <div className="bg-[#202124] border border-[#3C4043] rounded-2xl p-4">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Описание блюда
                    </h4>
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                      {selectedProductModalItem.description}
                    </p>
                  </div>
                )}

                {/* Pricing & Loyalty Breakdown */}
                {(() => {
                  const rawBasePrice = parseFloat(String(selectedProductModalItem.price).replace(/[^0-9.]/g, '')) || 0;
                  const rawAggPrice = parseFloat(String(selectedProductModalItem.aggregatorPrice || 0).replace(/[^0-9.]/g, '')) || 0;
                  const appliedRate = isUserIdentified ? currentDiscountRate : maxPossibleDiscount;
                  const discountedPrice = Math.round(rawBasePrice * (1 - appliedRate / 100));
                  const savings = rawAggPrice > 0 ? Math.max(0, rawAggPrice - discountedPrice) : 0;

                  return (
                    <div className="bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-black border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-400 font-semibold">
                          Ваша персональная цена:
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-400">
                            {formatPrice(discountedPrice, venueCurrency)}
                          </span>
                          {appliedRate > 0 && (
                            <span className="text-xs text-gray-500 line-through">
                              {formatPrice(rawBasePrice, venueCurrency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {rawAggPrice > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                          <span className="text-gray-400">В сервисах доставки (Grab):</span>
                          <span className="text-gray-400 line-through font-medium">
                            {formatPrice(rawAggPrice, venueCurrency)}
                          </span>
                        </div>
                      )}

                      {savings > 0 && (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span>Ваша выгода при заказе у нас:</span>
                          <span>+{formatPrice(savings, venueCurrency)}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 rounded-xl px-3 py-1.5 border border-emerald-500/20">
                        {depositBalance > 0
                          ? `💡 Скидка -${appliedRate}% рассчитана по вашему активному депозиту (${formatPrice(depositBalance, venueCurrency)}).`
                          : isUserIdentified
                            ? `💡 Персональная скидка -${appliedRate}% рассчитана на основании вашей истории визитов.`
                            : `💡 При входе применяется ваша персональная скидка (до -${maxPossibleDiscount}%).`}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Action Bar */}
              {(() => {
                const itemId = selectedProductModalItem.id || selectedProductModalItem.name;
                const countInCart = cart[itemId]?.count || 0;

                return (
                  <div className="p-4 border-t border-white/10 bg-[#161618] flex items-center gap-3">
                    {countInCart === 0 ? (
                      <button
                        type="button"
                        onClick={() => addToCart(selectedProductModalItem)}
                        className="flex-1 bg-[#83E1D9] hover:bg-[#68c9c0] text-[#003833] font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                        Добавить в заказ
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-between bg-[#202124] border border-emerald-500/40 rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(selectedProductModalItem)}
                          className="w-10 h-10 flex items-center justify-center text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl text-lg font-black active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-400">В заказе</span>
                          <span className="text-base font-black text-emerald-400">{countInCart} шт.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(selectedProductModalItem)}
                          className="w-10 h-10 flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-400 rounded-xl text-lg font-black active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Deposit Modal (QR code for staff & wallet inspection) */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDepositModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#1C1C1E] border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>

              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-base">💰</span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Баланс депозита
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                {formatPrice(depositBalance, venueCurrency)}
              </div>

              <p className="text-xs text-gray-400 mb-4 px-2 leading-relaxed">
                Этот депозит привязан к вашему аккаунту и может быть использован для оплаты онлайн-заказов или списания счета в заведении.
              </p>

              {/* QR Code for Staff */}
              <div className="bg-white p-3.5 rounded-2xl shadow-xl mb-3 inline-block border border-white/20">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                    `https://bot-lab-21910.web.app/admin/deposit?search=${user?.uid || safeStorage.getItem('effectiveUid') || effectiveEmail || guestName || ''}&venueId=${venueId}&action=deduct`
                  )}`}
                  alt="Personal Deposit QR"
                  className="w-[160px] h-[160px] block mx-auto"
                />
              </div>

              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-4">
                Покажите этот QR-код сотруднику для оплаты в заведении
              </p>

              <div className="bg-[#202124] rounded-2xl p-3 border border-emerald-500/20 text-left text-xs text-emerald-300 space-y-1 mb-4">
                <div className="font-bold flex items-center gap-1.5 text-white">
                  <span>🍽️</span>
                  <span>Онлайн-заказ еды со скидкой</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-tight">
                  При заказе онлайн действует регулярная скидка (-${currentDiscountRate}%), а депозит автоматически уменьшает сумму к оплате.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Вернуться к выбору блюд
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Phone / Multi-Provider Login Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              className="w-full max-w-sm bg-[#1e2023] border border-[#3C4043] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              {/* Header with visual badge */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-300 font-extrabold text-xs">
                    {isGrabBagScenario
                      ? `🛍️ QR из Grab: скидка УЖЕ ${maxPossibleDiscount}%`
                      : `Скидка до ${maxPossibleDiscount}% • Заряжайте Вашу скидку покупками`}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white pt-1">
                  Заказ онлайн напрямую
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {isGrabBagScenario
                    ? `Закажите завтра у нас напрямую (или прямо сейчас) — ваша скидка уже максимальная (${maxPossibleDiscount}%)!`
                    : `Привет! Сегодня ваша скидка — минимальная (${baseTierDiscount}%), а завтра после заказа станет максимальной (${maxPossibleDiscount}%)! Не пропускайте!`}
                </p>
              </div>

              {/* Service & Discount Highlights */}
              <div className="bg-[#26282c] border border-white/5 rounded-2xl p-3.5 space-y-2.5 text-xs">
                {isGrabBagScenario ? (
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">🛍️</span>
                    <span className="text-gray-300 text-[11.5px] leading-snug">
                      <strong className="text-emerald-400">QR из Grab засчитан как заказ:</strong> Мы приравняли сканирование QR-кода в пакете Grab к заказу у нас. У вас сразу открыта максимальная скидка ({maxPossibleDiscount}%) сегодня и завтра!
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">🔋</span>
                    <span className="text-gray-300 text-[11.5px] leading-snug">
                      <strong className="text-emerald-400">Скидка на следующий заказ:</strong> Сегодня стартовая скидка {baseTierDiscount}%, а заказ сегодня открывает максимальную скидку ({maxPossibleDiscount}%) на завтра!
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">⚡</span>
                  <span className="text-gray-300 text-[11.5px] leading-snug">
                    <strong className="text-amber-300">Не дайте скидке растаять:</strong> Повторите заказ завтра, чтобы не потерять максимальный заряд! Если пропустить день, скидка начнет таять.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">✨</span>
                  <span className="text-gray-300 text-[11.5px] leading-snug">
                    <strong className="text-white">Честные цены:</strong> Напрямую от заведения — дешевле агрегаторов (Grab, Glovo, Zomato) на 20–30%.
                  </span>
                </div>
                {venue?.hasDepositSystem && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">💰</span>
                    <span className="text-gray-300 text-[11.5px] leading-snug">
                      <strong className="text-amber-400">Депозит = Вечный заряд:</strong> Баланс депозита закрепляет депозитную скидку, пока на счете есть средства.
                    </span>
                  </div>
                )}
              </div>

              {pendingCartItem && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-[11.5px] text-emerald-300 flex items-center gap-2">
                  <span>🛒</span>
                  <span className="truncate">
                    Блюдо <strong>"{pendingCartItem.name}"</strong> будет добавлено в заказ!
                  </span>
                </div>
              )}

              {/* Auth Error Banner */}
              {authError && (
                <div className="bg-red-950/50 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300 text-center">
                  {authError}
                </div>
              )}

              {/* View 1: Main Provider Options */}
              {authMethod === 'options' && (
                <div className="space-y-2.5 pt-1">
                  {/* Google (Gmail) Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthLoading}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 active:scale-98 text-[#3c4043] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2.5"
                  >
                    {isAuthLoading ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                    ) : (
                      <FontAwesomeIcon icon={faGoogle} className="text-base text-[#EA4335]" />
                    )}
                    <span>Войти через Google (Gmail)</span>
                  </button>

                  {/* Telegram Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleTelegramClick}
                    disabled={isAuthLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2.5"
                  >
                    <FontAwesomeIcon icon={faTelegram} className="text-base" />
                    <span>Войти через Telegram</span>
                  </button>

                  {/* Magic Link (Email) Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMethod('magic_link');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2a2c30] hover:bg-[#34373c] border border-[#3C4043] active:scale-98 text-gray-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faEnvelope} className="text-sm text-emerald-400" />
                    <span>Войти по Magic Link (Email)</span>
                  </button>

                  {/* Phone / WhatsApp Alternative */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMethod('phone');
                    }}
                    className="w-full py-2 text-center text-[11px] text-gray-400 hover:text-emerald-300 font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faPhone} className="text-[10px]" />
                    <span>Или войти по номеру телефона / WhatsApp →</span>
                  </button>
                </div>
              )}

              {/* View 2: Telegram Deep Link & Handle View */}
              {authMethod === 'telegram' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('options')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      <span>Все способы</span>
                    </button>
                    <span className="text-xs font-bold text-[#2AABEE] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTelegram} /> Telegram
                    </span>
                  </div>

                  <a
                    href={`https://t.me/${botName}?start=delivery_${venueId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#2AABEE]/20 hover:bg-[#2AABEE]/30 border border-[#2AABEE]/50 text-[#2AABEE] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm text-center"
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                    <span>Открыть бот @{botName}</span>
                  </a>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-gray-400 uppercase font-bold">или укажите юзернейм</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <form onSubmit={handleTelegramManualAuth} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                        Ваш Telegram @username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs">@</span>
                        <input
                          type="text"
                          value={telegramInput.replace(/^@/, '')}
                          onChange={(e) => setTelegramInput(e.target.value)}
                          placeholder="username"
                          className="w-full bg-[#2a2c30] border border-[#3C4043] focus:border-[#2AABEE] rounded-xl pl-7 pr-3 py-2.5 text-xs text-white outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-2.5 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isAuthLoading ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                      ) : (
                        <span>Подтвердить и продолжить</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* View 3: Magic Link (Passwordless Email) */}
              {authMethod === 'magic_link' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('options');
                        setMagicLinkSent(false);
                      }}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      <span>Все способы</span>
                    </button>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faEnvelope} /> Magic Link
                    </span>
                  </div>

                  {magicLinkSent ? (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">Ссылка отправлена!</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Мы отправили ссылку для входа на <strong>{magicEmail}</strong>. Откройте почту и перейдите по ссылке — вы сразу войдете со своей скидкой.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMagicLinkSent(false)}
                        className="text-[11px] text-emerald-400 hover:underline pt-1 block mx-auto font-medium"
                      >
                        Отправить на другой Email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMagicLink} className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                          Ваш Email
                        </label>
                        <input
                          type="email"
                          value={magicEmail}
                          onChange={(e) => setMagicEmail(e.target.value)}
                          placeholder="alex@gmail.com"
                          className="w-full bg-[#2a2c30] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Вход без пароля: перейдите по ссылке в письме и скидка мгновенно активируется.
                      </p>
                      <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {isAuthLoading ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                        ) : (
                          <span>Получить Magic Link на Email</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* View 4: Phone / WhatsApp Form */}
              {authMethod === 'phone' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('options')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      <span>Все способы</span>
                    </button>
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faPhone} /> Телефон / WhatsApp
                    </span>
                  </div>

                  <form onSubmit={handleQuickLogin} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Ваше имя</label>
                      <input 
                        type="text" 
                        value={guestName} 
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Александр" 
                        className="w-full bg-[#2a2c30] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">Номер телефона / WhatsApp</label>
                      <input 
                        type="tel" 
                        value={guestPhone} 
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+84 90 123 4567" 
                        className="w-full bg-[#2a2c30] border border-[#3C4043] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isAuthLoading ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                      ) : (
                        <span>Войти и заказать со скидкой</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Dismiss / Continue Browsing */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPendingCartItem(null);
                    setIsAuthModalOpen(false);
                    setAuthMethod('options');
                  }}
                  className="w-full py-2 rounded-xl text-gray-400 hover:text-white font-medium text-xs transition-colors"
                >
                  Продолжить просмотр меню
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile & Loyalty Status Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              className="w-full max-w-sm bg-[#1e2023] border border-[#3C4043] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-sm">
                    {(effectiveDisplayName || 'G')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white truncate max-w-[170px]">{effectiveDisplayName}</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[170px]">{effectiveContact || 'Профиль активен'}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-neutral-800 text-gray-400 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Loyalty Battery & Perks */}
              <div className="bg-[#26282c] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🔋</span>
                    <span className="text-xs text-gray-300 font-medium">Ваша скидка онлайн:</span>
                  </div>
                  <span className="text-emerald-400 font-black text-base">-{currentDiscountRate}%</span>
                </div>
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 text-[11px] text-gray-300 leading-snug">
                  {depositBalance > 0 ? (
                    <span>💰 <strong className="text-amber-300">Депозит активен:</strong> максимальный 100% заряд батареи закреплен навсегда!</span>
                  ) : (
                    <span>⚡ <strong className="text-emerald-400">Правило батареи:</strong> Заказ сегодня активирует максимальную скидку {maxPossibleDiscount}% на следующий заказ. Повторите заказ завтра, чтобы не потерять её!</span>
                  )}
                </div>
                {depositBalance > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-amber-300 font-medium">💰 Баланс депозита:</span>
                    <span className="text-amber-300 font-extrabold text-sm">{formatPrice(depositBalance, venueCurrency)}</span>
                  </div>
                )}
                {activeHappyHour && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-orange-300 text-xs">
                    <span>⚡ {activeHappyHour.name}:</span>
                    <span className="font-bold">+{activeHappyHour.discountBonus}%</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 leading-snug">
                  Скидка автоматически применяется ко всем блюдам онлайн-меню при оформлении заказа.
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-400 font-bold text-xs transition-colors"
                >
                  Выйти из профиля
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#83E1D9] text-[#003833] font-black text-xs shadow-md transition-all"
                >
                  В меню
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success / VietQR Payment Dialog */}
      <AnimatePresence>
        {completedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#1a1b1e] border border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-bold text-white">Заказ #{completedOrder.orderId} принят!</h3>
              
              {/* Battery Charge Success Soundbite */}
              <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-3 text-xs text-emerald-300 space-y-1">
                <div className="font-black text-white flex items-center justify-center gap-1.5">
                  <span>🔋</span> Батарея заряжена на максимум!
                </div>
                <p className="text-[11px] text-gray-300 leading-tight">
                  Спасибо за заказ сегодня! Ваша скидка на следующий заказ — {maxPossibleDiscount}%! Повторите заказ завтра, чтобы не потерять её!
                </p>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Ресторан уже начал приготовление вашего заказа. Наш курьер свяжется с вами по номеру {completedOrder.customer?.phone}.
              </p>

              {/* VietQR Display if applicable */}
              {completedOrder.paymentMethod === 'vietqr' && completedOrder.totalPayable > 0 && vietQrUrl && (
                <div className="bg-white p-3 rounded-2xl shadow-xl space-y-2 text-black">
                  <img src={vietQrUrl} alt="VietQR" className="w-full aspect-square object-contain mx-auto" />
                  <p className="text-[11px] font-bold text-gray-700">
                    Отсканируйте в любом банковском приложении Вьетнама для мгновенной оплаты
                  </p>
                </div>
              )}

              {/* Deposit Deduction Status Chip */}
              {completedOrder.depositDeducted > 0 && (
                <div className={`rounded-xl p-3 text-xs border text-left space-y-1 ${
                  completedOrder.depositStatus === 'approved'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span>💰 Списание с депозита: {formatPrice(completedOrder.depositDeducted, completedOrder.currency)}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-black bg-black/40">
                      {completedOrder.depositStatus === 'approved' ? '✓ Списано' : '⏳ Ожидает подтверждения'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {completedOrder.depositStatus === 'approved'
                      ? `Сотрудник заведения ${completedOrder.depositDeductedBy ? `(${completedOrder.depositDeductedBy})` : ''} подтвердил заказ и списал депозит.`
                      : 'Сотрудник заведения спишет эту сумму с вашего депозита при подтверждении заказа.'}
                  </p>
                </div>
              )}

              <div className="bg-[#202124] rounded-xl p-3 text-xs text-left text-gray-300 space-y-1">
                <div>Сумма: <span className="font-bold text-white">{formatPrice(completedOrder.totalPayable, completedOrder.currency)}</span></div>
                <div>Тип: <span className="font-bold text-white">{completedOrder.deliveryType === 'delivery' ? '🚗 Доставка' : '🛍️ Самовывоз'}</span></div>
                <div>Адрес: <span className="font-bold text-white">{completedOrder.customer?.address}</span></div>
              </div>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full py-3 rounded-xl bg-emerald-400 text-black font-black text-xs shadow-lg active:scale-95 transition-all"
              >
                Отлично, понятно
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Fullscreen Overlay */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <motion.div 
            ref={modalContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-start p-0 backdrop-blur-md select-none overflow-hidden"
          >
            <button 
              className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors border border-white/20 shadow-2xl active:scale-90"
              onClick={() => { setIsPdfModalOpen(false); setZoomScale(1); }}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div 
              className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-6 px-2 space-y-4 touch-pan-y"
              onClick={(e) => e.stopPropagation()}
            >
              {pdfPages.length > 0 ? (
                <div 
                  className="w-full max-w-3xl flex flex-col items-center gap-3 transition-transform duration-75 origin-center my-auto"
                  style={{ transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)` }}
                >
                  {pdfPages.map((pageUrl, idx) => (
                    <img 
                      key={idx} 
                      src={pageUrl} 
                      alt={`PDF Page ${idx + 1}`} 
                      className="w-full object-contain rounded-xl shadow-2xl bg-white" 
                    />
                  ))}
                </div>
              ) : pdfLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-amber-400 space-y-3 p-8">
                  <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold">Загрузка страниц меню...</span>
                </div>
              ) : (
                <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col my-auto">
                  <iframe 
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(gmConfig.menuPdfUrl)}&embedded=true`}
                    className="w-full flex-grow border-0"
                    title="PDF Menu Fallback"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default GoogleMapsPreLanding;
