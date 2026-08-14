import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const HybridChoiceLanding = ({ venueData: propVenueData, venueId: propVenueId, onSelectRevo }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [venueData, setVenueData] = useState(propVenueData || null);
  const [activeVenueId, setActiveVenueId] = useState(propVenueId || '');
  const [loading, setLoading] = useState(!propVenueData);

  useEffect(() => {
    if (propVenueData && propVenueId) {
      setVenueData(propVenueData);
      setActiveVenueId(propVenueId);
      setLoading(false);
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const rawId = searchParams.get('id') || searchParams.get('v') || safeStorage.getItem('currentVenueId') || 'demo';
    const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
    setActiveVenueId(venueId);

    // SWR Cache
    const cached = safeStorage.getItem(`venue_cache_${venueId}`);
    if (cached) {
      try {
        setVenueData(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    }

    if (venueId && venueId !== 'demo') {
      getDoc(doc(db, 'venues', venueId)).then((snap) => {
        if (snap.exists()) {
          const v = snap.data();
          setVenueData(v);
          safeStorage.setItem(`venue_cache_${venueId}`, JSON.stringify(v));
        }
        setLoading(false);
      }).catch((err) => {
        console.warn('Error fetching venue for hybrid landing:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
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

  const venueName = venueData?.name || (activeVenueId === 'demo' ? 'OCEAN VIEW RESTAURANT' : 'RESTAURANT & BAR');
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
    <div className="min-h-[100dvh] bg-[#050507] text-white flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden select-none">
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container / Mobile Phone Frame */}
      <div className="w-full max-w-[410px] bg-[#0C0C0E] border border-white/10 rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative z-10">
        
        {/* Top Header / Language Switcher */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/40 tracking-wider">REVOO HYBRID</span>
          </div>
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-amber-400 flex items-center gap-1.5 transition-all"
          >
            <span>🌐</span>
            <span>{langCode}</span>
          </button>
        </div>

        {/* Venue Title & Greeting */}
        <div className="p-5 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-1.5 bg-black/60 border border-amber-400/40 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-3 inline-block"
          >
            <h1 className="text-amber-300 font-black text-sm tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
              📍 [{venueName}]
            </h1>
          </motion.div>

          <p className="text-xs text-white/80 font-medium leading-relaxed max-w-[320px]">
            {t('hybrid_header_subtitle', 'Спасибо за визит! Сканирование прошло успешно. Какую бонусную систему вы хотите открыть?')}
          </p>
        </div>

        {/* Cards Section */}
        <div className="px-4 pb-6 flex flex-col gap-4">

          {/* 1. REVO CARD (Gold Neon Theme) */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRevoClick}
            className="relative bg-gradient-to-b from-[#141419] to-[#0A0A0C] border-2 border-[#EECC44] rounded-2xl p-4 cursor-pointer shadow-[0_0_25px_rgba(238,204,68,0.2)] transition-all group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header / Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">REVO</span>
                <span className="text-xs font-black text-[#EECC44] tracking-wider uppercase">| REVO</span>
              </div>
            </div>

            {/* Icon + Title + Description */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-amber-500/10 border border-[#EECC44]/40 flex items-center justify-center text-[#EECC44] shadow-[0_0_12px_rgba(238,204,68,0.3)]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>

              <div className="flex flex-col">
                <h2 className="text-white font-black text-sm tracking-tight mb-1 leading-tight group-hover:text-amber-300 transition-colors">
                  {t('hybrid_revo_title', 'REVO - СКИДКИ & ДЕПОЗИТ')}
                </h2>
                <p className="text-[11px] text-white/60 leading-normal">
                  {t('hybrid_revo_desc', 'Для накопления скидки за частоту посещений и внесения депозита для постоянной скидки.')}
                </p>
              </div>
            </div>

            {/* Large Active Button */}
            <div className="w-full py-2.5 bg-gradient-to-r from-[#F0D050] to-[#D4AF37] hover:from-[#FFE066] hover:to-[#E5BE40] text-black font-black text-xs rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 transition-all">
              <span className="text-sm">⚡</span>
              <span className="uppercase tracking-wider">{t('hybrid_revo_btn', 'Открыть REVO')}</span>
            </div>
          </motion.div>

          {/* 2. GIFTX CARD (Pink/Magenta Neon Theme) */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGiftxClick}
            className="relative bg-gradient-to-b from-[#191218] to-[#0D090C] border-2 border-[#FF2A85] rounded-2xl p-4 cursor-pointer shadow-[0_0_25px_rgba(255,42,133,0.2)] transition-all group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header / Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">GiftX</span>
                <span className="text-xs font-black text-[#FF2A85] tracking-wider uppercase">| GIFTX</span>
              </div>
            </div>

            {/* Icon + Title + Description */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-pink-500/10 border border-[#FF2A85]/40 flex items-center justify-center text-[#FF2A85] shadow-[0_0_12px_rgba(255,42,133,0.3)]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm0 13-4-4m4 4 4-4M4 11h16a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7a1 1 0 011-1z" />
                </svg>
              </div>

              <div className="flex flex-col">
                <h2 className="text-white font-black text-sm tracking-tight mb-1 leading-tight group-hover:text-pink-300 transition-colors">
                  {t('hybrid_giftx_title', 'GIFTX - ПОДАРКИ & КРОСС-МАРКЕТИНГ')}
                </h2>
                <p className="text-[11px] text-white/60 leading-normal">
                  {t('hybrid_giftx_desc', 'Для получения подарка от партнеров за чек и участия в акциях кросс-маркетинга.')}
                </p>
              </div>
            </div>

            {/* Large Active Button */}
            <div className="w-full py-2.5 bg-gradient-to-r from-[#FF3B92] to-[#D91A73] hover:from-[#FF54A2] hover:to-[#ED2B84] text-white font-black text-xs rounded-xl shadow-[0_4px_15px_rgba(255,42,133,0.4)] flex items-center justify-center gap-2 transition-all">
              <span className="text-sm">🎁</span>
              <span className="uppercase tracking-wider">{t('hybrid_giftx_btn', 'Открыть GiftX')}</span>
            </div>
          </motion.div>

        </div>

        {/* Footer info */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/40 font-medium">
            {t('hybrid_footer_no_apps', 'Без скачивания приложений • Мгновенный доступ')}
          </p>
        </div>

      </div>
    </div>
  );
};

export default HybridChoiceLanding;
