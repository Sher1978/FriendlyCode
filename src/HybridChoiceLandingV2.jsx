import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faGift, 
  faStar, 
  faCreditCard, 
  faRocket, 
  faGlobe, 
  faMapMarkerAlt 
} from '@fortawesome/free-solid-svg-icons';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import PngBattery from './PngBattery';
import giftxBox3D from './assets/giftx-box-3d.png';

const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const HybridChoiceLandingV2 = ({ venueData: propVenueData, venueId: propVenueId, onSelectRevo }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [venueData, setVenueData] = useState(propVenueData || null);
  const [activeVenueId, setActiveVenueId] = useState(propVenueId || '');

  useEffect(() => {
    let hasDeposit = false;
    try {
      const b = safeStorage.getItem('cached_deposit_balance');
      hasDeposit = b && Number(b) > 0;
    } catch (e) {}

    const searchParams = new URLSearchParams(location.search);
    const rawId = searchParams.get('id') || searchParams.get('v') || safeStorage.getItem('currentVenueId') || 'demo';
    const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;

    if (hasDeposit) {
      navigate(`/test?id=${venueId}`, { replace: true });
      return;
    }

    if (propVenueData && propVenueId) {
      setVenueData(propVenueData);
      setActiveVenueId(propVenueId);
      return;
    }

    setActiveVenueId(venueId);

    const cached = safeStorage.getItem(`venue_cache_${venueId}`);
    if (cached) {
      try { setVenueData(JSON.parse(cached)); } catch (e) {}
    }

    if (venueId && venueId !== 'demo') {
      getDoc(doc(db, 'venues', venueId)).then((snap) => {
        if (snap.exists()) {
          const v = snap.data();
          setVenueData(v);
          if (v.name) safeStorage.setItem('currentVenueName', v.name);
          safeStorage.setItem(`venue_cache_${venueId}`, JSON.stringify(v));
        }
      }).catch((err) => console.warn('Error fetching venue:', err));
    }
  }, [location, propVenueData, propVenueId]);

  // Set default language according to Venue Owner Cabinet settings (defaultLanguage field)
  useEffect(() => {
    if (venueData?.defaultLanguage) {
      const defLang = venueData.defaultLanguage.toLowerCase();
      const userSelected = safeStorage.getItem('userLanguage');
      if (!userSelected) {
        i18n.changeLanguage(defLang);
      }
    }
  }, [venueData, i18n]);

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || 'ru';
    const baseLang = current.substring(0, 2).toLowerCase();
    const cycle = { ru: 'en', en: 'vi', vi: 'ar', ar: 'ru' };
    const next = cycle[baseLang] || 'ru';
    i18n.changeLanguage(next);
    safeStorage.setItem('userLanguage', next);
  };

  const venueName = venueData?.name || venueData?.venueName || safeStorage.getItem('currentVenueName') || 'REVOO VENUE';
  const giftxUrl = venueData?.giftxUrl || 'https://giftx.app';

  const handleRevoClick = () => {
    if (onSelectRevo) {
      onSelectRevo();
    } else {
      navigate(`/qr?id=${activeVenueId}&bypass_hybrid=true`, { replace: true });
    }
  };

  const handleGiftxClick = () => {
    if (giftxUrl) {
      window.location.href = giftxUrl;
    } else {
      alert(t('hybrid_giftx_not_configured', 'GiftX ссылка не настроена заведением'));
    }
  };

  const langCode = (i18n.resolvedLanguage || i18n.language || 'ru').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-[#020205] text-amber-300 flex flex-col items-center justify-center p-2.5 sm:p-4 font-sans relative overflow-hidden select-none">
      
      {/* 🌌 Luxury Glassmorphism Ambient Orbs */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#00FF41]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FF2A85]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#FFD700]/12 rounded-full blur-[180px] pointer-events-none" />

      {/* iPhone Device Wrapper Frame */}
      <div className="w-full max-w-[430px] bg-[#08080E]/85 backdrop-blur-3xl border border-amber-400/25 rounded-[44px] shadow-[0_25px_100px_rgba(0,0,0,0.95),0_0_50px_rgba(255,215,0,0.12)] overflow-hidden flex flex-col relative z-10 my-auto">
        
        {/* Top Header Banner */}
        <div className="pt-4 pb-1 px-4 text-center relative bg-gradient-to-b from-[#14121C]/90 via-[#0E0C15]/80 to-[#08080E]/90 backdrop-blur-xl">
          {/* Lowered Language Switcher Badge (top-5 right-4) */}
          <button
            onClick={toggleLanguage}
            className="absolute top-5 right-4 px-3 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-full text-[10px] font-extrabold text-amber-300 flex items-center gap-1.5 transition-all shadow-md active:scale-95 backdrop-blur-md z-20"
          >
            <FontAwesomeIcon icon={faGlobe} className="text-amber-300 text-[11px]" />
            <span>{langCode}</span>
          </button>

          {/* Location Badge Icon */}
          <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.5)] border border-amber-300/50">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-black text-xs" />
          </div>

          {/* Venue Name Header Badge */}
          <div className="inline-block border border-amber-400/60 bg-black/80 backdrop-blur-xl px-5 py-1 rounded-2xl shadow-[0_0_25px_rgba(255,215,0,0.3)]">
            <h1 className="text-amber-300 font-black text-sm sm:text-base tracking-wider uppercase drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]">
              {venueName}
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-[10px] sm:text-xs font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] mt-1">
            {t('hybrid_welcome', 'РАДЫ ВИДЕТЬ ВАС!')}
          </p>
        </div>

        {/* 🟢 TOP & 🎁 BOTTOM CARDS STACK */}
        <div className="px-3.5 pt-1.5 pb-2.5 space-y-2.5 relative">

          {/* 🟢 REVO CARD */}
          <motion.div 
            onClick={handleRevoClick}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="w-full bg-gradient-to-b from-[#0D1C11]/90 via-[#09130C]/90 to-[#040805]/95 backdrop-blur-2xl border-2 border-[#00FF41]/40 rounded-[28px] p-3.5 shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:border-[#00FF41]/80 hover:shadow-[0_0_45px_rgba(0,255,65,0.4)] transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#00FF41]/10 rounded-full blur-3xl group-hover:bg-[#00FF41]/20 transition-all pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#0D2614]/80 backdrop-blur-md border border-[#00FF41]/50 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(0,255,65,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBolt} className="text-[#00FF41] text-xs" />
                <span className="font-black text-[#00FF41] text-xs tracking-wide">REVO</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9px] font-black text-[#00FF41]/90 uppercase tracking-wider">
                  {t('hybrid_revo_tag', 'СКИДКИ ЗА ЧАСТОТУ')}
                </span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-xs font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              {t('hybrid_revo_slogan', 'Чем чаще ходишь — тем выше скидка!')}
            </p>

            {/* 🔋 3D Battery Container */}
            <div className="h-[88px] my-0.5 flex items-center justify-center relative">
              <div 
                style={{ filter: 'drop-shadow(0 0 22px rgba(0,255,65,0.85))' }}
                className="w-full max-w-[235px] h-[82px] flex items-center justify-center scale-[0.86]"
              >
                <PngBattery capacity={100} />
              </div>
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faStar} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <span className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  {t('hybrid_revo_reviews', 'Подарки за отзывы')}
                </span>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faCreditCard} className="text-[#00FF41] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(0,255,65,0.6)]" />
                <span className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  {t('hybrid_revo_vip', 'V.I.P. статус за депозит')}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full py-3 bg-gradient-to-r from-[#00FF41] via-[#00DD38] to-[#00B32C] hover:brightness-110 text-black font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_22px_rgba(0,255,65,0.45)] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider">
              <FontAwesomeIcon icon={faBolt} className="text-black" />
              <span>{t('hybrid_open_revo', 'ИСПОЛЬЗОВАТЬ СКИДКУ')}</span>
            </div>
          </motion.div>

          {/* 🎁 GIFTX CARD */}
          <motion.div 
            onClick={handleGiftxClick}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="w-full bg-gradient-to-b from-[#240B1B]/90 via-[#160611]/90 to-[#0A0208]/95 backdrop-blur-2xl border-2 border-[#FFD700]/40 rounded-[28px] p-3.5 shadow-[0_0_30px_rgba(255,215,0,0.2)] hover:border-[#FFD700]/80 hover:shadow-[0_0_45px_rgba(255,215,0,0.4)] transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF2A85]/10 rounded-full blur-3xl group-hover:bg-[#FF2A85]/20 transition-all pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#330D25]/80 backdrop-blur-md border border-[#FFD700]/60 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(255,215,0,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs" />
                <span className="font-black text-[#FFD700] text-xs tracking-wide">GIFTX</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9px] font-black text-[#FF2A85] uppercase tracking-wider">
                  {t('hybrid_giftx_tag', 'ПОЛУЧАЙ ПОДАРКИ ЗА ВИЗИТ')}
                </span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-xs font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              {t('hybrid_giftx_slogan', 'Каждый оплаченный чек — твой подарок!')}
            </p>

            {/* 🎁 3D Gift Box: 5s Swell / 1.67s Shrink Scale Cycle + 10 Hz Axial Jitter (No X/Y Swinging) */}
            <div className="h-[104px] my-1 flex items-center justify-center relative">
              <motion.div
                animate={{
                  scale: [1.0, 1.18, 1.0],
                  filter: [
                    'drop-shadow(0 0 12px rgba(255,215,0,0.4))',
                    'drop-shadow(0 0 42px rgba(255,42,133,1.0))',
                    'drop-shadow(0 0 12px rgba(255,215,0,0.4))'
                  ]
                }}
                transition={{
                  duration: 6.67,
                  times: [0, 0.75, 1.0], // 5s swelling (75%), 1.67s shrink back (25%)
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center justify-center"
              >
                <motion.img
                  src={giftxBox3D}
                  alt="GiftX 3D Box"
                  animate={{
                    rotate: [0, 1.8, -2.3, 2.7, -1.4, 2.1, -2.8, 1.5, -2.0, 0]
                  }}
                  transition={{
                    duration: 0.2, // 2x slower smooth jitter (5 Hz instead of 10 Hz)
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ transformOrigin: "center center" }}
                  className="h-[98px] w-auto object-contain"
                />
              </motion.div>
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <span className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  {t('hybrid_giftx_perks', 'Подарки, бонусы, апгрейд')}
                </span>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faStar} className="text-[#FF2A85] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,42,133,0.6)]" />
                <span className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  {t('hybrid_giftx_places', 'В лучших заведениях города')}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full py-3 bg-gradient-to-r from-[#FFD700] via-[#FF2A85] to-[#E60067] hover:brightness-110 text-black font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_22px_rgba(255,215,0,0.45)] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider">
              <FontAwesomeIcon icon={faGift} className="text-black" />
              <span>{t('hybrid_open_giftx', 'ЗАБРАТЬ ПОДАРОК')}</span>
            </div>
          </motion.div>

        </div>

        {/* Bottom Technology Badge (Borderless Floating Text) */}
        <div className="py-2.5 px-3 text-center flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faRocket} className="text-amber-400 text-xs drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
          <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wide uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">
            {t('hybrid_no_download', 'БЕЗ СКАЧИВАНИЯ ПРИЛОЖЕНИЙ | ЧЕРЕЗ TELEGRAM')}
          </span>
        </div>

      </div>
    </div>
  );
};

export default HybridChoiceLandingV2;
