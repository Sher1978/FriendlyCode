import React from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import LeadCapture from './LeadCapture';
import UnifiedActivation from './UnifiedActivation';
import TelegramAuth from './TelegramAuth';
import MarketingB2C from './MarketingB2C';
import PartnerMap from './PartnerMap';
import MarketingB2B from './MarketingB2B';
import Unsubscribe from './Unsubscribe';
import NewQRPage from './NewQRPage';
import TestQRPage from './TestQRPage';
import RevooB2C from './RevooB2C';
import RevooB2B from './RevooB2B';
import GuestDashboard from './GuestDashboard';
import CaptiveLanding from './CaptiveLanding';

import DubaiTechBadge from './DubaiTechBadge';

function App() {
  const isLegacyDomain = window.location.hostname.includes('friendlycode.fun');
  const queryParams = new URLSearchParams(window.location.search);
  const brandOverride = queryParams.get('brand');
  const showRevoo = brandOverride === 'revoo' || window.location.hostname.includes('revoo.win') || window.location.hostname.includes('revoo.ae') || window.location.hostname === 'localhost' || (!isLegacyDomain && window.location.hostname !== 'localhost');

  return (
    <BrowserRouter>
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-6">
          <motion.div 
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src="/revoo-logo.png" alt="Loading REVOO" className="w-32 opacity-80 mix-blend-screen drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]" />
          </motion.div>
          <DubaiTechBadge />
        </div>
      }>
        <Routes>
          {/* Legacy Marketing (Friendly Code 2.0) */}
          <Route path="/legacy/b2c" element={<MarketingB2C />} />
          <Route path="/legacy/b2b" element={<MarketingB2B />} />

          {/* Multi-Brand Landing Logic */}
          <Route path="/" element={showRevoo ? <RevooB2C /> : <MarketingB2C />} />
          <Route path="/business" element={showRevoo ? <RevooB2B /> : <MarketingB2B />} />
          <Route path="/map" element={<PartnerMap />} />

          {/* Guest QR Logic (Now REVOO) */}
          <Route path="/qr" element={<NewQRPage />} />
          <Route path="/test" element={<TestQRPage />} />
          <Route path="/newqr" element={<NewQRPage />} />
          <Route path="/activate" element={<LeadCapture />} />
          <Route path="/thank-you" element={<UnifiedActivation />} />
          <Route path="/telegram-auth" element={<TelegramAuth />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/guest-dashboard" element={<GuestDashboard />} />

          {/* Captive Wi-Fi Entry Point */}
          <Route path="/wifi" element={<CaptiveLanding />} />
          <Route path="/wifi/thank-you" element={<UnifiedActivation />} />

          {/* Redirects for Admin/Owner panels to sub-path handled by Flutter */}
          <Route path="/owner" element={<NavigateToAdmin path="owner" />} />
          <Route path="/Superadmin" element={<NavigateToAdmin path="Superadmin" />} />

          {/* Catch-all or Fallback for /admin handled by Firebase/Server */}
          <Route path="/admin/*" element={<AdminRedirect />} />
        </Routes>
      </React.Suspense>
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

export default App;
