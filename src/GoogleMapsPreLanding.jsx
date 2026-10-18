import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { doc, getDoc, query, collection, where, getDocs, setDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { logVenueClick } from './logic/analytics';
import { RewardCalculator } from './logic/RewardCalculator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faTelegram, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';

// Helpers for balance & currency
const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
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

      const [startH, startM] = (rule.startHour || '00:00').split(':').map(Number);
      const [endH, endM] = (rule.endHour || '23:59').split(':').map(Number);
      const startDec = (startH || 0) + (startM || 0) / 60;
      const endDec = (endH || 24) + (endM || 0) / 60;

      if (currentDecimalHour >= startDec && currentDecimalHour <= endDec) {
        return rule;
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [authTriggerReason, setAuthTriggerReason] = useState('manual');
  const [depositBalance, setDepositBalance] = useState(0);

  // Discount Calculation State
  const [personalDiscount, setPersonalDiscount] = useState(5);
  const [activeHappyHour, setActiveHappyHour] = useState(null);
  const [userTierStatus, setUserTierStatus] = useState('new');

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
          setVenue(docSnap.data());
        } else {
          const qSlug = query(collection(db, 'venues'), where('slug', '==', venueId));
          const qSlugSnap = await getDocs(qSlug);
          if (!qSlugSnap.empty) {
            setVenue(qSlugSnap.docs[0].data());
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

  // Auth State Listener & Deposit Snapshot
  useEffect(() => {
    let unsubUserDoc = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Subscribe to user doc for live deposit balance & discount tier
        unsubUserDoc = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile(data);
            if (data.name && !guestName) {
              setGuestName(data.name);
              safeStorage.setItem('guestName', data.name);
            }
            if (data.phone && !guestPhone) {
              setGuestPhone(data.phone);
              safeStorage.setItem('guestPhone', data.phone);
            }

            // Extract deposit balance for this venue
            let bal = 0;
            if (data.deposit_balances && venueId && data.deposit_balances[venueId] !== undefined) {
              bal = parseBalance(data.deposit_balances[venueId]);
            } else if (data.deposit_balance !== undefined && Number(data.deposit_balance) > 0) {
              bal = parseBalance(data.deposit_balance);
            }
            setDepositBalance(bal);
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
  }, [venueId, guestName, guestPhone]);

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

  // Compute Active Loyalty Discount using RewardCalculator
  useEffect(() => {
    if (!venue) return;

    // Check if venue has custom delivery tiers or uses offline loyaltyConfig
    let activeConfig = venue.loyaltyConfig || venue.tiers;
    if (deliveryLoyaltyConfig.useCustomDeliveryTiers) {
      activeConfig = {
        percBase: Number(deliveryLoyaltyConfig.percBase ?? 5),
        percDecay1: Number(deliveryLoyaltyConfig.percMedium ?? 15),
        percVip: Number(deliveryLoyaltyConfig.percVip ?? 20),
        percDeposit: Number(deliveryLoyaltyConfig.percDeposit ?? 25),
        vipWindowDays: Number(deliveryLoyaltyConfig.vipWindowDays ?? 1),
        tier1DecayDays: Number(deliveryLoyaltyConfig.mediumDays ?? 7),
      };
    }

    const now = new Date();
    const hasLockedDeposit = (userProfile?.hasLockedDiscount || false) && depositBalance > 0;

    const calcResult = RewardCalculator.calculate(
      null, // In pre-landing/delivery initial view, calculate based on user or fallback
      now,
      activeConfig,
      venueTimezone,
      false,
      hasLockedDeposit,
      deliveryLoyaltyConfig.percBase || 5,
      depositBalance
    );

    setPersonalDiscount(calcResult.discount);
    setUserTierStatus(calcResult.status);
  }, [venue, deliveryLoyaltyConfig, userProfile, depositBalance, venueTimezone]);

  // Calculate Max Pre-Login Discount
  const maxPossibleDiscount = useMemo(() => {
    let max = 20;
    if (deliveryLoyaltyConfig.useCustomDeliveryTiers) {
      max = Number(deliveryLoyaltyConfig.percVip ?? 20);
    } else if (venue) {
      const config = venue.loyaltyConfig || venue.tiers;
      if (Array.isArray(config)) {
        const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
        if (percs.length > 0) max = Math.max(...percs);
      } else if (config && config.percVip) {
        max = Number(config.percVip);
      }
    }
    if (activeHappyHour?.discountBonus) {
      max += Number(activeHappyHour.discountBonus);
    }
    return max;
  }, [venue, deliveryLoyaltyConfig, activeHappyHour]);

  // Calculate Effective User Discount (Personal + Happy Hour + Pickup Bonus)
  const isUserIdentified = Boolean(user && (guestName || guestPhone || userProfile?.name || userProfile?.phone));
  const happyHourBonus = activeHappyHour?.discountBonus ? Number(activeHappyHour.discountBonus) : 0;
  const pickupBonus = (deliveryType === 'pickup' && deliveryLoyaltyConfig?.pickupBonusDiscount) 
    ? Number(deliveryLoyaltyConfig.pickupBonusDiscount) 
    : 0;

  const currentDiscountRate = isUserIdentified 
    ? (personalDiscount + happyHourBonus + pickupBonus)
    : 0; // Guest without login sees preview prices

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

  // Quick Auth / Login handler
  const handleQuickLogin = async (e) => {
    if (e) e.preventDefault();
    if (!guestPhone.trim() && !guestName.trim()) {
      alert("Пожалуйста, введите телефон или имя");
      return;
    }

    try {
      let currentUid = user?.uid;
      if (!currentUid) {
        const cred = await signInAnonymously(auth);
        currentUid = cred.user.uid;
        setUser(cred.user);
      }

      const userData = {
        name: guestName.trim() || 'Гость',
        phone: guestPhone.trim() || '',
        updatedAt: serverTimestamp(),
        lastVisitVenueId: venueId
      };

      await setDoc(doc(db, 'users', currentUid), userData, { merge: true });
      safeStorage.setItem('guestName', guestName.trim());
      safeStorage.setItem('guestPhone', guestPhone.trim());

      // If user clicked on a dish before login, automatically add it now
      if (pendingCartItem) {
        const id = pendingCartItem.id || pendingCartItem.name;
        setCart(prev => {
          const existing = prev[id];
          const count = (existing?.count || 0) + 1;
          return { ...prev, [id]: { item: pendingCartItem, count } };
        });
        setPendingCartItem(null);
      }

      setIsAuthModalOpen(false);
    } catch (err) {
      console.warn("Login fallback note:", err);
      safeStorage.setItem('guestName', guestName.trim());
      safeStorage.setItem('guestPhone', guestPhone.trim());
      if (pendingCartItem) {
        const id = pendingCartItem.id || pendingCartItem.name;
        setCart(prev => ({ ...prev, [id]: { item: pendingCartItem, count: 1 } }));
        setPendingCartItem(null);
      }
      setIsAuthModalOpen(false);
    }
  };

  const handleLogout = () => {
    safeStorage.setItem('guestName', '');
    safeStorage.setItem('guestPhone', '');
    setGuestName('');
    setGuestPhone('');
    setUserProfile(null);
    setCart({});
    setIsProfileModalOpen(false);
  };

  // Submit Direct Delivery Order
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cartCount === 0) return;
    if (!guestName || !guestPhone) {
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
          name: guestName,
          phone: guestPhone,
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
            {!isUserIdentified ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingCartItem(null);
                  setAuthTriggerReason('header');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#303134] hover:bg-[#3C4043] active:scale-95 border border-[#5F6368]/70 hover:border-emerald-500/70 rounded-full pl-2 pr-2.5 py-1 text-white shadow-sm transition-all"
                title="Войти для активации скидки"
              >
                {/* Mini Battery Graphic */}
                <div className="flex items-center">
                  <div className="w-5 h-3 border-[1.5px] border-emerald-400 rounded-[3px] p-[1px] bg-black/60 flex items-center shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                    <div 
                      className="h-full bg-emerald-400 rounded-[1px] shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                      style={{ width: '85%' }}
                    />
                  </div>
                  <div className="w-[2px] h-[4px] bg-emerald-400 rounded-r-[1px] -ml-[0.5px]" />
                </div>

                {/* Discount Value ДО X% */}
                <span className="text-emerald-400 font-extrabold text-[11px] tracking-tight whitespace-nowrap">
                  до {maxPossibleDiscount}%
                </span>

                {/* Login Button Pill */}
                <span className="bg-[#83E1D9] text-[#003833] font-black text-[10px] px-2 py-0.5 rounded-full uppercase ml-0.5 shadow-sm whitespace-nowrap">
                  Войти
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#303134] hover:bg-[#3C4043] active:scale-95 border border-emerald-500/50 rounded-full pl-2 pr-2.5 py-1 text-white shadow-sm transition-all"
                title="Ваш профиль и скидка"
              >
                {/* Mini Battery Graphic with active charge level */}
                <div className="flex items-center">
                  <div className="w-5 h-3 border-[1.5px] border-emerald-400 rounded-[3px] p-[1px] bg-black/60 flex items-center shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                    <div 
                      className="h-full bg-emerald-400 rounded-[1px] shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      style={{ width: `${Math.min(100, Math.max(30, (currentDiscountRate / maxPossibleDiscount) * 100))}%` }}
                    />
                  </div>
                  <div className="w-[2px] h-[4px] bg-emerald-400 rounded-r-[1px] -ml-[0.5px]" />
                </div>

                {/* Current discount */}
                <span className="text-emerald-300 font-black text-[11px] whitespace-nowrap">
                  -{currentDiscountRate}%
                </span>

                {/* User name / badge */}
                <span className="text-gray-200 font-semibold text-[11px] truncate max-w-[65px] sm:max-w-[90px]">
                  {guestName || 'Гость'}
                </span>
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

      {/* Dynamic Discount & Customer Loyalty Bar */}
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
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Прямой заказ
                </span>
                <span className="text-emerald-400 font-extrabold text-xs">
                  Скидка ДО {maxPossibleDiscount}%
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">
                Дешевле, чем в Grab и Zomato. Войдите, чтобы активировать персональную скидку и оплату депозитом!
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
              Войти
            </button>
          </div>
        ) : (
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="cursor-pointer bg-gradient-to-r from-neutral-900 to-[#202124] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-3.5 shadow-lg flex items-center justify-between gap-2 active:scale-[0.99] transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-white text-xs font-bold truncate max-w-[150px]">
                  {guestName || 'Гость'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  -{currentDiscountRate}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-300">
                {depositBalance > 0 && (
                  <span className="text-amber-300 font-semibold">
                    💰 Депозит: {formatPrice(depositBalance, venueCurrency)}
                  </span>
                )}
                {activeHappyHour && (
                  <span className="text-orange-400 font-bold flex items-center gap-1">
                    ⚡ {activeHappyHour.name} (+{activeHappyHour.discountBonus}%)
                  </span>
                )}
              </div>
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
                      className="bg-[#202124] border border-[#3C4043] hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col"
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
                          <div>
                            {countInCart === 0 ? (
                              <button 
                                onClick={() => addToCart(item)}
                                className="bg-[#83E1D9] hover:bg-[#68c9c0] active:scale-95 text-[#003833] font-black text-xs px-3 py-2 rounded-xl shadow-md transition-all flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                В заказ
                              </button>
                            ) : (
                              <div className="flex items-center bg-[#2b2d30] border border-emerald-500/50 rounded-xl overflow-hidden p-0.5 shadow-md">
                                <button 
                                  onClick={() => removeFromCart(item)}
                                  className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-700 rounded-lg text-sm font-bold active:scale-90"
                                >
                                  -
                                </button>
                                <span className="px-2.5 text-xs font-black text-emerald-400">
                                  {countInCart}
                                </span>
                                <button 
                                  onClick={() => addToCart(item)}
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

      {/* Quick Phone / Login Modal (with Service & Dynamic Discount info) */}
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
                    Прямой заказ • Скидка до {maxPossibleDiscount}%
                  </span>
                </div>
                <h3 className="text-lg font-black text-white pt-1">
                  Заказ онлайн напрямую
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Без наценок агрегаторов (Grab, Glovo, Zomato). Ваша персональная скидка растет с каждым заказом!
                </p>
              </div>

              {/* Service & Discount Highlights */}
              <div className="bg-[#26282c] border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">✨</span>
                  <span className="text-gray-300 text-[11.5px] leading-snug">
                    <strong className="text-white">Честные цены:</strong> Напрямую от заведения, дешевле агрегаторов до 20–30%.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">🔋</span>
                  <span className="text-gray-300 text-[11.5px] leading-snug">
                    <strong className="text-emerald-400">Динамическая скидка:</strong> Растет до {maxPossibleDiscount}% при регулярных заказах.
                  </span>
                </div>
                {venue?.hasDepositSystem && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">💳</span>
                    <span className="text-gray-300 text-[11.5px] leading-snug">
                      <strong className="text-amber-300">Депозит:</strong> Оплачивайте доставку средствами своего баланса.
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

              {/* Auth Form */}
              <form onSubmit={handleQuickLogin} className="space-y-3 pt-1">
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

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Войти и заказать со скидкой</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingCartItem(null);
                      setIsAuthModalOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-gray-400 hover:text-white font-medium text-xs transition-colors"
                  >
                    Продолжить просмотр меню
                  </button>
                </div>
              </form>
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
                    {(guestName || 'G')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{guestName || 'Гость'}</h3>
                    <p className="text-xs text-gray-400">{guestPhone || 'Телефон не указан'}</p>
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
                  <span className="text-xs text-gray-300 font-medium">Ваша скидка онлайн:</span>
                  <span className="text-emerald-400 font-black text-base">-{currentDiscountRate}%</span>
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
                  Сменить номер
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
