import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBolt, 
  faGift, 
  faStar, 
  faCreditCard, 
  faRocket, 
  faMapMarkerAlt, 
  faWifi
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

const HybridChoiceLandingV3 = ({ venueData: propVenueData, venueId: propVenueId, onSelectRevo }) => {
  const { t } = useTranslation();
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

  const venueName = venueData?.name || venueData?.venueName || safeStorage.getItem('currentVenueName') || 'REVOO VENUE';
  const giftxUrl = venueData?.giftxUrl || 'https://giftx.app';

  const handleRevoClick = (e) => {
    if (e) e.stopPropagation();
    if (onSelectRevo) {
      onSelectRevo();
    } else {
      navigate(`/qr?id=${activeVenueId}&bypass_hybrid=true`, { replace: true });
    }
  };

  const handleGiftxClick = (e) => {
    if (e) e.stopPropagation();
    if (giftxUrl) {
      window.location.href = giftxUrl;
    } else {
      alert(t('hybrid_giftx_not_configured', 'GiftX ссылка не настроена заведением'));
    }
  };

  // QR Destination URL points to Version 2 interactive landing screen
  const qrUrl = `https://bot-lab-21910.web.app/hybrid-v2?id=${activeVenueId || 'demo'}`;

  return (
    <div className="min-h-[100dvh] bg-[#020205] text-amber-300 flex flex-col items-center justify-center p-2.5 sm:p-4 font-sans relative overflow-hidden select-none">
      
      {/* 🌌 Luxury Glassmorphism Ambient Orbs */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#00FF41]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FF2A85]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#FFD700]/12 rounded-full blur-[180px] pointer-events-none" />

      {/* 📱 iPhone 17 Pro Max Frame with White Contour (border-2 border-white rounded-[48px]) */}
      <div className="w-full max-w-[430px] bg-[#08080E]/90 backdrop-blur-3xl border-2 border-white rounded-[48px] shadow-[0_25px_100px_rgba(0,0,0,0.95),0_0_55px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col relative z-10 my-auto">
        
        {/* Top Header Banner */}
        <div className="pt-3.5 pb-1 px-4 text-center relative bg-gradient-to-b from-[#14121C]/90 via-[#0E0C15]/80 to-[#08080E]/90 backdrop-blur-xl">
          {/* Location Badge Icon */}
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.5)] border border-amber-300/50">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="text-black text-xs" />
          </div>

          {/* Venue Name Header Badge */}
          <div className="inline-block border border-amber-400/60 bg-black/80 backdrop-blur-xl px-5 py-1 rounded-2xl shadow-[0_0_25px_rgba(255,215,0,0.3)]">
            <h1 className="text-amber-300 font-black text-base sm:text-lg tracking-wider uppercase drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]">
              {venueName}
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-[11px] sm:text-sm font-black text-amber-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] mt-1">
            РАДЫ ВИДЕТЬ ВАС!
          </p>
        </div>

        {/* 🔗 CONNECTED VERSION 3 STACKED CONTAINER */}
        <div className="px-3.5 pt-1.5 pb-3.5 relative flex flex-col items-center">

          {/* 🟢 TOP CARD: REVO (Clickable Card) */}
          <div
            onClick={handleRevoClick}
            className="w-full bg-gradient-to-b from-[#0D1C11]/90 via-[#09130C]/90 to-[#040805]/95 backdrop-blur-2xl border-2 border-[#00FF41]/40 rounded-[28px] p-3.5 pb-8 shadow-[0_0_30px_rgba(0,255,65,0.2)] relative z-10 overflow-hidden cursor-pointer group"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#00FF41]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#0D2614]/80 backdrop-blur-md border border-[#00FF41]/50 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(0,255,65,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBolt} className="text-[#00FF41] text-xs" />
                <span className="font-black text-[#00FF41] text-xs tracking-wide">REVO</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9.5px] font-black text-[#00FF41]/90 uppercase tracking-wider">СКИДКИ ЗА ЧАСТОТУ</span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-sm font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              Чем чаще ходишь — тем выше скидка!
            </p>

            {/* 🔋 Static Glowing 3D Battery Container (Increased by 5%) */}
            <div className="h-[88px] my-0.5 flex items-center justify-center relative">
              <div 
                style={{ filter: 'drop-shadow(0 0 22px rgba(0,255,65,0.85))' }}
                className="w-full max-w-[235px] h-[82px] flex items-center justify-center scale-[0.86]"
              >
                <PngBattery capacity={100} />
              </div>
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faStar} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <span className="text-[10.5px] text-amber-300 font-bold leading-tight">
                  Подарки за отзывы
                </span>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faCreditCard} className="text-[#00FF41] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(0,255,65,0.6)]" />
                <span className="text-[10.5px] text-amber-300 font-bold leading-tight">
                  V.I.P. статус за депозит
                </span>
              </div>
            </div>
          </div>

          {/* 🔲 MAXIMIZED GOLD QR CODE SQUARE WITH BORDERLESS NFC PICTOGRAMS */}
          <div className="w-[195px] h-[190px] my-[-24px] relative z-20 flex items-center justify-center">
            
            {/* 📶 Left NFC Pictogram (Borderless Floating Icon) */}
            <div className="absolute left-[-34px] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 z-30 pointer-events-none">
              <FontAwesomeIcon icon={faWifi} className="text-amber-400 text-base rotate-90 drop-shadow-[0_0_10px_rgba(255,215,0,0.85)]" />
              <span className="text-[9px] font-black text-amber-300 tracking-wider drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]">NFC</span>
            </div>

            {/* 📶 Right NFC Pictogram (Borderless Floating Icon) */}
            <div className="absolute right-[-34px] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 z-30 pointer-events-none">
              <FontAwesomeIcon icon={faWifi} className="text-amber-400 text-base rotate-90 drop-shadow-[0_0_10px_rgba(255,215,0,0.85)]" />
              <span className="text-[9px] font-black text-amber-300 tracking-wider drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]">NFC</span>
            </div>

            {/* Central Opaque Black Square (Clean Empty Space for Venue QR Overlay) */}
            <div className="w-full h-full bg-[#000000] border-t-2 border-[#00FF41] border-b-2 border-[#FF2A85] border-x-2 border-amber-400/90 rounded-[30px] shadow-[0_0_50px_rgba(0,0,0,1),0_0_35px_rgba(255,215,0,0.4)] flex items-center justify-center relative z-20 overflow-hidden" />
          </div>

          {/* 🎁 BOTTOM CARD: GIFTX (Clickable Card) */}
          <div
            onClick={handleGiftxClick}
            className="w-full bg-gradient-to-b from-[#240B1B]/90 via-[#160611]/90 to-[#0A0208]/95 backdrop-blur-2xl border-2 border-[#FFD700]/40 rounded-[28px] p-3.5 pt-8 shadow-[0_0_30px_rgba(255,215,0,0.2)] relative z-10 overflow-hidden cursor-pointer group"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF2A85]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="bg-[#330D25]/80 backdrop-blur-md border border-[#FFD700]/60 px-3 py-1 rounded-2xl shadow-[0_0_12px_rgba(255,215,0,0.25)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs" />
                <span className="font-black text-[#FFD700] text-xs tracking-wide">GIFTX</span>
                <span className="text-[9px] font-bold text-amber-300/40">|</span>
                <span className="text-[9.5px] font-black text-[#FF2A85] uppercase tracking-wider">ПОЛУЧАЙ ПОДАРКИ ЗА ВИЗИТ</span>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-sm font-black text-amber-300 leading-tight mb-1.5 drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
              Каждый оплаченный чек — твой подарок!
            </p>

            {/* 🎁 Static Glowing 3D Gift Box Container */}
            <div className="h-[104px] my-1 flex items-center justify-center relative">
              <img
                src={giftxBox3D}
                alt="GiftX 3D Box"
                style={{ filter: 'drop-shadow(0 0 25px rgba(255,42,133,0.85))' }}
                className="h-[98px] w-auto object-contain"
              />
            </div>

            {/* Glass Feature Bullets */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faGift} className="text-[#FFD700] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]" />
                <span className="text-[10.5px] text-amber-300 font-bold leading-tight">
                  Подарки, бонусы, апгрейд
                </span>
              </div>

              <div className="bg-amber-400/[0.05] backdrop-blur-xl px-2 py-1.5 rounded-2xl border border-amber-400/20 flex items-center justify-center gap-1.5 h-[38px] text-center shadow-sm">
                <FontAwesomeIcon icon={faStar} className="text-[#FF2A85] text-xs shrink-0 drop-shadow-[0_0_6px_rgba(255,42,133,0.6)]" />
                <span className="text-[10.5px] text-amber-300 font-bold leading-tight">
                  В лучших заведениях города
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Banner (Borderless Floating Text) */}
        <div className="py-2.5 px-3 text-center flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faRocket} className="text-amber-400 text-xs drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
          <span className="text-[11px] sm:text-sm font-black text-amber-300 tracking-wide uppercase drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">
            БЕЗ СКАЧИВАНИЯ ПРИЛОЖЕНИЙ <span className="text-amber-400">|</span> ЧЕРЕЗ TELEGRAM
          </span>
        </div>

      </div>
    </div>
  );
};

export default HybridChoiceLandingV3;
