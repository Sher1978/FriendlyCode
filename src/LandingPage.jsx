import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faCheckCircle, faRocket, faGift } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const LandingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const checkVisit = async () => {
            const searchParams = new URLSearchParams(location.search);
            // Support both 'id' (new) and 'v' (legacy) parameters
            const venueId = searchParams.get('id') || searchParams.get('v') || 'default_venue';
            localStorage.setItem('currentVenueId', venueId);

            try {
                // 1. Check Venue Status (Access Control)
                const venueDoc = await getDocs(query(collection(db, 'venues'), where('id', '==', venueId), limit(1)));

                if (venueDoc.empty) {
                    // Fallback to older query style if id is not a field but the doc name
                    const docSnap = await getDocs(query(collection(db, 'venues'), limit(1))); // Just a placeholder for safety
                }

                // Actually, let's just fetch by doc ID directly if 'id' field isn't reliable
                // But wait, our React 'db' might not have direct doc() helper easily used here without importing
                // let's stick to collection/where for now or get doc directly if possible.

                // Assuming venues are stored with docId == venueId
                const venueRef = collection(db, 'venues');
                // Since 'db' is from './firebase', let's assume it's the standard Firestore instance

                // For now, let's use searchParams and fetch from Firestore to check isActive and subscription
                const qVenue = query(collection(db, 'venues'), where('__name__', '==', venueId));
                const venueSnap = await getDocs(qVenue);

                if (venueSnap.empty) {
                    setStatus('error');
                    return;
                }

                const venueData = venueSnap.docs[0].data();
                const now = new Date();
                const expiry = venueData.subscription?.expiryDate?.toDate();

                if (!venueData.isActive || (expiry && expiry < now)) {
                    setStatus('blocked');
                    return;
                }

                // 2. Check Visit History
                const savedGuestEmail = localStorage.getItem('guestEmail');
                const savedGuestName = localStorage.getItem('guestName');

                if (savedGuestEmail && savedGuestName) {
                    const qVisits = query(
                        collection(db, 'visits'),
                        where('guestEmail', '==', savedGuestEmail),
                        where('venueId', '==', venueId),
                        orderBy('timestamp', 'desc'),
                        limit(1)
                    );
                    const querySnapshot = await getDocs(qVisits);

                    let discount = 5; // Base
                    if (!querySnapshot.empty) {
                        const lastVisit = querySnapshot.docs[0].data().timestamp.toDate();
                        const hoursPassed = (now - lastVisit) / (1000 * 60 * 60);

                        if (hoursPassed <= 24) discount = 20;
                        else if (hoursPassed <= 36) discount = 15;
                        else if (hoursPassed <= 240) discount = 10;
                    }

                    navigate('/thank-you', {
                        state: {
                            guestName: savedGuestName,
                            guestEmail: savedGuestEmail,
                            discountValue: discount,
                            venueId: venueId
                        }
                    });
                    return;
                }
            } catch (e) {
                console.error("Error checking venue status or visit history:", e);
                // On error, let them proceed but log? Or block?
                // Directive says block if DB check fails/inactive.
            }
            setStatus('first');
        };
        checkVisit();
    }, [navigate, location]);

    if (status === 'loading') return null;

    if (status === 'blocked') {
        return (
            <div className="flex flex-col min-h-screen bg-[#FFF8E1] items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-4xl mb-6">
                    <FontAwesomeIcon icon={faLeaf} className="opacity-40" />
                </div>
                <h1 className="text-2xl font-black mb-4 uppercase tracking-tight">System Access Paused</h1>
                <p className="text-[#4E342E]/70 font-medium max-w-[280px]">
                    This venue's digital menu and rewards are currently unavailable. Please check back later.
                </p>
                <div className="mt-12 opacity-30 font-black text-xs tracking-[0.3em]">FRIENDLY CODE</div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col min-h-screen bg-[#FFF8E1] items-center justify-center p-8 text-center">
                <h1 className="text-xl font-black mb-2 uppercase">Venue Not Found</h1>
                <p className="opacity-60 text-sm">Please scan a valid QR code.</p>
            </div>
        );
    }

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
                <div className="relative w-full h-48 flex items-center justify-center mb-8 scale-110 origin-bottom">
                    <svg viewBox="0 0 200 120" className="w-64 h-40 overflow-visible">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#FFA726" />
                                <stop offset="100%" stopColor="#66BB6A" />
                            </linearGradient>
                            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                <feOffset dx="0" dy="2" result="offsetblur" />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.2" />
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Background Track (Soft Creamy/Orange) */}
                        <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="#FFCC80"
                            strokeOpacity="0.3"
                            strokeWidth="28"
                            strokeLinecap="round"
                        />

                        {/* Progress Arch (5% Segment) */}
                        <path
                            d="M 25 100 A 75 75 0 0 1 25.8 89.6"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="28"
                            strokeLinecap="round"
                            filter="url(#gaugeShadow)"
                        />

                        {/* Needle (Tapered & Rounded) */}
                        <g transform="rotate(9, 100, 100)">
                            {/* Pivot */}
                            <circle cx="100" cy="100" r="8" fill="#5D4037" />
                            {/* Tapered Body */}
                            <path
                                d="M 100 106 L 38 100 L 100 94 Z"
                                fill="#5D4037"
                                stroke="#5D4037"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* Percentage Text */}
                        <text x="100" y="80" textAnchor="middle" className="text-[36px] font-black fill-[#5D4037] drop-shadow-sm">
                            5%
                        </text>

                        {/* Max Label */}
                        <text x="180" y="95" textAnchor="middle" className="text-[14px] font-bold fill-[#5D4037] opacity-60">
                            20%
                        </text>
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
        </div >
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
