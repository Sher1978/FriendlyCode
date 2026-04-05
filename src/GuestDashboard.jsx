import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faGaugeHigh, 
    faCrown, 
    faMapLocationDot, 
    faArrowLeft,
    faWallet,
    faChartLine,
    faBolt,
    faCircleCheck,
    faClock
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth, db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUserStatuses } from './hooks/useUserStatuses';

const GuestDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [userStats, setUserStats] = useState({
        totalVenues: 0,
        avgDiscount: 0,
        totalVisits: 0
    });
    const { statuses, loading } = useUserStatuses(100); // Fetch more for stats computation

    useEffect(() => {
        if (statuses.length > 0) {
            const venues = new Set(statuses.map(s => s.venueId));
            const totalDiscount = statuses.reduce((acc, s) => acc + s.discount, 0);
            setUserStats({
                totalVenues: venues.size,
                avgDiscount: Math.round(totalDiscount / statuses.length),
                totalVisits: statuses.length
            });
        }
    }, [statuses]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-[#00FF41]/30 overflow-x-hidden">
            {/* Background Tech Watermark (20% Battery) */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-[150%] h-[150%] transform -rotate-12 translate-x-20">
                    <path 
                        d="M20,30 H75 V70 H20 Z M75,40 H80 V60 H75 Z M25,35 H35 V65 H25 Z" 
                        fill="none" 
                        stroke="#00FF41" 
                        strokeWidth="1.5"
                    />
                    <text x="45" y="55" fontSize="12" fill="#00FF41" fontWeight="900" textAnchor="middle">REVOO TECH</text>
                </svg>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/')}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-sm opacity-60" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.4em] text-[#00FF41]">Guest Panel</h1>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Digital Ecosystem 2.0</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#00FF41]/10 flex items-center justify-center border border-[#00FF41]/20">
                    <FontAwesomeIcon icon={faBolt} className="text-[#00FF41] text-xs animate-pulse" />
                </div>
            </header>

            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 p-6 space-y-8 max-w-lg mx-auto pb-32"
            >
                {/* Profile Section */}
                <motion.section variants={itemVariants} className="flex items-center space-x-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#00FF41]/20 to-transparent border border-[#00FF41]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,65,0.1)]">
                            <span className="text-3xl font-black text-[#00FF41]">
                                {auth.currentUser?.displayName?.[0] || 'G'}
                            </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faCircleCheck} className="text-[#00FF41] text-[10px]" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">
                            {auth.currentUser?.displayName || 'REVOO Guest'}
                        </h2>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                            {auth.currentUser?.email || 'Guest Session'}
                        </p>
                    </div>
                </motion.section>

                {/* Stats Grid */}
                <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 relative overflow-hidden group hover:border-[#00FF41]/20 transition-colors">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FF41] blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity" />
                        <FontAwesomeIcon icon={faChartLine} className="text-[#00FF41] mb-4 opacity-50" />
                        <p className="text-3xl font-black text-white">{userStats.totalVenues}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Venues Visited</p>
                    </div>
                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 relative overflow-hidden group hover:border-[#00FF41]/20 transition-colors">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FF41] blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity" />
                        <FontAwesomeIcon icon={faWallet} className="text-[#00FF41] mb-4 opacity-50" />
                        <p className="text-3xl font-black text-white">{userStats.avgDiscount}%</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Avg Reward</p>
                    </div>
                </motion.section>

                {/* Savings Estimation & Progress */}
                <motion.section variants={itemVariants} className="p-8 rounded-[40px] bg-gradient-to-br from-[#00FF41]/10 via-transparent to-transparent border border-[#00FF41]/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[10px] text-[#00FF41] font-black uppercase tracking-[0.4em] mb-1">REVOO Impact</p>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Savings Estimator</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-[#00FF41] tracking-tighter">${userStats.totalVisits * 15}</p>
                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Est. Reward Value</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-white/40">Loyalty Milestone</span>
                                <span className="text-[#00FF41]">{userStats.totalVisits % 5}/5 Visits</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(userStats.totalVisits % 5) * 20}%` }}
                                    className="h-full bg-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.5)]"
                                />
                            </div>
                            <p className="text-[9px] text-white/20 italic font-bold">Next milestone unlocks Elite status badge.</p>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#00FF41] blur-[100px] opacity-[0.05]" />
                </motion.section>

                {/* Active Statuses Section */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 px-2">Active Roles</h3>
                        <div className="h-px flex-1 bg-white/5 ml-4" />
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            [1, 2].map(i => (
                                <div key={i} className="h-24 rounded-[28px] bg-white/5 animate-pulse border border-white/5" />
                            ))
                        ) : statuses.length > 0 ? (
                            statuses.slice(0, 3).map((status, idx) => (
                                <div 
                                    key={idx}
                                    className="p-5 rounded-[28px] bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 flex items-center justify-between group hover:border-[#00FF41]/10 transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:bg-[#00FF41]/5 transition-colors">
                                            <span className="text-xl font-black text-[#00FF41]">{status.discount}%</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/40 uppercase tracking-widest font-black mb-0.5">{status.venueName}</p>
                                            <p className="text-sm font-bold tracking-tight">Verified Membership</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Expires in</p>
                                        <p className="text-[10px] text-[#00FF41] font-black uppercase tracking-widest">
                                            {Math.ceil((status.expiry - new Date()) / (1000 * 60 * 60 * 24))} Days
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[32px]">
                                <FontAwesomeIcon icon={faClock} className="text-2xl mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">No active sessions</p>
                                <p className="text-[10px] mt-2">Visit a venue to activate your loyalty status.</p>
                            </div>
                        )}
                    </div>
                </motion.section>

                {/* Navigation Grid */}
                <motion.section variants={itemVariants} className="pt-4 grid grid-cols-1 gap-4">
                    <button 
                        onClick={() => navigate('/map')}
                        className="w-full p-6 rounded-[32px] bg-[#00FF41] text-black hover:bg-[#00FF41]/90 active:scale-[0.98] transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faMapLocationDot} className="text-xl" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black uppercase tracking-tight">Find Venues</p>
                                <p className="text-[10px] font-bold opacity-60">Interactive Map View</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faArrowLeft} className="rotate-180 text-xs" />
                        </div>
                    </button>
                </motion.section>
            </motion.main>
        </div>
    );
};

export default GuestDashboard;
