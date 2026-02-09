import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheck, faClock, faLock, faRocket, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const checkVisit = () => {
            const firstVisitIso = localStorage.getItem('firstVisitIso');
            const hasClaimedToday = sessionStorage.getItem('claimedToday');

            if (!firstVisitIso) {
                localStorage.setItem('firstVisitIso', new Date().toISOString());
                setStatus('first');
            } else if (!hasClaimedToday) {
                setStatus('returning');
            } else {
                setStatus('first'); // or 'unlocked' if we want to bypass landing
            }
        };
        checkVisit();
    }, []);

    if (status === 'loading') return null;

    if (status === 'returning') {
        return <ReturningView t={t} onClaim={() => {
            sessionStorage.setItem('claimedToday', 'true');
            navigate('/activate');
        }} />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased">
            <div className="flex-grow flex flex-col items-center justify-between px-6 py-12">
                <div className="flex-grow flex flex-col items-center justify-center w-full">
                    {/* Hero Text / Logo */}
                    <div className="text-center">
                        <h1 className="text-[56px] font-black leading-[0.85] tracking-tighter text-[#4E342E]">
                            FRIENDLY<br />CODE
                        </h1>
                    </div>

                    <div className="mt-12 text-center space-y-1">
                        <p className="text-[24px] font-light text-[#4E342E]">
                            {t('dont_be_customer')}
                        </p>
                        <p className="text-[24px] font-black text-[#E68A00]">
                            {t('be_a_guest')}
                        </p>
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-8">
                    {/* Value Prop Block */}
                    <div className="bg-white/80 backdrop-blur-sm border border-[#E68A00]/10 rounded-2xl p-5 flex items-center justify-center gap-3 shadow-sm">
                        <FontAwesomeIcon icon={faLock} className="text-[#E68A00] text-lg" />
                        <span className="text-[16px] font-bold text-[#4E342E]">
                            {t('no_downloads')}
                        </span>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => navigate('/activate')}
                        className="w-full h-[64px] bg-[#E68A00] text-white rounded-[18px] font-black text-[20px] active:scale-[0.98] transition-all shadow-lg shadow-[#E68A00]/20 uppercase"
                    >
                        {t('get_status')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReturningView = ({ t, onClaim }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF8E1] p-6 text-center text-[#4E342E]">
            <div className="flex items-center gap-2 mb-12">
                <FontAwesomeIcon icon={faLeaf} className="text-[#81C784] text-xl" />
                <div className="leading-[0.9] text-sm font-bold uppercase tracking-tight">
                    Friendly<br />Code
                </div>
            </div>

            <h1 className="text-4xl font-black mb-2">{t('returning_title')}</h1>
            <p className="text-lg opacity-70 mb-12 font-medium">{t('returning_thanks')}</p>

            <div className="bg-white p-10 rounded-[32px] shadow-xl shadow-[#4E342E]/5 w-full max-w-sm mb-12 border border-[#4E342E]/5">
                <p className="text-sm font-bold uppercase tracking-widest opacity-40 mb-2">
                    {t('returning_discount')}
                </p>
                <div className="text-7xl font-black text-[#E68A00]">20%</div>
            </div>

            <button
                onClick={onClaim}
                className="w-full max-w-sm h-[64px] bg-[#E68A00] text-white rounded-[18px] flex items-center justify-center gap-3 font-black text-[20px] shadow-lg shadow-[#E68A00]/20 active:scale-95 transition-transform uppercase"
            >
                <FontAwesomeIcon icon={faRocket} />
                {t('claim_gift')}
            </button>
        </div>
    );
};

export default LandingPage;
