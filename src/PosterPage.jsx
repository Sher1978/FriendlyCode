import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  faMapMarkerAlt, 
  faPrint,
  faQrcode
} from '@fortawesome/free-solid-svg-icons';
import { QRCodeSVG } from 'qrcode.react';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import PngBattery from './PngBattery';
import giftxBox3D from './assets/giftx-box-3d.png';

const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('Storage blocked'); } }
};

const PosterPage = () => {
  const { i18n } = useTranslation();
  const location = useLocation();

  const [venueData, setVenueData] = useState(null);
  const [activeVenueId, setActiveVenueId] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawId = searchParams.get('id') || searchParams.get('v') || safeStorage.getItem('currentVenueId') || 'demo';
    const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
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
  }, [location]);

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || 'ru';
    const baseLang = current.substring(0, 2).toLowerCase();
    const cycle = { ru: 'en', en: 'vi', vi: 'ar', ar: 'ru' };
    const next = cycle[baseLang] || 'ru';
    i18n.changeLanguage(next);
    safeStorage.setItem('userLanguage', next);
  };

  const venueName = venueData?.name || venueData?.venueName || safeStorage.getItem('currentVenueName') || 'REVOO VENUE';
  const langCode = (i18n.resolvedLanguage || i18n.language || 'ru').substring(0, 2).toUpperCase();

  // Dynamic QR Destination URL
  const qrUrl = `https://bot-lab-21910.web.app/hybrid-v2?id=${activeVenueId || 'demo'}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[100dvh] bg-[#020205] text-amber-300 flex flex-col items-center justify-center p-2.5 sm:p-4 font-sans relative overflow-hidden select-none print:p-0 print:bg-black">
      
      {/* Floating Print Action Button (Hidden when printing) */}
      <button
        onClick={handlePrint}
        className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs sm:text-sm rounded-full shadow-[0_0_25px_rgba(255,215,0,0.5)] flex items-center gap-2 transition-all active:scale-95 print:hidden"
      >
        <FontAwesomeIcon icon={faPrint} className="text-base" />
        <span>ПЕЧАТЬ ПОСТЕРА</span>
      </button>

      {/* 🌌 Luxury Glassmorphism Ambient Orbs */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#00FF41]/20 rounded-full blur-[160px] pointer-events-none print:hidden" />
      <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FF2A85]/20 rounded-full blur-[160px] pointer-events-none print:hidden" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#FFD700]/12 rounded-full blur-[180px] pointer-events-none print:hidden" />

      {/* Printable Poster Container (iOS 26 Style Extra Rounded Corners: rounded-[44px], Golden Typography) */}
      <div className="w-full max-w-[430px] bg-[#08080E]/90 backdrop-blur-3xl border border-amber-400/30 rounded-[44px] shadow-[0_25px_100px_rgba(0,0,0,0.95),0_0_50px_rgba(255,215,0,0.15)] overflow-hidden flex flex-col relative z-10 my-auto print:max-w-none print:w-[100vw] print:h-[100vh] print:rounded-none print:border-none print:shadow-none print:my-0 print:justify-between">
        
        {/* Top Header Banner (NO DIVIDING LINE) */}
        <div className="pt-4 pb-3.5 px-4 text-center relative bg-gradient-to-b from-[#14121C]/90 via-[#0E0C15]/80 to-[#08080E]/90 backdrop-blur-xl">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="absolute top-3.5 right-3.5 px-3 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-full text-[10px] font-extrabold text-amber-300 flex items-center gap-1.5 transition-all shadow-md active:scale-95 backdrop-blur-md print:hidden"
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

        {/* Vertical Stacked Cards Section */}
        <div className="p-3.5 flex flex-col gap-3">

          {/* 🟢 TOP CARD: REVO (Battery reduced by 5%, No Launch Button) */}
          <div className="relative bg-gradient-to-b from-[#0D1C11]/80 via-[#09130C]/80 to-[#040805]/90 backdrop-blur-2xl border border-[#00FF41]/40 rounded-[28px] p-3.5 shadow-[0_0_30px_rgba(0,255,65,0.2),inset_0_0_20px_rgba(0,255,65,0.08)] overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#00FF41]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#0D2614]/80 backdrop-blur-md border border-[#00FF41]/50 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(0,255,65,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBolt} className="text-[#00FF41] text-xs" />
                <span className="font-black text-[#00FF41] text-xs tracking-wide">REVO</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9px] font-black text-[#00FF41]/90 uppercase tracking-wider">СКИДКИ ЗА ЧАСТОТУ</span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-xs font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              Чем чаще ходишь — тем выше скидка!
            </p>

            {/* 🔋 Battery Container (Reduced by 5%: scale-[0.95]) */}
            <div className="h-[102px] my-1 py-1 flex items-center justify-center bg-black/40 backdrop-blur-xl border border-[#00FF41]/25 rounded-[20px] relative shadow-[inset_0_0_20px_rgba(0,255,65,0.15)]">
              <div className="w-full max-w-[247px] h-[90px] flex items-center justify-center scale-[0.95]">
                <PngBattery capacity={100} />
              </div>
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl p-2.5 rounded-[18px] border border-amber-400/20 flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <div className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  Подарки за отзывы
                </div>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl p-2.5 rounded-[18px] border border-amber-400/20 flex items-center gap-2">
                <FontAwesomeIcon icon={faCreditCard} className="text-[#00FF41] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(0,255,65,0.6)]" />
                <div className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  V.I.P. статус за депозит
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 CENTRAL QR CODE GLASS CONTAINER (Inscribed in a Square Glass Box) */}
          <div className="relative py-1 flex items-center justify-center">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,215,0,0.35)',
                  '0 0 40px rgba(255,215,0,0.7)',
                  '0 0 20px rgba(255,215,0,0.35)'
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-black/90 backdrop-blur-2xl border-2 border-amber-400/80 p-3 rounded-[30px] shadow-[0_0_35px_rgba(255,215,0,0.35)] flex flex-col items-center justify-center text-center gap-1.5"
            >
              <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <FontAwesomeIcon icon={faQrcode} className="text-amber-400 text-xs" />
                <span>ОТСКАНИРУЙТЕ ДЛЯ БОНУСОВ</span>
              </div>

              {/* QR Code Canvas */}
              <div className="p-2 bg-white rounded-2xl shadow-inner border border-amber-300/40">
                <QRCodeSVG 
                  value={qrUrl}
                  size={135}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-[9px] font-black text-amber-300/90 tracking-widest uppercase">
                REVO <span className="text-amber-400">&bull;</span> GIFTX
              </div>
            </motion.div>
          </div>

          {/* 🎁 BOTTOM CARD: GIFTX (No Launch Button) */}
          <div className="relative bg-gradient-to-b from-[#240B1B]/80 via-[#160611]/80 to-[#0A0208]/90 backdrop-blur-2xl border border-[#FFD700]/40 rounded-[28px] p-3.5 shadow-[0_0_30px_rgba(255,215,0,0.2),inset_0_0_20px_rgba(255,215,0,0.08)] overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF2A85]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#330D25]/80 backdrop-blur-md border border-[#FFD700]/60 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(255,215,0,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs" />
                <span className="font-black text-[#FFD700] text-xs tracking-wide">GIFTX</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9px] font-black text-[#FF2A85] uppercase tracking-wider">ПОЛУЧАЙ ПОДАРКИ ЗА ВИЗИТ</span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-xs font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              Каждый оплаченный чек — твой подарок!
            </p>

            {/* 🎁 Container for Transparent 3D Gift Box */}
            <div className="h-[102px] my-1 py-1 flex items-center justify-center bg-black/40 backdrop-blur-xl border border-[#FFD700]/25 rounded-[20px] relative shadow-[inset_0_0_20px_rgba(255,215,0,0.15)]">
              <img
                src={giftxBox3D}
                alt="GiftX 3D Box"
                className="h-[90px] w-auto object-contain drop-shadow-2xl"
              />
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl p-2.5 rounded-[18px] border border-amber-400/20 flex items-center gap-2">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <div className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  Подарки, бонусы, апгрейд
                </div>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl p-2.5 rounded-[18px] border border-amber-400/20 flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-[#FF2A85] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,42,133,0.6)]" />
                <div className="text-[9.5px] text-amber-300 font-bold leading-tight">
                  В лучших заведениях города
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Banner */}
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

export default PosterPage;
