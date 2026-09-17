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
  faCocktail,
  faMobileAlt,
  faRocket,
  faGlobe,
  faMapMarkerAlt,
  faGem
} from '@fortawesome/free-solid-svg-icons';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import PngBattery from './PngBattery';
import HybridChoiceLandingV2 from './HybridChoiceLandingV2';
import giftxBox3D from './assets/giftx-box-3d.png';

const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const HybridChoiceLanding = (props) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const version = searchParams.get('version') || searchParams.get('v') || searchParams.get('layout');

  if (version !== '1' && version !== 'v1' && version !== 'horizontal') {
    return <HybridChoiceLandingV2 {...props} />;
  }

  const { venueData: propVenueData, venueId: propVenueId, onSelectRevo } = props;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [venueData, setVenueData] = useState(propVenueData || null);
  const [activeVenueId, setActiveVenueId] = useState(propVenueId || '');

  useEffect(() => {
    let hasDeposit = false;
    try {
      const b = safeStorage.getItem('cached_deposit_balance');
      hasDeposit = b && Number(b) > 0;
    } catch (e) { }

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
      try { setVenueData(JSON.parse(cached)); } catch (e) { }
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
    <div className="min-h-[100dvh] bg-[#030305] text-amber-300 flex flex-col items-center justify-center p-2 sm:p-4 font-sans relative overflow-hidden select-none">

      {/* 🌌 Revoo Business Landing Ambient Lighting */}
      <div className="absolute top-[-10%] left-1/4 -translate-x-1/2 w-[400px] h-[400px] bg-[#00FF41]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-1/4 translate-x-1/2 w-[400px] h-[400px] bg-[#FF2A85]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Container (iOS 26 Style Extra Rounded Shell: rounded-[44px]) */}
      <div className="w-full max-w-[430px] bg-[#0A0A0E]/85 backdrop-blur-3xl border border-amber-400/25 rounded-[44px] shadow-[0_0_80px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col relative z-10 my-auto">

        {/* Top Header Banner (NO DIVIDING LINE) */}
        <div className="pt-4 pb-3.5 px-4 text-center relative bg-gradient-to-b from-[#141218]/90 via-[#0D0B10]/80 to-[#0A0A0E]/90 backdrop-blur-xl">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="absolute top-3.5 right-3.5 px-3 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-full text-[10px] font-extrabold text-amber-300 flex items-center gap-1.5 transition-all shadow-md active:scale-95 backdrop-blur-md"
          >
            <FontAwesomeIcon icon={faGlobe} className="text-amber-300 text-[11px]" />
            <span>{langCode}</span>
          </button>

          {/* Location Badge */}
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.5)] border border-amber-300/50">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-black text-sm" />
          </div>

          {/* Venue Name Header Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block border border-amber-400/60 bg-black/80 backdrop-blur-xl px-5 py-1.5 rounded-2xl shadow-[0_0_25px_rgba(255,215,0,0.3)]"
          >
            <h1 className="text-amber-300 font-black text-sm sm:text-base tracking-wider uppercase drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]">
              {venueName}
            </h1>
          </motion.div>

          {/* Subtitle */}
          <p className="text-[10px] sm:text-xs font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] mt-1.5">
            РАДЫ ВИДЕТЬ ВАС!
          </p>
        </div>

        {/* 2-Column Symmetrical Grid */}
        <div className="p-3.5 grid grid-cols-2 gap-3">

          {/* 🟢 LEFT COLUMN: REVO (iOS 26 Rounded Card: rounded-[28px], Soft Blurred Green Glow Border) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRevoClick}
            className="relative bg-gradient-to-b from-[#0F1C12]/80 via-[#0A120C]/80 to-[#050806]/90 backdrop-blur-2xl border border-[#00FF41]/40 rounded-[28px] p-3 flex flex-col justify-between cursor-pointer shadow-[0_0_25px_rgba(0,255,65,0.2),inset_0_0_18px_rgba(0,255,65,0.08)] hover:border-[#00FF41]/80 hover:shadow-[0_0_40px_rgba(0,255,65,0.35)] transition-all group overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#00FF41]/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex flex-col flex-1">
              {/* Header Badge */}
              <div className="bg-[#0D2614]/80 border border-[#00FF41]/50 rounded-2xl p-1.5 mb-2 text-center shadow-[0_0_10px_rgba(0,255,65,0.25)] min-h-[38px] flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1.5 font-black text-[#00FF41] text-xs tracking-tight drop-shadow-[0_0_6px_rgba(0,255,65,0.6)]">
                  <FontAwesomeIcon icon={faBolt} className="text-[#00FF41]" />
                  <span>REVO</span>
                </div>
                <div className="text-[8px] font-black text-[#00FF41]/90 uppercase tracking-tighter mt-0.5">
                  СКИДКИ ЗА ПОСТОЯНСТВО
                </div>
              </div>

              {/* Slogan (Golden Yellow Font) */}
              <p className="text-[10px] font-black text-amber-300 leading-snug mb-2 text-center h-[28px] flex items-center justify-center drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">
                Чем чаще ходишь — тем выше скидка!
              </p>

              {/* 🔋 3D Visual Box: Animated Green Battery Container (rounded-[20px]) */}
              <div className="h-[105px] flex items-center justify-center relative overflow-hidden rounded-[20px] my-1 bg-black/40 backdrop-blur-xl border border-[#00FF41]/25 shadow-[inset_0_0_15px_rgba(0,255,65,0.15)]">
                <div className="w-full max-w-[145px] scale-100">
                  <PngBattery capacity={100} />
                </div>
              </div>

              {/* Symmetrical Feature Points (Golden Yellow Fonts) */}
              <div className="space-y-1.5 my-2 text-[10px] leading-tight flex-1 flex flex-col justify-center">
                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faStar} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    Подарки за отзывы
                  </div>
                </div>

                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faCreditCard} className="text-[#00FF41] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(0,255,65,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    V.I.P. статус за депозит
                  </div>
                </div>

                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faBolt} className="text-[#00FF41] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(0,255,65,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    Частота Визитов = <span className="text-[#00FF41]">Растущий %</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full py-2.5 bg-gradient-to-r from-[#00FF41] via-[#10B981] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs rounded-2xl shadow-[0_0_20px_rgba(0,255,65,0.4)] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider mt-1">
              <FontAwesomeIcon icon={faBolt} className="text-black" />
              <span>ОТКРЫТЬ REVO</span>
            </div>
          </motion.div>

          {/* 🎁 RIGHT COLUMN: GIFTX (iOS 26 Rounded Card: rounded-[28px], Soft Blurred Gold Glow Border) */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGiftxClick}
            className="relative bg-gradient-to-b from-[#220B19]/80 via-[#150610]/80 to-[#0A0207]/90 backdrop-blur-2xl border border-[#FFD700]/40 rounded-[28px] p-3 flex flex-col justify-between cursor-pointer shadow-[0_0_25px_rgba(255,215,0,0.2),inset_0_0_18px_rgba(255,215,0,0.08)] hover:border-[#FFD700]/80 hover:shadow-[0_0_40px_rgba(255,215,0,0.35)] transition-all group overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#FF2A85]/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex flex-col flex-1">
              {/* Header Badge */}
              <div className="bg-[#330D25]/80 border border-[#FFD700]/60 rounded-2xl p-1.5 mb-2 text-center shadow-[0_0_10px_rgba(255,215,0,0.25)] min-h-[38px] flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1.5 font-black text-[#FFD700] text-xs tracking-tight drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]">
                  <FontAwesomeIcon icon={faGift} className="text-[#FFD700]" />
                  <span>GIFTX</span>
                </div>
                <div className="text-[8px] font-black text-[#FF2A85] uppercase tracking-tighter mt-0.5">
                  ПОЛУЧАЙ ПОДАРКИ ЗА ВИЗИТ
                </div>
              </div>

              {/* Slogan (Golden Yellow Font) */}
              <p className="text-[10px] font-black text-amber-300 leading-snug mb-2 text-center h-[28px] flex items-center justify-center drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">
                Каждый оплаченный чек — твой подарок!
              </p>

              {/* 🎁 3D Visual Box: Static Imported 3D Gold Gift Box Container (rounded-[20px]) */}
              <div className="h-[105px] flex items-center justify-center relative overflow-hidden rounded-[20px] my-1 bg-black/40 backdrop-blur-xl border border-[#FFD700]/25 shadow-[inset_0_0_15px_rgba(255,215,0,0.15)]">
                <motion.img
                  src={giftxBox3D}
                  alt="GiftX 3D Box"
                  animate={{
                    rotate: [0, -3, 3, -3, 3, -1, 1, 0],
                    x: [0, -2, 2, -2, 2, -1, 1, 0],
                    y: [0, -2, 0, -2, 0],
                    filter: [
                      'drop-shadow(0 0 12px rgba(255,215,0,0.5))',
                      'drop-shadow(0 0 22px rgba(255,42,133,0.7))',
                      'drop-shadow(0 0 12px rgba(255,215,0,0.5))'
                    ]
                  }}
                  transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-[92px] w-auto object-contain drop-shadow-2xl"
                />
              </div>

              {/* Symmetrical Feature Points (Golden Yellow Fonts) */}
              <div className="space-y-1.5 my-2 text-[10px] leading-tight flex-1 flex flex-col justify-center">
                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    Подарки, бонусы, апгрейд
                  </div>
                </div>

                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faStar} className="text-[#FF2A85] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(255,42,133,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    В лучших заведениях города
                  </div>
                </div>

                <div className="bg-amber-400/[0.05] backdrop-blur-xl p-1.5 rounded-[16px] border border-amber-400/20 flex items-center gap-1.5 h-[34px]">
                  <FontAwesomeIcon icon={faGem} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]" />
                  <div className="text-amber-300 font-bold leading-none text-[9.5px]">
                    Награда за визит = <span className="text-[#FFD700]">Gold Box</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full py-2.5 bg-gradient-to-r from-[#FFD700] via-[#FF2A85] to-[#E60067] hover:brightness-110 text-black font-black text-xs rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider mt-1">
              <FontAwesomeIcon icon={faGift} className="text-black" />
              <span>ОТКРЫТЬ GIFTX</span>
            </div>
          </motion.div>

        </div>

        {/* Bottom Banner (Golden Yellow Font) */}
        <div className="mx-3.5 mb-3.5 p-2.5 bg-gradient-to-r from-[#00FF41]/10 via-black/80 to-[#FF2A85]/10 border border-amber-400/20 rounded-2xl text-center flex items-center justify-center gap-2 shadow-inner backdrop-blur-lg">
          <FontAwesomeIcon icon={faRocket} className="text-amber-400 text-xs" />
          <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wide uppercase drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
            БЕЗ СКАЧИВАНИЯ ПРИЛОЖЕНИЙ <span className="text-amber-400">|</span> ЧЕРЕЗ TELEGRAM
          </span>
        </div>

      </div>
    </div>
  );
};

export default HybridChoiceLanding;
