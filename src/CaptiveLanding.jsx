import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faGift, faShieldAlt, faBolt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { RewardCalculator } from './logic/RewardCalculator';
import PngBattery, { getBatteryConfig } from './PngBattery';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const CaptiveLanding = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const [status, setStatus] = useState('loading');
    const [venue, setVenue] = useState(null);
    const [discount, setDiscount] = useState(5);
    const [clientMac, setClientMac] = useState('');
    const [loginUrl, setLoginUrl] = useState('');
    const [continueUrl, setContinueUrl] = useState('');
    const [userRole, setUserRole] = useState('guest');
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        
        // Parse router hotspot params (MikroTik, Keenetic, UniFi, Omada, Meraki, standard WISPr)
        const rawId = searchParams.get('venue_id') || searchParams.get('id') || searchParams.get('v') || 'default_venue';
        const mac = searchParams.get('client_mac') || searchParams.get('mac') || searchParams.get('id_mac') || '';
        const gatewayLogin = searchParams.get('login_url') || searchParams.get('link-login') || searchParams.get('auth_action') || '';
        const dstUrl = searchParams.get('continue_url') || searchParams.get('dst') || searchParams.get('redirect') || '';

        setClientMac(mac);
        setLoginUrl(gatewayLogin);
        setContinueUrl(dstUrl);

        if (mac) safeStorage.setItem('captiveClientMac', mac);
        try {
            sessionStorage.setItem('is_captive_redirect', 'true');
        } catch (e) {
            console.warn(e);
        }

        const safetyTimeout = setTimeout(() => {
            if (status === 'loading') setStatus('error');
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.error("Auth failed:", e);
                    setStatus('error');
                }
                return;
            }

            clearTimeout(safetyTimeout);

            try {
                const venueId = rawId.startsWith('3D') ? rawId.substring(2) : rawId;
                const venueRef = doc(db, 'venues', venueId);
                const userRef = doc(db, 'users', user.uid);

                const [venueSnap, userSnap] = await Promise.all([
                    getDoc(venueRef),
                    getDoc(userRef)
                ]);

                let venueData = venueSnap.exists() ? venueSnap.data() : null;
                let activeVenueId = venueId;

                // Fallback slug search if Doc ID didn't match
                if (!venueData) {
                    const qSlug = query(collection(db, 'venues'), where('slug', '==', venueId));
                    const qSlugSnap = await getDocs(qSlug);
                    if (!qSlugSnap.empty) {
                        venueData = qSlugSnap.docs[0].data();
                        activeVenueId = qSlugSnap.docs[0].id;
                    }
                }

                if (!venueData) {
                    console.error(`Venue not found: ${venueId}`);
                    setStatus('error');
                    return;
                }

                safeStorage.setItem('currentVenueId', activeVenueId);
                setVenue({ id: activeVenueId, ...venueData });

                // Language init
                const savedLang = safeStorage.getItem('userLanguage');
                const targetLang = savedLang || venueData.defaultLanguage || 'en';
                if (i18n.language !== targetLang) i18n.changeLanguage(targetLang);

                // User profile
                const userData = userSnap.exists() ? userSnap.data() : null;
                if (userData?.role) setUserRole(userData.role);
                const email = (userData?.email || safeStorage.getItem('guestEmail') || '').toLowerCase();

                // Calculate discount rate
                const tz = venueData.timezone || 'Asia/Dubai';
                const now = new Date();
                let calculatedRate = Number(venueData.loyaltyConfig?.percBase ?? 5);

                if (email) {
                    const qVisits = query(
                        collection(db, 'visits'),
                        where('guestEmail', '==', email),
                        where('venueId', '==', activeVenueId)
                    );
                    const vSnap = await getDocs(qVisits);
                    if (!vSnap.empty) {
                        const sorted = vSnap.docs
                            .map(d => d.data().timestamp?.toDate())
                            .filter(Boolean)
                            .sort((a, b) => b - a);
                        
                        if (sorted.length > 0) {
                            const lastStr = RewardCalculator.getVenueDateString(sorted[0], tz);
                            const calc = RewardCalculator.calculate(lastStr, now, venueData.loyaltyConfig, tz, false);
                            calculatedRate = calc.discount;
                        }
                    }
                }

                setDiscount(calculatedRate);
                safeStorage.setItem('currentDiscount', String(calculatedRate));
                setStatus('ready');

            } catch (err) {
                console.error("Captive init error:", err);
                setStatus('error');
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, [location]);

    const handleConnectAndReward = async () => {
        if (!venue || isConnecting) return;
        setIsConnecting(true);

        const guestEmail = safeStorage.getItem('guestEmail') || '';
        const guestName = safeStorage.getItem('guestName') || 'Гость REVOO';

        try {
            // Record captive connection intent
            await addDoc(collection(db, 'visits'), {
                venueId: venue.id,
                userId: auth.currentUser?.uid || 'anon',
                guestEmail: guestEmail.toLowerCase(),
                guestName,
                discount,
                clientMac: clientMac || safeStorage.getItem('captiveClientMac') || 'unknown',
                source: 'wifi_captive',
                timestamp: serverTimestamp()
            });

            // Trigger POST /api/wifi/authorize
            try {
                await fetch('/api/wifi/authorize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mac: clientMac || safeStorage.getItem('captiveClientMac') || 'unknown',
                        venueId: venue.id,
                        discount: discount
                    })
                });
            } catch (authApiErr) {
                console.error("Failed to post /api/wifi/authorize:", authApiErr);
            }

            // Target destination: redirect to active Loyalty Dashboard
            window.location.href = `/test?id=${venue.id}`;
        } catch (e) {
            console.error("Error saving wifi session:", e);
            // Navigate fallback
            window.location.href = `/test?id=${venue.id}`;
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white text-center">
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <FontAwesomeIcon icon={faWifi} className="text-6xl text-[#D4AF37] mb-6 drop-shadow-[0_0_25px_rgba(212,175,55,0.6)]" />
                </motion.div>
                <h2 className="text-xl font-bold tracking-wider uppercase mb-2">Обнаружена сеть Free_WiFi_Revoo</h2>
                <p className="text-white/40 text-sm animate-pulse">Безопасная авторизация...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-white text-center">
                <FontAwesomeIcon icon={faShieldAlt} className="text-5xl text-red-500 mb-4" />
                <h1 className="text-lg font-bold mb-2">Ошибка доступа к порталу</h1>
                <p className="text-white/50 text-sm mb-6 max-w-xs">Перезагрузите страницу или обратитесь к персоналу заведения.</p>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white text-black font-bold rounded-2xl">Повторить</button>
            </div>
        );
    }

    const batCfg = getBatteryConfig(discount >= 20 ? 100 : discount >= 15 ? 50 : discount >= 10 ? 25 : 10);

    const isReturning = !!guestName || !!safeStorage.getItem('guestName') || !!safeStorage.getItem('guestEmail');
    const lang = i18n.language?.startsWith('ru') ? 'ru' : (i18n.language?.startsWith('vi') ? 'vi' : 'en');

    const valueProps = {
        new: {
            ru: `Добро пожаловать в ${venue?.name || 'наше заведение'}! Подключитесь к нашему высокоскоростному Wi-Fi и мгновенно активируйте стартовую скидку 5%.`,
            en: `Welcome to ${venue?.name || 'our venue'}! Connect to our high-speed Wi-Fi and instantly activate your 5% starter discount.`,
            vi: `Chào mừng bạn đến với ${venue?.name || 'địa điểm của chúng tôi'}! Kết nối với Wi-Fi tốc độ cao của chúng tôi và kích hoạt ngay chiết khấu khởi điểm 5%.`
        },
        returning: {
            ru: `С возвращением в ${venue?.name || 'наше заведение'}! Нажмите кнопку ниже, чтобы автоматически восстановить сессию Wi-Fi и применить ваш текущий статус лояльности (${discount}%).`,
            en: `Welcome back to ${venue?.name || 'our venue'}! Click the button below to automatically restore your Wi-Fi session and apply your current loyalty status (${discount}%).`,
            vi: `Chào mừng bạn trở lại với ${venue?.name || 'địa điểm của chúng tôi'}! Nhấp vào nút bên dưới để tự động khôi phục phiên Wi-Fi của bạn và áp dụng trạng thái trung thành hiện tại của bạn (${discount}%).`
        },
        badge: {
            ru: "✨ Работает на Revoo Dubai Tech",
            en: "✨ Powered by Revoo Dubai Tech",
            vi: "✨ Được cung cấp bởi Revoo Dubai Tech"
        },
        cta: {
            ru: "ПОДКЛЮЧИТЬСЯ К БЕСПЛАТНОМУ WI-FI",
            en: "CONNECT TO FREE WI-FI",
            vi: "KẾT NỐI WI-FI MIỄN PHÍ"
        },
        subtext: {
            ru: "Нажимая кнопку, вы принимаете условия предоставления услуг заведения",
            en: "By clicking the button, you accept the terms of service of the venue",
            vi: "Bằng cách nhấp vào nút, bạn đồng ý với các điều khoản dịch vụ của địa điểm"
        }
    };

    const valueText = isReturning ? valueProps.returning[lang] : valueProps.new[lang];
    const badgeText = valueProps.badge[lang];
    const ctaText = valueProps.cta[lang];
    const footerText = valueProps.subtext[lang];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-[100svh] bg-black font-sans text-white antialiased relative overflow-x-hidden p-6 justify-between animate-fadeIn"
        >
            {/* Ambient Background Neon Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[50vh] rounded-full blur-[110px] opacity-25 mix-blend-screen" style={{ backgroundColor: batCfg.fillColor }} />
                <div className="absolute bottom-[-10%] right-[-20vw] w-[140vw] h-[50vh] rounded-full blur-[130px] opacity-15" style={{ backgroundColor: batCfg.fillColor }} />
            </div>

            {/* Top Bar / Header Section */}
            <div className="relative z-10 flex flex-col items-center pt-6 text-center">
                {/* Premium Glassmorphic Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#00FF41]">
                        {badgeText}
                    </span>
                </div>
                
                {/* Venue Logo */}
                <img 
                    src={venue?.logoUrl || "/revoo-logo.png"} 
                    className="h-[90px] w-auto object-contain mb-4 rounded-2xl" 
                    onError={(e) => { e.target.src = "/revoo-logo.png"; }}
                    alt="Logo" 
                />
                
                {/* Venue Name */}
                <h1 className="text-3xl font-black tracking-tight text-white/90 leading-tight">
                    {venue?.name || 'Заведение партнер REVOO'}
                </h1>
            </div>

            {/* Center Value Proposition Card */}
            <div className="relative z-10 my-auto py-6 flex flex-col items-center w-full max-w-sm mx-auto">
                <div className="w-full bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    
                    <p className="text-sm font-semibold text-white/80 leading-relaxed">
                        {valueText}
                    </p>

                    <div className="mt-6 scale-95 pointer-events-none">
                        <PngBattery discount={discount} />
                    </div>
                </div>
            </div>

            {/* Bottom Action CTA Button */}
            <div className="relative z-10 w-full max-w-sm mx-auto pb-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConnectAndReward}
                    disabled={isConnecting}
                    className="w-full h-16 rounded-[22px] font-black text-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(255,255,255,0.2)] transition-all"
                    style={{ backgroundColor: '#FFFFFF' }}
                >
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-emerald-500"
                    >
                        <FontAwesomeIcon icon={faWifi} className="text-lg" />
                    </motion.div>
                    <span>{isConnecting ? '...' : ctaText}</span>
                </motion.button>
                <p className="text-[10px] text-white/30 text-center mt-3 font-medium">
                    {footerText}
                </p>
            </div>
        </motion.div>
    );
};

export default CaptiveLanding;
