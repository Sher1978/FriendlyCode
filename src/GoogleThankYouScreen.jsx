import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faArrowLeft, faMapLocationDot, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import UserMenu from './UserMenu';
import ScanInstructionAnimation from './ScanInstructionAnimation';

const safeStorage = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const GoogleThankYouScreen = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [venueName, setVenueName] = useState('');
    const [venueAddress, setVenueAddress] = useState('');
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [guestName, setGuestName] = useState(() => {
        const params = new URLSearchParams(location.search);
        return location.state?.guestName || params.get('guestName') || safeStorage.getItem('guestName') || 'Guest';
    });
    
    const [discountValue, setDiscountValue] = useState(() => {
        const params = new URLSearchParams(location.search);
        const stateValue = location.state?.discountValue ?? params.get('discount');
        if (stateValue !== undefined && stateValue !== null && !isNaN(Number(stateValue)) && Number(stateValue) > 0) {
            return Number(stateValue);
        }
        const cached = parseInt(safeStorage.getItem('currentDiscount'));
        return (!isNaN(cached) && cached > 0) ? cached : 10;
    });

    const [ambientColor, setAmbientColor] = useState('#00FF41');
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const getTierColor = (val) => {
            if (val >= 20) return '#00FF41';
            if (val >= 10) return '#FFD700';
            return '#FFAA00';
        };
        setAmbientColor(getTierColor(discountValue));
    }, [discountValue]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const venueId = params.get('venueId') || location.state?.venueId || safeStorage.getItem('currentVenueId') || 'unknown';

        if (venueId && venueId !== 'unknown') {
            getDoc(doc(db, 'venues', venueId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setVenueName(data.name || 'Заведение');
                    setVenueAddress(data.address || '');
                    setGoogleMapsUrl(data.googleMapsUrl || data.googleMapsLink || data.linkUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name || 'restaurant')}`);

                    const savedLang = safeStorage.getItem('userLanguage');
                    const targetLang = savedLang || data.defaultLanguage || 'en';
                    if (i18n.language !== targetLang) i18n.changeLanguage(targetLang);
                    
                    setIsDataLoaded(true);
                } else {
                    setIsDataLoaded(true);
                }
            }).catch(() => {
                setIsDataLoaded(true);
            });
        } else {
            setIsDataLoaded(true);
        }
    }, [i18n]);

    const handleCopyAddress = () => {
        const textToCopy = venueAddress || googleMapsUrl || venueName;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            alert('Скопировано: ' + textToCopy);
        }
    };

    if (!isDataLoaded) {
        return (
            <div className="flex flex-col min-h-screen bg-black font-sans items-center justify-center relative">
                 <div className="w-12 h-12 border-4 border-[#00FF41]/30 border-t-[#00FF41] rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,65,0.3)]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white antialiased overflow-hidden relative" style={{ WebkitFontSmoothing: 'antialiased' }}>
            
            {/* Ambient Ambient Glow */}
            <div className="absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.25] mix-blend-screen" style={{ backgroundColor: ambientColor }} />
            <div className="absolute bottom-[10%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.15]" style={{ backgroundColor: ambientColor }} />

            {/* Header / Nav */}
            <div className="pt-6 px-6 flex justify-between items-center z-50 w-full max-w-md mx-auto">
                <UserMenu 
                    user={auth.currentUser}
                    isGuestView={true}
                    venueColor={ambientColor}
                    trigger={
                        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-xl border border-white/10 cursor-pointer active:scale-95 transition-all text-white">
                            <FontAwesomeIcon icon={faUser} className="text-xs text-white/70" />
                            <span className="text-[12px] font-bold tracking-wide text-white truncate max-w-[120px]">{guestName}</span>
                        </div>
                    }
                />
            </div>

            <div className="flex-grow flex flex-col items-center justify-start pt-12 px-6 relative z-10 w-full max-w-md mx-auto -mt-4 pb-20">
                {/* Greeting */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-2"
                >
                    <h1 className="text-[24px] font-bold tracking-tight leading-tight mb-1 text-white">
                        {t('thanks_for_visiting', { name: guestName, defaultValue: `Спасибо,\n${guestName}!` })}
                    </h1>
                </motion.div>

                {/* Card: Discount % + Battery */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`w-full bg-[#1C1C1E]/60 backdrop-blur-[40px] rounded-[32px] p-6 text-center shadow-2xl border border-white/10 relative overflow-hidden`}
                >
                    <div className="absolute inset-0 border border-white/5 rounded-[32px] pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <span className="relative z-10 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                        {t('current_discount', 'ТЕКУЩАЯ СКИДКА')}
                    </span>

                    <div className="relative z-10 my-4">
                        <span className="text-[72px] font-bold leading-none text-white tracking-tighter" style={{ textShadow: `0 0 40px ${ambientColor}` }}>
                            {discountValue}%
                        </span>
                        <span className="block text-[12px] font-bold text-white/40 uppercase tracking-widest mt-1">
                            {t('off_total_bill', { defaultValue: 'СКИДКА ОТ ОБЩЕГО СЧЕТА' })}
                        </span>
                    </div>

                    <div className="mt-6 relative z-10">
                        <div className="h-[220px] relative flex justify-center items-center transition-all duration-300">
                            <ScanInstructionAnimation ambientColor={ambientColor} discountValue={discountValue} />
                        </div>
                    </div>
                </motion.div>

                {/* Instruction */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center text-[12px] font-medium text-white/50 mt-4 max-w-[280px] leading-relaxed mb-8"
                >
                    {t('show_counter_instruction', 'Покажите этот экран кассиру при оплате заказа')}
                </motion.p>
                
                {/* Additional Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full mt-auto"
                >
                    <div className="text-center mb-4">
                        <span className="text-[14px] font-black uppercase tracking-widest text-white/90">
                            БУДЕМ РАДЫ ВИДЕТЬ ВАС!
                        </span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => window.open(googleMapsUrl, '_blank')}
                            className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#00FF41] to-[#00CC33] text-black font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,65,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <FontAwesomeIcon icon={faMapLocationDot} className="text-lg" />
                            МАРШРУТ
                        </button>
                        
                        <button 
                            onClick={handleCopyAddress}
                            className="w-full py-4 rounded-[18px] bg-white/10 hover:bg-white/15 text-white font-bold text-sm uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-white/70" />
                            {copied ? 'СКОПИРОВАНО' : 'АДРЕС'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default GoogleThankYouScreen;
