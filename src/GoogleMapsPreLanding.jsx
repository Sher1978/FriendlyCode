import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { logVenueClick } from './logic/analytics';
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
  
  // Fallback to default if no gmConfig found
  const gmConfig = venue?.gmConfig || {
    businessType: 'horeca',
    dailyOfferText: 'Специальная цена и максимальная скидка на весь чек действуют для гостей с Google Карт только сегодня',
    dailyOfferImageUrl: '',
    usePhotoMenu: false,
    usePdfMenu: false,
    menuPdfUrl: '',
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
  
  // Pinch zoom & touch gesture state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const modalContainerRef = React.useRef(null);

  // PDF rendering state
  const [pdfPages, setPdfPages] = useState([]);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfThumbUrl, setPdfThumbUrl] = useState(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);

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

  // Lazy load PDF thumbnails & pages asynchronously as a continuous vertical document
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
          console.warn("ArrayBuffer fetch fallback to direct URL:", fetchErr);
        }

        const loadingTask = pdfjsLib.getDocument({
          ...pdfData,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        setPdfNumPages(pdf.numPages);

        // Instant Page 1 Thumbnail Render (Scale 0.5)
        try {
          const page1 = await pdf.getPage(1);
          const viewport1 = page1.getViewport({ scale: 0.5 });
          const canvas1 = document.createElement('canvas');
          const ctx1 = canvas1.getContext('2d');
          canvas1.width = viewport1.width;
          canvas1.height = viewport1.height;
          await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise;
          if (isMounted) {
            const thumb = canvas1.toDataURL('image/jpeg', 0.75);
            setPdfThumbUrl(thumb);
          }
        } catch (thumbErr) {
          console.warn("Fast thumbnail render warning:", thumbErr);
        }

        // Full Crisp Page Render Loop (Scale 1.5)
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          pageUrls.push(dataUrl);
        }

        if (isMounted) {
          setPdfPages(pageUrls);
        }
      } catch (err) {
        console.warn("PDF.js render fallback:", err);
      } finally {
        if (isMounted) setPdfLoading(false);
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [gmConfig.menuPdfUrl]);

  const touchStateRef = React.useRef({
    initialDist: 0,
    initialScale: 1,
    startPan: { x: 0, y: 0 },
    touchStartPos: null,
    isPinching: false,
    lastTapTime: 0,
  });

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    touchStateRef.current.initialScale = 1;
  };

  useEffect(() => {
    resetZoom();
  }, [selectedPhotoIndex, isPdfModalOpen, currentPdfPage]);

  // Robust touch gesture controller for pinch-to-zoom & pan without screen resets
  useEffect(() => {
    const el = modalContainerRef.current;
    if (!el || (!isPdfModalOpen && selectedPhotoIndex === null)) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStateRef.current.initialDist = dist;
        touchStateRef.current.initialScale = zoomScale;
        touchStateRef.current.isPinching = true;
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStateRef.current.touchStartPos = { x: touch.clientX, y: touch.clientY };
        touchStateRef.current.startPan = { ...panOffset };
        touchStateRef.current.isPinching = false;
        setTouchStart(touch.clientX);
        setTouchEnd(null);

        const now = Date.now();
        if (now - touchStateRef.current.lastTapTime < 300) {
          e.preventDefault();
          if (zoomScale > 1.2) {
            resetZoom();
          } else {
            setZoomScale(2.2);
            touchStateRef.current.initialScale = 2.2;
          }
        }
        touchStateRef.current.lastTapTime = now;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchStateRef.current.isPinching) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (touchStateRef.current.initialDist > 0) {
          const factor = dist / touchStateRef.current.initialDist;
          const newScale = Math.min(Math.max(touchStateRef.current.initialScale * factor, 1), 4);
          setZoomScale(newScale);
          if (newScale <= 1.05) {
            setPanOffset({ x: 0, y: 0 });
          }
        }
      } else if (e.touches.length === 1 && !touchStateRef.current.isPinching) {
        if (zoomScale > 1.1) {
          e.preventDefault();
          const dx = e.touches[0].clientX - touchStateRef.current.touchStartPos.x;
          const dy = e.touches[0].clientY - touchStateRef.current.touchStartPos.y;
          
          const maxPanX = (zoomScale - 1) * 250;
          const maxPanY = (zoomScale - 1) * 400;
          
          const newX = Math.min(Math.max(touchStateRef.current.startPan.x + dx, -maxPanX), maxPanX);
          const newY = Math.min(Math.max(touchStateRef.current.startPan.y + dy, -maxPanY), maxPanY);

          setPanOffset({ x: newX, y: newY });
        } else {
          setTouchEnd(e.touches[0].clientX);
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDist = 0;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [selectedPhotoIndex, isPdfModalOpen, zoomScale, panOffset]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#83E1D9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
                onClick={() => {
                  logVenueClick(venue?.id || venueId, 'instagram');
                  window.open(gmConfig.instagram, '_blank');
                }}
                className="w-[34px] h-[34px] rounded-full bg-[#202124] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-[18px] h-[18px]" />
              </button>
            )}
            {gmConfig?.tiktok && (
              <button 
                onClick={() => {
                  logVenueClick(venue?.id || venueId, 'tiktok');
                  window.open(gmConfig.tiktok, '_blank');
                }}
                className="w-[34px] h-[34px] rounded-full bg-[#202124] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTiktok} className="w-[18px] h-[18px]" />
              </button>
            )}
            {gmConfig?.youtube && (
              <button 
                onClick={() => {
                  logVenueClick(venue?.id || venueId, 'youtube');
                  window.open(gmConfig.youtube, '_blank');
                }}
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
            onClick={() => {
              logVenueClick(venue?.id || venueId, 'google_maps');
              window.open(venue?.googleMapsLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue?.name || 'restaurant')}`, '_blank');
            }}
            className="flex items-center gap-1.5 bg-[#83E1D9] text-[#003833] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faMapLocationDot} className="w-4 h-4" />
            Directions
          </button>
          
          {(gmConfig?.phone || venue?.phone) && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'phone');
                window.open(`tel:${gmConfig?.phone || venue?.phone}`, '_self');
              }}
              className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Call
            </button>
          )}

          {gmConfig?.whatsapp && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'whatsapp');
                window.open(gmConfig.whatsapp, '_blank');
              }}
              className="flex items-center gap-1.5 bg-[#004D46] text-[#83E1D9] px-4 py-[9px] rounded-full font-medium text-[13px] whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
              WhatsApp
            </button>
          )}

          {gmConfig?.telegram && (
            <button 
              onClick={() => {
                logVenueClick(venue?.id || venueId, 'telegram');
                window.open(gmConfig.telegram, '_blank');
              }}
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
            {(gmConfig.usePdfMenu || gmConfig.menuPdfUrl) && !gmConfig.usePhotoMenu ? (
              <div 
                className="bg-[#202124] border border-[#3C4043] rounded-2xl overflow-hidden shadow-xl hover:border-amber-400/60 transition-all cursor-pointer group flex flex-col"
                onClick={() => setIsPdfModalOpen(true)}
              >
                {/* Visual Header / PDF Page 1 Preview Banner */}
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
                      <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">PDF Document</span>
                    </div>
                  )}

                  {/* PDF Badge Overlay */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-bold text-amber-400 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {pdfNumPages > 0 ? `PDF • ${pdfNumPages} стр.` : 'PDF Меню'}
                  </div>
                </div>

                {/* Card Bottom Body & Button */}
                <div className="p-4 flex flex-col items-center text-center space-y-2.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">Меню заведения</h3>
                  <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
                    {pdfNumPages > 0 
                      ? `Полный список блюд и напитков (${pdfNumPages} стр.). Нажмите для просмотра.`
                      : 'Нажмите для просмотра в высоком качестве с возможностью zoom.'}
                  </p>
                  <button className="w-full py-3 rounded-xl bg-amber-400 text-black font-extrabold text-sm shadow-lg hover:bg-amber-300 active:scale-98 transition-all flex items-center justify-center gap-2 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    Открыть Меню
                  </button>
                </div>
              </div>
            ) : gmConfig.usePhotoMenu && gmConfig.menuPhotos && gmConfig.menuPhotos.length > 0 ? (
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

      {/* Lightbox / Continuous PDF Overlay */}
      <AnimatePresence>
        {(selectedPhotoIndex !== null && gmConfig.menuPhotos && gmConfig.menuPhotos[selectedPhotoIndex]) || isPdfModalOpen ? (
          <motion.div 
            ref={modalContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-start p-0 backdrop-blur-md select-none overflow-hidden"
          >
            {/* Minimalist Floating Close Button */}
            <button 
              className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors border border-white/20 shadow-2xl active:scale-90"
              onClick={() => { setSelectedPhotoIndex(null); setIsPdfModalOpen(false); resetZoom(); }}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {/* Continuous Vertical Scroll Container ("Простыня") with Zoom Support */}
            <div 
              className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-6 px-2 space-y-4 touch-pan-y"
              onClick={(e) => e.stopPropagation()}
            >
              {isPdfModalOpen ? (
                pdfPages.length > 0 ? (
                  <div 
                    className="w-full max-w-3xl flex flex-col items-center gap-3 transition-transform duration-75 origin-center my-auto"
                    style={{
                      transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                    }}
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
                )
              ) : selectedPhotoIndex !== null && gmConfig.menuPhotos && gmConfig.menuPhotos[selectedPhotoIndex] ? (
                <div 
                  className="w-full flex-grow flex items-center justify-center p-2"
                  style={{
                    transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                  }}
                >
                  <img 
                    src={gmConfig.menuPhotos[selectedPhotoIndex]} 
                    alt="Menu Fullscreen" 
                    className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl" 
                  />
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
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
