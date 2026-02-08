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
        <Route path="/activate" element={<LeadCapture />} />
        <Route path="/thank-you" element={<UnifiedActivation />} />

        {/* B2B Landing */}
        <Route path="/partner" element={<B2BLanding />} />

        {/* Catch-all or Fallback for /admin handled by Firebase/Server */}
        <Route path="/admin/*" element={<AdminRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

const AdminRedirect = () => {
  React.useEffect(() => {
    window.location.href = '/admin/';
  }, []);
  return <div className="min-h-screen bg-background-cream"></div>;
};

export default App;
