import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheck, faClock, faLock, faRocket, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
    const { t, i18n } = useTranslation();
    const [status, setStatus] = useState('first');
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        const checkVisit = () => {
            const firstVisitIso = localStorage.getItem('firstVisitIso');
            const hasClaimedReturn = sessionStorage.getItem('claimedToday');

            if (!firstVisitIso) {
                localStorage.setItem('firstVisitIso', new Date().toISOString());
                setStatus('first');
            } else if (!hasClaimedReturn) {
                // If they have a first visit but haven't claimed today, they are "returning"
                setStatus('returning');
            } else {
                const firstVisit = new Date(firstVisitIso);
                const diffInHours = (new Date() - firstVisit) / (1000 * 60 * 60);
                if (diffInHours >= 24) {
                    setStatus('unlocked');
                } else {
                    setStatus('tooSoon');
                }
            }
            setIsLoading(false);
        };

        checkVisit();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-cream">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
            </div>
        );
    }

    if (status === 'returning') {
        return <ReturningView t={t} onClaim={() => {
            sessionStorage.setItem('claimedToday', 'true');
            setStatus('unlocked');
        }} />;
    }

    const headline = status === 'unlocked' ? t('b2c_headline_20') : t('b2c_headline_5');
    const subhead = status === 'unlocked' ? t('b2c_subhead_unlocked') : (status === 'tooSoon' ? t('b2c_subhead_soon') : t('b2c_subhead_first'));
    const gaugeText = status === 'unlocked' ? '20%' : '5%';
    const show20Percent = status === 'unlocked';

    return (
        <div className="flex flex-col min-h-screen bg-background-cream font-sans text-brand-brown antialiased">
            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto px-6 py-4 flex flex-col items-center">
                <div className="w-full max-w-md flex flex-col items-center">
                    {/* Header */}
                    <div className="w-full flex justify-between items-center mt-2 px-2">
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faLeaf} className="text-[#81C784] text-xl" />
                            <div className="leading-[0.9] text-sm font-bold uppercase tracking-tight">
                                Friendly<br />Code
                            </div>
                        </div>

                        <button
                            onClick={toggleLanguage}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 text-brand-brown/70 hover:bg-white transition shadow-sm"
                        >
                            <span className="text-xs font-bold uppercase">{i18n.language}</span>
                        </button>
                    </div>

                    {/* Headline */}
                    <h1 className="text-3xl font-black text-center mt-10 whitespace-pre-line leading-[1.1]">
                        {headline}
                    </h1>
                    <p className="text-center mt-3 text-lg font-medium opacity-80 px-4">
                        {subhead}
                    </p>

                    {/* Gauge (SVG Port of CustomPainter) */}
                    <div className="relative w-[280px] h-[160px] mt-8 flex items-end justify-center">
                        <svg width="280" height="140" viewBox="0 0 280 140" className="absolute bottom-0">
                            {/* Track */}
                            <path
                                d="M 20 140 A 120 120 0 0 1 260 140"
                                fill="none"
                                stroke="#D1D5DB"
                                strokeWidth="20"
                                strokeLinecap="round"
                                className="opacity-20"
                            />
                            {/* Gradient Arc */}
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#E68A00" />
                                    <stop offset="100%" stopColor="#81C784" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M 20 140 A 120 120 0 0 1 260 140"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="20"
                                strokeLinecap="round"
                            />
                            {/* Labels */}
                            <text x="35" y="125" className="fill-brand-brown text-[24px] font-black">5%</text>
                            <text x="210" y="125" className="fill-brand-brown text-[24px] font-black">20%</text>
                        </svg>

                        {/* Needle */}
                        <div
                            className="absolute bottom-0 w-1.5 h-[95px] bg-brand-brown origin-bottom transition-transform duration-700 ease-out"
                            style={{
                                transform: `rotate(${show20Percent ? '75deg' : '-65deg'})`,
                                borderRadius: '3px'
                            }}
                        ></div>
                        {/* Pivot */}
                        <div className="absolute bottom-0 w-5 h-5 bg-brand-brown rounded-full translate-y-2"></div>

                        {/* Center Text */}
                        <div className="absolute inset-x-0 bottom-4 text-center">
                            <span className="text-5xl font-black">{gaugeText}</span>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="w-full mt-12 space-y-3">
                        <DiscountStep
                            label={t('b2c_step_today_5')}
                            icon={faCheck}
                            isActive={true}
                            isHighlighted={!show20Percent}
                        />
                        <DiscountStep
                            label={t('b2c_step_tmrw_20')}
                            icon={show20Percent ? faCheck : faClock}
                            isActive={true}
                            isHighlighted={show20Percent}
                        />
                        <DiscountStep
                            label={t('b2c_step_3d_15')}
                            icon={faClock}
                            isActive={true}
                            isHighlighted={false}
                        />
                        <DiscountStep
                            label={t('b2c_step_7d_10')}
                            icon={faClock}
                            isActive={true}
                            isHighlighted={false}
                        />
                    </div>

                    <p className="text-center mt-6 text-sm font-medium opacity-70">
                        {t('b2c_footer_hint')}
                    </p>

                    <button
                        onClick={() => navigate('/partner')}
                        className="mt-16 px-8 py-4 border-2 border-brand-brown text-brand-brown bg-transparent rounded-2xl font-black hover:bg-brand-brown hover:text-white transition flex items-center justify-center gap-3 uppercase tracking-tight shadow-sm"
                    >
                        <span className="text-xl">🤝</span>
                        {t('become_partner')}
                    </button>
                </div>
                <div className="h-16"></div> {/* Tightened spacer for sticky footer */}
            </div>

            {/* Sticky Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-background-cream/95 backdrop-blur-sm shadow-[0_-10px_20px_rgba(78,52,46,0.08)]">
                <button
                    onClick={() => navigate('/activate')}
                    className="w-full h-14 bg-brand-orange text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-lg active:scale-95 transition-transform shadow-lg"
                >
                    <FontAwesomeIcon icon={faRocket} className="text-xl" />
                    {t('get_reward')}
                </button>
            </div>
        </div>
    );
};

const DiscountStep = ({ label, icon, isActive, isHighlighted }) => (
    <div
        className={`flex items-center p-4 rounded-xl border-2 transition-all shadow-sm ${isActive ? 'opacity-100' : 'opacity-50'
            } ${isHighlighted ? 'bg-white border-brand-orange/30' : 'bg-white/60 border-transparent'
            }`}
    >
        <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] text-white ${isHighlighted ? 'bg-[#81C784]' : 'bg-gray-400'
            }`}>
            <FontAwesomeIcon icon={icon} />
        </div>
        <span className={`ml-4 text-base ${isHighlighted ? 'font-bold' : 'font-semibold'}`}>
            {label}
        </span>
    </div>
);

const ReturningView = ({ t, onClaim }) => {
    const [view, setView] = useState('claim'); // claim, waiting, success
    const [timeLeft, setTimeLeft] = useState(300); // 5 min

    useEffect(() => {
        let timer;
        if (view === 'waiting' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [view, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleClaim = () => {
        setView('waiting');
        // Mock Owner Confirmation after 5 seconds
        setTimeout(() => {
            setView('success');
        }, 5000);
    };

    if (view === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-cream p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-[#81C784] rounded-full flex items-center justify-center text-white mb-6">
                    <FontAwesomeIcon icon={faCheck} size="2x" />
                </div>
                <h1 className="text-3xl font-black mb-4">{t('visit_confirmed')}</h1>
                <p className="text-lg opacity-80 mb-8">
                    {t('next_discount_hint', { percent: 20 })}
                </p>
                <button
                    onClick={onClaim}
                    className="text-sm font-bold text-brand-brown/50 underline"
                >
                    {t('error_report_btn')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-cream p-6 text-center">
            <div className="flex items-center gap-2 mb-12">
                <FontAwesomeIcon icon={faLeaf} className="text-[#81C784] text-xl" />
                <div className="leading-[0.9] text-sm font-bold uppercase tracking-tight text-brand-brown">
                    Friendly<br />Code
                </div>
            </div>

            <h1 className="text-4xl font-black mb-2">{t('returning_title')}</h1>
            <p className="text-lg opacity-70 mb-12">{t('returning_thanks')}</p>

            <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-sm mb-12">
                <p className="text-sm font-bold uppercase tracking-widest text-brand-brown/40 mb-2">
                    {t('returning_discount')}
                </p>
                <div className="text-7xl font-black text-brand-orange">15%</div>
            </div>

            {view === 'claim' ? (
                <button
                    onClick={handleClaim}
                    className="w-full max-w-sm h-16 bg-brand-orange text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-xl shadow-lg active:scale-95 transition"
                >
                    <FontAwesomeIcon icon={faRocket} />
                    {t('claim_gift')}
                </button>
            ) : (
                <div className="w-full max-w-sm">
                    <div className="text-5xl font-black mb-4 font-mono">{formatTime(timeLeft)}</div>
                    <p className="text-sm font-bold text-brand-brown opacity-60 mb-2 uppercase tracking-tighter">
                        {t('waiting_owner')}
                    </p>
                    <p className="text-xs opacity-50 italic">
                        {t('confirm_timer')}
                    </p>
                </div>
            )}

            <button
                className="mt-12 text-sm font-medium text-brand-brown/40 hover:text-brand-brown transition"
                onClick={() => alert("Report incident log generated and sent to owner/admin.")}
            >
                {t('error_report_btn')}
            </button>
        </div>
    );
};

export default LandingPage;
