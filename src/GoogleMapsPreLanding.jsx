import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import PngBattery from './PngBattery';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faTiktok, faYoutube, faTelegram, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';

const GoogleMapsPreLanding = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const rawId = searchParams.get('id') || searchParams.get('v') || 'demo';
  const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const [animatedCapacity, setAnimatedCapacity] = useState(10);
  useEffect(() => {
      const duration = 2000;
      const fps = 30;
      const totalFrames = (duration / 1000) * fps;
      let currentFrame = 0;
      
      const interval = setInterval(() => {
          currentFrame++;
          const progress = currentFrame / totalFrames;
          if (currentFrame >= totalFrames) {
              setAnimatedCapacity(100);
              clearInterval(interval);
          } else {
              const currentVal = 10 + (90 * progress);
              setAnimatedCapacity(Math.min(100, Math.floor(currentVal)));
          }
      }, 1000 / fps);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const docRef = doc(db, 'venues', venueId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVenue(docSnap.data());
        } else {
          // Fallback to searching by slug
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

  const handleActivate = () => {
    let targetParams = `/?utm_source=google_maps&v=${venueId}&activated=true`;
    if (venue?.name) {
        targetParams += `&name=${encodeURIComponent(venue.name)}`;
    }
    if (venue?.googleMapsUrl) {
        targetParams += `&gmap=${encodeURIComponent(venue.googleMapsUrl)}`;
    } else if (venue?.latitude && venue?.longitude) {
        targetParams += `&lat=${venue.latitude}&lng=${venue.longitude}`;
    }
    window.location.href = targetParams;
  };

  // Swipe handlers for fullscreen gallery
  const [photoDirection, setPhotoDirection] = useState(1);
  const minSwipeDistance = 50;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Fallback to default if no gmConfig found
  const gmConfig = venue?.gmConfig || {
    businessType: 'horeca',
    dailyOfferText: 'Специальная цена и максимальная скидка на весь чек действуют для гостей с Google Карт только сегодня',
    dailyOfferImageUrl: '',
    usePhotoMenu: false,
    menuPhotos: [],
    menuItems: [],
    services: []
  };

  const isHoreca = gmConfig.businessType === 'horeca';

  // Calculate max discount
  let maxDiscount = 20;
  if (venue) {
      const config = venue.loyaltyConfig || venue.tiers;
      if (Array.isArray(config)) {
          const percs = config.map(c => Number(c.percentage || c.percent || 0)).filter(p => p > 0);
          if (percs.length > 0) maxDiscount = Math.max(...percs);
      } else if (config && config.percVip) {
          maxDiscount = Number(config.percVip);
      }
  }
  
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && selectedPhotoIndex !== null && selectedPhotoIndex < gmConfig.menuPhotos.length - 1) {
      setPhotoDirection(1);
      setSelectedPhotoIndex(prev => prev + 1);
    }
    if (isRightSwipe && selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setPhotoDirection(-1);
      setSelectedPhotoIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] font-sans text-white pb-32">
      {/* Top Header - Dark Maps Style */}
      <div className="bg-[#131314] sticky top-0 z-20">
        
        {/* Fake Search Bar / Back Button */}
        <div 
          className="flex items-center px-4 py-3 cursor-pointer bg-[#202124] border-b border-[#3C4043] active:bg-[#3C4043] transition-colors"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue?.name || 'restaurant')}`;
            }
          }}
        >
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <div className="ml-4 flex-grow text-[17px] truncate font-medium text-white">{venue?.name || 'Заведение'}</div>
          <svg className="w-6 h-6 text-gray-300 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        {/* Venue Info Banner (Bottom Sheet Header Style) */}
        <div className="px-4 pt-5 pb-2 flex justify-between items-start">
          <div>
            <h1 className="text-[26px] font-semibold mb-1 leading-tight tracking-tight">{venue?.name || 'Заведение'}</h1>
            <div className="flex items-center text-[13px] text-gray-300 mb-1">
              <span className="font-medium mr-1">4.9</span>
              <div className="flex text-yellow-500 mr-1.5">
                {[1,2,3,4,5].map(i => <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <span>(128) • 🚗 10 min</span>
            </div>
            <div className="text-[13px] text-gray-400 mb-1">
              {venue?.category || 'Fast food restaurant'} • ₫1-100,000
            </div>
            <div className="text-[13px]">
              <span className="text-[#81C995] font-medium">Open</span>
              <span className="text-gray-400"> • Closes 9 PM</span>
            </div>
          </div>
          
          {/* Right Icons (Socials) */}
          <div className="flex gap-2 shrink-0 ml-3">
            {gmConfig?.instagram && (
              <button 
                onClick={() => window.open(gmConfig.instagram, '_blank')}
                className="w-[34px] h-[34px] rounded-full bg-[#202124] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-[18px] h-[18px]" />
              </button>
            )}
            {gmConfig?.tiktok && (
              <button 
                onClick={() => window.open(gmConfig.tiktok, '_blank')}
                className="w-[34px] h-[34px] rounded-full bg-[#202124] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTiktok} className="w-[18px] h-[18px]" />
              </button>
            )}
            {gmConfig?.youtube && (
              <button 
                onClick={() => window.open(gmConfig.youtube, '_blank')}
                className="w-[34px] h-[34px] rounded-full bg-[#202124] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faYoutube} className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex px-4 py-3 gap-2 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => window.open(venue?.googleMapsLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue?.name || 'restaurant')}`, '_blank')}
            className="flex items-center gap-1.5 bg-[#83E1D9] text-[#003833] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faMapLocationDot} className="w-4 h-4" />
            Directions
          </button>
          
          {(gmConfig?.phone || venue?.phone) && (
            <button 
              onClick={() => window.open(`tel:${gmConfig?.phone || venue?.phone}`, '_self')}
              className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Call
            </button>
          )}

          {gmConfig?.whatsapp && (
            <button 
              onClick={() => window.open(gmConfig.whatsapp, '_blank')}
              className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
              WhatsApp
            </button>
          )}

          {gmConfig?.telegram && (
            <button 
              onClick={() => window.open(gmConfig.telegram, '_blank')}
              className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faTelegram} className="w-4 h-4" />
              Telegram
            </button>
          )}

          <button 
            onClick={async () => {
              const url = venue?.googleMapsLink || window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({ title: venue?.name || 'Заведение', url });
                } catch (e) {}
              } else {
                navigator.clipboard.writeText(url);
                alert('Ссылка скопирована!');
              }
            }}
            className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 bg-[#131314] min-h-[400px]">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
            {gmConfig.usePhotoMenu && gmConfig.menuPhotos && gmConfig.menuPhotos.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 brand-scrollbar -mx-4 px-4">
                {gmConfig.menuPhotos.map((photoUrl, idx) => {
                  let aspectClass = "aspect-[3/4] w-64";
                  if (gmConfig.photoAspectRatio === '16:9') aspectClass = "aspect-video w-80";
                  if (gmConfig.photoAspectRatio === '1:1') aspectClass = "aspect-square w-72";
                  
                  const fitClass = gmConfig.photoFit === 'contain' ? "object-contain bg-black/5" : "object-cover";
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex-shrink-0 ${aspectClass} rounded-2xl overflow-hidden snap-center shadow-md border border-gray-200 cursor-pointer`}
                      onClick={() => setSelectedPhotoIndex(idx)}
                    >
                      <img src={photoUrl} alt={`Menu ${idx+1}`} className={`w-full h-full ${fitClass}`} />
                    </div>
                  );
                })}
              </div>
            ) : isHoreca && gmConfig.menuItems && gmConfig.menuItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {gmConfig.menuItems.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 flex flex-col">
                    <div className="h-32 bg-gray-200 w-full relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-grow">{item.description}</p>
                      <div className="text-sm font-bold text-gray-900 mt-auto">{item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isHoreca && gmConfig.services && gmConfig.services.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {gmConfig.services.map((item, idx) => (
                  <div key={idx} className="p-4 border-b border-gray-100 last:border-b-0 flex justify-between">
                    <div className="pr-4">
                      <h3 className="font-medium text-gray-800 text-sm mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.description}</p>
                      {item.duration && <p className="text-xs text-blue-600 mt-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>{item.duration}</p>}
                    </div>
                    <div className="font-semibold text-gray-900 shrink-0 text-sm">{item.price}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 shadow-sm text-center text-gray-500 border border-gray-200">
                Здесь пока ничего нет.
              </div>
            )}
          </motion.div>
      </div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && gmConfig.menuPhotos && gmConfig.menuPhotos[selectedPhotoIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm touch-none"
            onClick={() => setSelectedPhotoIndex(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <button 
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
              onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            {/* Left/Right Arrows for Desktop */}
            {selectedPhotoIndex > 0 && (
              <button 
                className="hidden md:flex absolute left-4 text-white p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                onClick={(e) => { e.stopPropagation(); setPhotoDirection(-1); setSelectedPhotoIndex(prev => prev - 1); }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
            )}
            
            {selectedPhotoIndex < gmConfig.menuPhotos.length - 1 && (
              <button 
                className="hidden md:flex absolute right-4 text-white p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                onClick={(e) => { e.stopPropagation(); setPhotoDirection(1); setSelectedPhotoIndex(prev => prev + 1); }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.img 
                key={selectedPhotoIndex}
                initial={{ opacity: 0, x: photoDirection * 50 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: photoDirection * -50 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                src={gmConfig.menuPhotos[selectedPhotoIndex]} 
                alt="Menu Fullscreen" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg" 
                onClick={(e) => e.stopPropagation()}
              />
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Offer & CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-12 pb-10 px-4 pointer-events-auto shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)] flex justify-center">
          <motion.div 
            onClick={handleActivate}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.95 }}
            className="w-full max-w-[270px] relative cursor-pointer group"
          >
            {/* Invisible click catcher */}
            <div className="absolute inset-0 z-30 pointer-events-auto" />
            <div className="pointer-events-none">
                <PngBattery capacity={animatedCapacity} showGlow={true} disableInternalAnim={true} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <span className="text-black font-black text-[15px] uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(255,255,255,0.6)]">
                    ВАМ СКИДКА {maxDiscount} %
                </span>
            </div>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full z-10 pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, white 50%, transparent 70%)' }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsPreLanding;
