import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheckCircle, faRocket, faGift } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const checkVisit = () => {
            // Check if user is already "subscribed" (has a name saved)
            const savedGuestName = localStorage.getItem('guestName');

            if (savedGuestName) {
                // If we know the user, skip capture and go to Success
                navigate('/thank-you', { state: { guestName: savedGuestName } });
                return;
            }

            const firstVisitIso = localStorage.getItem('firstVisitIso');
            const hasClaimedToday = sessionStorage.getItem('claimedToday');

            if (!firstVisitIso) {
                localStorage.setItem('firstVisitIso', new Date().toISOString());
                setStatus('first');
            } else if (!hasClaimedToday) {
                setStatus('returning');
            } else {
                setStatus('first');
            }
        };
        checkVisit();
    }, [navigate]);

    if (status === 'loading') return null;

    // Determine current discount based on status (Mock logic for UI demo)
    const currentDiscount = status === 'returning' ? 20 : 5;
    const nextDiscount = status === 'returning' ? 25 : 20;

    return (
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased overflow-x-hidden relative">

            {/* Header */}
            <div className="pt-8 px-6 flex items-center gap-2 mb-4">
                <div className="flex flex-col leading-none">
                    <span className="font-black text-xl tracking-tighter">Friendly</span>
                    <span className="font-black text-xl tracking-tighter">Code</span>
                </div>
                <FontAwesomeIcon icon={faLeaf} className="text-[#81C784] text-xl" />
            </div>

            {/* Main Content Scrollable Area */}
            <div className="flex-grow flex flex-col px-6 pb-32">

                {/* Hero */}
                <div className="text-center mb-8">
                    <h1 className="text-[32px] font-black leading-tight mb-2">
                        {t('your_discount_today').split(':')[0]}: <span className="text-[#E68A00]">5%</span>
                    </h1>
                    <p className="text-[#4E342E] opacity-60 font-medium text-sm">
                        {t('want_max_discount')}
                    </p>
                </div>

                {/* Gauge Visual */}
                <div className="relative w-full h-48 flex items-center justify-center mb-12">
                    <svg viewBox="0 0 200 120" className="w-64 h-40 overflow-visible">
                        {/* Background Track (Thick & Soft) */}
                        <path
                            d="M 30 100 A 70 70 0 0 1 170 100"
                            fill="none"
                            stroke="#E68A00"
                            strokeOpacity="0.15"
                            strokeWidth="24"
                            strokeLinecap="round"
                        />

                        {/* Progress Arch (Aligned precisely with background radius) */}
                        <path
                            d="M 30 100 A 70 70 0 0 1 30.9 89.1"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="24"
                            strokeLinecap="round"
                        />

                        {/* Gradient Definition */}
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#E68A00" />
                                <stop offset="100%" stopColor="#81C784" />
                            </linearGradient>
                        </defs>

                        {/* Needle (Substantial, rounded design) */}
                        <circle cx="100" cy="100" r="12" fill="#4E342E" />
                        <path
                            d="M 100 108 L 45 92 L 100 92 Z"
                            fill="#4E342E"
                        />

                        {/* Labels positioned relative to the sweep */}
                        <text x="100" y="85" textAnchor="middle" className="text-[32px] font-black fill-[#4E342E]">5%</text>
                        <text x="175" y="80" textAnchor="middle" className="text-[12px] font-bold fill-[#4E342E] opacity-40">20%</text>
                    </svg>
                </div>

                {/* Timeline List */}
                <div className="space-y-4">
                    <TimelineItem
                        isCompleted={true}
                        text={t('today_val')}
                        color="bg-white border-[#81C784]"
                        iconColor="text-[#81C784]"
                        icon={faCheckCircle}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('tomorrow_val')}
                        isNext={true}
                        color="bg-white border-[#E68A00]/40"
                        iconColor="text-[#E68A00]"
                        icon={faGift}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('in_3_days')}
                        color="bg-white/40 border-[#4E342E]/10"
                        iconColor="text-[#4E342E]/30"
                        icon={faGift}
                    />
                    <TimelineItem
                        isCompleted={false}
                        text={t('in_7_days')}
                        color="bg-white/40 border-[#4E342E]/10"
                        iconColor="text-[#4E342E]/30"
                        icon={faGift}
                    />
                </div>

                <p className="text-center text-xs font-bold opacity-40 mt-8 max-w-[240px] mx-auto leading-relaxed uppercase tracking-wider">
                    {t('footer_motivation')}
                </p>
            </div>

            {/* Sticky CTA */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#FFF8E1] via-[#FFF8E1] to-transparent pb-8">
                <button
                    onClick={() => navigate('/activate')}
                    className="w-full h-[64px] bg-[#E68A00] text-white rounded-[20px] font-black text-[18px] active:scale-[0.98] transition-all shadow-xl shadow-[#E68A00]/30 uppercase flex items-center justify-center gap-3"
                >
                    <FontAwesomeIcon icon={faRocket} />
                    {t('get_my_discount')}
                </button>
            </div>
        </div>
    );
};

const TimelineItem = ({ isCompleted, text, isNext, color, iconColor, icon }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${color} ${isNext ? 'shadow-xl shadow-[#E68A00]/10 scale-[1.02]' : ''}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-[#81C784]' : 'bg-[#4E342E]/5'}`}>
                <FontAwesomeIcon icon={icon || (isCompleted ? faCheckCircle : faGift)} className={`${isCompleted ? 'text-white' : iconColor} text-sm`} />
            </div>
            <span className={`font-bold text-lg ${isNext ? 'text-[#4E342E]' : 'text-[#4E342E]/70'}`}>
                {text}
            </span>
        </motion.div>
    );
};

export default LandingPage;
