import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PngBattery, { GlobalLoaderContext } from './PngBattery';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';

// Helper to handle ChunkLoadError on new deployments
const lazyWithRetry = (componentImport) =>
  React.lazy(() =>
    componentImport().catch((error) => {
      console.error("Chunk load failed, reloading...", error);
      window.location.reload();
      return { default: () => null };
    })
  );

// Code-split: each route loads its JS chunk on demand only
const LandingPage        = lazyWithRetry(() => import('./LandingPage'));
const LeadCapture        = lazyWithRetry(() => import('./LeadCapture'));
const GoogleLeadCapture  = lazyWithRetry(() => import('./GoogleLeadCapture'));
// UnifiedActivation — статический импорт: переход на /thank-you мгновенный (6.95 KB gzip)
import UnifiedActivation from './UnifiedActivation';
const TelegramAuth       = lazyWithRetry(() => import('./TelegramAuth'));
const MarketingB2C       = lazyWithRetry(() => import('./MarketingB2C'));
const PartnerMap         = lazyWithRetry(() => import('./PartnerMap'));
const MarketingB2B       = lazyWithRetry(() => import('./MarketingB2B'));
const Unsubscribe        = lazyWithRetry(() => import('./Unsubscribe'));
const NewQRPage          = lazyWithRetry(() => import('./NewQRPage'));
const TestQRPage         = lazyWithRetry(() => import('./TestQRPage'));
const RevooB2C           = lazyWithRetry(() => import('./RevooB2C'));
const HybridChoiceLanding = lazyWithRetry(() => import('./HybridChoiceLanding'));
const HybridChoiceLandingV2 = lazyWithRetry(() => import('./HybridChoiceLandingV2'));
const HybridChoiceLandingV3 = lazyWithRetry(() => import('./HybridChoiceLandingV3'));
const RevooB2B           = lazyWithRetry(() => import('./RevooB2B'));
const GuestDashboard     = lazyWithRetry(() => import('./GuestDashboard'));
const CaptiveLanding     = lazyWithRetry(() => import('./CaptiveLanding'));
const RevooStories       = lazyWithRetry(() => import('./RevooStories'));
const StaffJoinPage      = lazyWithRetry(() => import('./StaffJoinPage'));
const PosterPage         = lazyWithRetry(() => import('./PosterPageV3'));
const PosterPageV3       = lazyWithRetry(() => import('./PosterPageV3'));
const SmartWelcomeScreen = lazyWithRetry(() => import('./SmartWelcomeScreen'));
const RevooB2BV2         = lazyWithRetry(() => import('./RevooB2BV2'));
const GoogleMapsPreLanding = lazyWithRetry(() => import('./GoogleMapsPreLanding'));
const GoogleThankYouScreen = lazyWithRetry(() => import('./GoogleThankYouScreen'));

import DubaiTechBadge from './DubaiTechBadge';


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Render Error caught by Boundary:", error, errorInfo);
    this.redirectToTest();
  }

  redirectToTest = () => {
    try {
      localStorage.removeItem('onboardingCompleted');
    } catch(e) {}
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawId = searchParams.get('id') || searchParams.get('v') || localStorage.getItem('currentVenueId') || 'demo';
      const venueId = rawId.startsWith('3D') && rawId.length > 10 ? rawId.substring(2) : rawId;
      window.location.replace(`/test?id=${venueId}`);
    } catch (e) {
      window.location.replace('/test');
    }
  };

  render() {
    if (this.state.hasError) {
      console.error("ErrorBoundary caught:", this.state.error);
      return <div className="min-h-screen bg-red-900 text-white p-10"><h1 className="text-2xl font-bold">App Crashed</h1><pre className="mt-4 text-sm whitespace-pre-wrap">{this.state.error?.toString()}</pre></div>;
    }
    return this.props.children;
  }
}

