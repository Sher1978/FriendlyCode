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
        <div className="flex flex-col h-screen bg-[#FFF2E2] font-sans text-[#4E342E] antialiased overflow-hidden">
            <div className="flex-grow flex flex-col items-center justify-between px-6 py-8">
                <div className="w-full flex flex-col items-center">
                    {/* Header */}
                    <div className="w-full flex justify-start items-center px-2">
                        <a
                            href="https://www.friendlycode.fun"
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity no-underline"
                        >
                            <FontAwesomeIcon icon={faLeaf} className="text-[#81C784] text-xl" />
                            <div className="leading-[0.9] text-sm font-bold uppercase tracking-tight text-[#4E342E]">
                                Friendly<br />Code
                            </div>
                        </a>
                    </div>

                    {/* Headline */}
                    <div className="mt-8 text-center">
                        <h1 className="text-[36px] font-black leading-[1.05] tracking-tight text-[#4E342E] whitespace-pre-line">
                            {headline}
                        </h1>
                        <p className="mt-3 text-[19px] font-bold opacity-80 text-[#4E342E]">
                            {subhead}
                        </p>
                    </div>

                    {/* Gauge (Strictly Matching Image) */}
                    <div className="relative w-full max-w-[340px] aspect-[1.8/1] mt-10 flex items-end justify-center">
                        <svg width="100%" height="100%" viewBox="0 0 300 150" className="absolute bottom-0 scale-110">
                            {/* Track */}
                            <path
                                d="M 40 140 A 110 110 0 0 1 260 140"
                                fill="none"
                                stroke="#E0E0E0"
                                strokeWidth="22"
                                strokeLinecap="round"
                                className="opacity-50"
                            />
                            {/* Gradient Arc */}
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#FFA133" />
                                    <stop offset="100%" stopColor="#8BD38E" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M 40 140 A 110 110 0 0 1 260 140"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="22"
                                strokeLinecap="round"
                            />
                            {/* Marker Line for 20% */}
                            <line x1="242" y1="102" x2="252" y2="98" stroke="#4E342E" strokeWidth="4" className="opacity-40" />

                            {/* Labels */}
                            <text x="54" y="125" className="fill-[#4E342E] text-[14px] font-black opacity-40">5%</text>
                            <text x="218" y="105" className="fill-[#4E342E] text-[14px] font-black opacity-40">20%</text>
                        </svg>

                        {/* Needle */}
                        <div
                            className="absolute bottom-2 w-2.5 h-[100px] bg-[#4E342E]/80 origin-bottom transition-transform duration-700 ease-out z-10"
                            style={{
                                transform: `rotate(${show20Percent ? '75deg' : '-65deg'}) translate(-50%, 0)`,
                                left: '50%',
                                borderRadius: '15px 15px 4px 4px'
                            }}
                        ></div>
                        {/* Pivot */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#4E342E]/20 rounded-full translate-y-2"></div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#4E342E] rounded-full translate-y-1 z-20"></div>

                        {/* Center Text */}
                        <div className="absolute inset-x-0 bottom-6 text-center">
                            <span className="text-[64px] font-black text-[#4E342E] tracking-tighter">{gaugeText}</span>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="w-full mt-10 space-y-4 px-2">
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

                    <p className="text-center mt-8 text-[15px] font-bold text-[#4E342E] opacity-70 px-4 leading-snug">
                        {t('b2c_footer_hint')}
                    </p>
                </div>

                {/* Bottom CTA (Fixed Position replaced by flex) */}
                <div className="w-full mt-4">
                    <button
                        onClick={() => navigate('/activate')}
                        className="w-full h-[68px] bg-[#D68A3E] text-white rounded-[18px] flex items-center justify-center gap-3 font-black text-[20px] active:scale-95 transition-transform shadow-[0_8px_20px_rgba(214,138,62,0.3)] uppercase tracking-tight"
                    >
                        <FontAwesomeIcon icon={faRocket} className="text-2xl" />
                        {t('get_reward')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DiscountStep = ({ label, icon, isActive, isHighlighted }) => (
    <div
        className={`flex items-center p-5 rounded-[22px] transition-all w-full border border-[#4E342E]/5 ${isActive ? 'opacity-100' : 'opacity-50'
            } ${isHighlighted ? 'bg-white shadow-[0_4px_12px_rgba(78,52,46,0.06)]' : 'bg-white/60'
            }`}
    >
        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] text-white bg-[#A5D6A7]`}>
            <FontAwesomeIcon icon={faCheck} />
        </div>
        <span className={`ml-4 text-[18px] font-bold text-[#4E342E] tracking-tight`}>
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
