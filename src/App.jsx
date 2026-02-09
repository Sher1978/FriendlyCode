import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import LeadCapture from './LeadCapture';
import UnifiedActivation from './UnifiedActivation';
import B2BLanding from './B2BLanding';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Flow */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/qr" element={<LandingPage />} />
        <Route path="/activate" element={<LeadCapture />} />
        <Route path="/thank-you" element={<UnifiedActivation />} />

        {/* B2B Landing */}
        <Route path="/partner" element={<B2BLanding />} />

        {/* Redirects for Admin/Owner panels to sub-path handled by Flutter */}
        <Route path="/owner" element={<NavigateToAdmin path="owner" />} />
        <Route path="/Superadmin" element={<NavigateToAdmin path="Superadmin" />} />

        {/* Catch-all or Fallback for /admin handled by Firebase/Server */}
        <Route path="/admin/*" element={<AdminRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

const NavigateToAdmin = ({ path }) => {
  React.useEffect(() => {
    window.location.href = `/admin/#/${path}`;
  }, [path]);
  return <div className="min-h-screen bg-[#FFF2E2]"></div>;
};

const AdminRedirect = () => {
  React.useEffect(() => {
    window.location.href = '/admin/';
  }, []);
  return <div className="min-h-screen bg-background-cream"></div>;
};

export default App;