const GlobalBatteryLoader = ({ onComplete }) => {
    const [animatedPercent, setAnimatedPercent] = useState(0);

    useEffect(() => {
        const duration = 5000; // 5 seconds forced load
        const fps = 60;
        const totalFrames = (duration / 1000) * fps;
        let currentFrame = 0;
        
        const interval = setInterval(() => {
            currentFrame++;
            const progress = currentFrame / totalFrames;
            const easeProgress = progress * (2 - progress);
            
            if (currentFrame >= totalFrames) {
                setAnimatedPercent(100);
                clearInterval(interval);
                if (onComplete) {
                    setTimeout(onComplete, 150); // slight pause at 100% before fading out
                }
            } else {
                setAnimatedPercent(Math.max(0, Math.min(100, Math.floor(easeProgress * 100))));
            }
        }, 1000 / fps);
        
        return () => clearInterval(interval);
    }, [onComplete]);

    // Always use green glow to avoid red flash
    let bgGlowColor = 'bg-[#00FF41]';

    return (
        <div 
            className="flex flex-col bg-black font-sans text-white relative overflow-x-hidden overflow-y-auto items-center justify-start h-full w-full" 
            style={{ WebkitFontSmoothing: 'antialiased' }}
        >
            <div className={`absolute top-[-10%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.20] mix-blend-screen transition-colors duration-[2000ms] ${bgGlowColor}`} />
            
            {/* Header bar matching TestQRPage layout */}
            <div 
                className="flex justify-between items-start w-full px-4 pt-4 pb-2 relative z-50 min-h-[90px]"
                style={{
                    paddingTop: 'max(env(safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), 16px)'
                }}
            >
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-start z-20">
                    <div className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/80">
                        <span className="text-sm font-bold">👤</span>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-110px)] flex flex-col items-center text-center z-10 pt-1">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.1em] mb-1.5 whitespace-nowrap">
                        РАДЫ ВИДЕТЬ ВАС В
                    </span>
                    <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-white leading-[1.1] line-clamp-2 max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {typeof window !== 'undefined' ? (localStorage.getItem('currentVenueName') || 'Svoi') : 'Svoi'}
                    </h1>
                </div>

                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-end z-20">
                    <span className="text-xs text-white/60 font-mono">RU</span>
                </div>
            </div>

            <div className="flex flex-col items-center justify-start mt-1 px-6 pb-[140px] w-full max-w-md mx-auto z-10 gap-2.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <div className="h-[24px] flex flex-col items-center -mt-1 mb-1 justify-center w-full" />

                {/* Clean container without glass background card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="flex flex-col items-center w-full relative flex-shrink-0 pt-4"
                >
                    <p className="text-[28px] sm:text-[32px] font-black tracking-tight text-white uppercase mb-3 mt-6 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] text-center leading-tight">
                        ВАША СКИДКА СЕГОДНЯ
                    </p>
                    
                    {/* "ВЫЧИСЛЯЕМ ВАШУ СКИДКУ..." placed ABOVE battery, exactly where discount % is */}
                    <div className="h-[60px] overflow-hidden relative w-full flex items-center justify-center mb-6">
                        <span className="text-sm sm:text-base font-black text-[#00FF41] leading-tight uppercase tracking-wider animate-pulse drop-shadow-[0_0_12px_rgba(0,255,65,0.5)]">
                            ВЫЧИСЛЯЕМ ВАШУ СКИДКУ...
                        </span>
                    </div>

                    {/* Battery at exact vertical height */}
                    <div className="w-full relative z-10 pointer-events-none">
                        <PngBattery capacity={animatedPercent} showGlow={true} disableInternalAnim={true} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const AppOverlay = ({ children }) => {
    const [showLoader, setShowLoader] = useState(true);
    let isExcluded = false;
    
    if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        
        if (pathname.startsWith('/admin') || pathname.startsWith('/owner') || pathname.startsWith('/Superadmin') || pathname.startsWith('/business') || pathname.startsWith('/legacy/b2b')) {
            isExcluded = true;
        }
        if (searchParams.get('utm_source') === 'google_maps') {
            isExcluded = true;
        }
    }

    if (isExcluded) return children;

    return (
        <GlobalLoaderContext.Provider value={{ isLoaderActive: showLoader }}>
            {/* The main app, loading in the background */}
            {children}

            {/* The overlay */}
            <AnimatePresence>
                {showLoader && (
                    <motion.div 
                        className="fixed inset-0 z-[99999] bg-black"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                        <GlobalBatteryLoader onComplete={() => setShowLoader(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </GlobalLoaderContext.Provider>
    );
};

const SuspenseFallback = () => {
    if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('utm_source') === 'google_maps' && searchParams.get('activated') !== 'true') {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }
    }
    return (
        <div className="fixed inset-0 z-[99998] bg-black">
            <GlobalBatteryLoader />
        </div>
    );
};

// Trigger build change to force new deployment hash
function App() {
  const isLegacyDomain = window.location.hostname.includes('friendlycode.fun');
  const queryParams = new URLSearchParams(window.location.search);
  const brandOverride = queryParams.get('brand');
  const showRevoo = brandOverride === 'revoo' || window.location.hostname.includes('revoo.win') || window.location.hostname.includes('revoo.ae') || window.location.hostname === 'localhost' || (!isLegacyDomain && window.location.hostname !== 'localhost');

  return (
    <BrowserRouter>
      <AppOverlay>
        <ErrorBoundary>
          <React.Suspense fallback={<SuspenseFallback />}>
            <Routes>
            {/* Legacy Marketing (Friendly Code 2.0) */}
            <Route path="/legacy/b2c" element={<MarketingB2C />} />
            <Route path="/legacy/b2b" element={<MarketingB2B />} />
          <Route path="/business-v2" element={showRevoo ? <RevooB2B /> : <MarketingB2B />} />

          {/* Multi-Brand Landing Logic — Stories as main entry unless deposit is active */}
          <Route path="/" element={(() => {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('utm_source') === 'google_maps') {
                if (searchParams.get('activated') === 'true') {
                    return <SmartWelcomeScreen />;
                }
                return <GoogleMapsPreLanding />;
            }

            let hasDeposit = false;
            try {
              const b = localStorage.getItem('cached_deposit_balance');
              hasDeposit = b && Number(b) > 0;
            } catch (e) {}

            if (hasDeposit) {
              return <TestQRPage />;
            }

            return (
              <RevooStories onComplete={() => {
                try {
                  localStorage.setItem('onboardingCompleted', 'true');
                } catch (e) {
                  console.warn(e);
                }
                const searchParams = new URLSearchParams(window.location.search);
                const venueId = searchParams.get('qr_venue_id') || 'demo';
                window.location.replace(`/test?id=${venueId}`);
              }} />
            );
          })()} />
          <Route path="/business" element={<RevooB2BV2 />} />
          <Route path="/legacy/b2c" element={<RevooB2C />} />
          <Route path="/map" element={<PartnerMap />} />

          {/* Guest QR Logic (Now REVOO) */}
          <Route path="/qr" element={<NewQRPage />} />
          <Route path="/hybrid" element={<HybridChoiceLanding />} />
          <Route path="/hybrid-v2" element={<HybridChoiceLandingV2 />} />
          <Route path="/hybrid2" element={<HybridChoiceLandingV2 />} />
          <Route path="/hybrid-v3" element={<HybridChoiceLandingV3 />} />
          <Route path="/hybrid3" element={<HybridChoiceLandingV3 />} />
          <Route path="/poster" element={<PosterPageV3 />} />
          <Route path="/poster-v3" element={<PosterPageV3 />} />
          <Route path="/poster3" element={<PosterPageV3 />} />
          <Route path="/print" element={<PosterPageV3 />} />
          <Route path="/test-hybrid-v2" element={<HybridChoiceLandingV2 />} />
          <Route path="/hybrid-landing" element={<HybridChoiceLanding />} />
          <Route path="/test-hybrid" element={<HybridChoiceLanding />} />
          <Route path="/test" element={<TestQRPage />} />
          <Route path="/newqr" element={<NewQRPage />} />
          <Route path="/activate" element={<LeadCapture />} />
          <Route path="/google-activate" element={<GoogleLeadCapture />} />
          <Route path="/thank-you" element={<UnifiedActivation />} />
          <Route path="/google-thank-you" element={<GoogleThankYouScreen />} />
          <Route path="/telegram-auth" element={<TelegramAuth />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/guest-dashboard" element={<GuestDashboard />} />
          <Route path="/staff-join" element={<StaffJoinPage />} />

          {/* Captive Wi-Fi Entry Point */}
          <Route path="/wifi" element={<CaptiveLanding />} />
          <Route path="/wifi-login" element={<CaptiveLanding />} />
          <Route path="/api/wifi/login" element={<CaptiveLanding />} />
          <Route path="/wifi/thank-you" element={<UnifiedActivation />} />
          <Route path="/v/:venueId" element={<NFCScanRedirect />} />

          {/* Redirects for Admin/Owner panels to sub-path handled by Flutter */}
          <Route path="/owner" element={<NavigateToAdmin path="owner" />} />
          <Route path="/Superadmin" element={<NavigateToAdmin path="Superadmin" />} />

          {/* Catch-all or Fallback for /admin handled by Firebase/Server */}
          <Route path="/admin/*" element={<AdminRedirect />} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  </AppOverlay>
</BrowserRouter>
  );
}

const NavigateToAdmin = ({ path }) => {
  React.useEffect(() => {
    window.location.href = `/admin/#/${path}`;
  }, [path]);
  return <div className="min-h-screen bg-[#000000]"></div>;
};

const AdminRedirect = () => {
  React.useEffect(() => {
    window.location.href = '/admin/';
  }, []);
  return <div className="min-h-screen bg-[#000000]"></div>;
};

const NFCScanRedirect = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(`/test?id=${venueId}`, { replace: true });
  }, [venueId, navigate]);
  
  return <GlobalBatteryLoader />;
};

export default App;
