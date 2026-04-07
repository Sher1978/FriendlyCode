import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCircleUser, 
    faChevronRight,
    faXmark,
    faChartLine,
    faCrown,
    faMapLocationDot,
    faGear,
    faRightFromBracket,
    faRightToBracket,
    faAward,
    faCalendarAlt,
    faInfoCircle,
    faBolt,
    faGaugeHigh
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStatuses } from './hooks/useUserStatuses';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const UserMenu = ({ user, trigger, isGuestView, venueColor = '#00FF41' }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const { statuses, loading, loadingMore, hasMore, loadMore } = useUserStatuses(5);
    const observerTarget = useRef(null);

    // Color utility for background variants
    const getAccentColor = () => venueColor;

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadMore, showStatusDetails]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsOpen(false);
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const StatusDetailsModal = () => (
        <AnimatePresence>
            {showStatusDetails && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[200] bg-black flex flex-col"
                >
                    {/* Background Tech Watermark (Dynamic Green) */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.02]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-[200px] rounded-full blur-[150px]" style={{ borderColor: getAccentColor() }} />
                    </div>

                    {/* Header */}
                    <div className="p-6 pt-12 md:pt-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(0,0,0,0.1)]" style={{ backgroundColor: `${getAccentColor()}10`, borderColor: `${getAccentColor()}20` }}>
                                <FontAwesomeIcon icon={faAward} className="w-6 h-6" style={{ color: getAccentColor() }} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('menu_my_statuses', 'My Statuses')}</h2>
                                <p className="text-[10px] uppercase tracking-[0.3em] font-black" style={{ color: getAccentColor() }}>{t('status_archive', 'Digital Loyalty Vault')}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowStatusDetails(false)}
                            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
                        <div className="max-w-3xl mx-auto space-y-6 pb-20">
                            {loading && statuses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-40">
                                    <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mb-6" style={{ borderColor: getAccentColor(), borderTopColor: 'transparent' }} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse" style={{ color: getAccentColor() }}>Synchronizing Data...</p>
                                </div>
                            ) : statuses.length > 0 ? (
                                <>
                                    {statuses.map((status, idx) => (
                                        <motion.div
                                            key={status.id || idx}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-6 rounded-[32px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 blur-[100px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" style={{ backgroundColor: getAccentColor() }} />
                                            
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                        <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-white/40" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Captured On</p>
                                                        <p className="text-white font-bold text-sm">{status.lastVisit?.toLocaleDateString() || 'Recent Activity'}</p>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: getAccentColor() }} />
                                                    Verified Session
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">{status.venueName}</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-3xl font-black" style={{ color: getAccentColor() }}>{status.discount}%</p>
                                                        <p className="text-[10px] font-black opacity-50" style={{ color: getAccentColor() }}>OFF</p>
                                                    </div>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-center">
                                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Tier Level</p>
                                                    <p className="text-sm font-black text-white uppercase tracking-tighter">
                                                        {status.discount >= 20 ? 'REVOO ELITE' : 'ACTIVE MEMBER'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <FontAwesomeIcon icon={faBolt} className="text-[10px]" style={{ color: getAccentColor() }} />
                                                    <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.1em]">Status active for 30 days post-visit</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    
                                    {/* Infinite Scroll Trigger */}
                                    <div ref={observerTarget} className="py-10 flex flex-col items-center">
                                        {loadingMore ? (
                                            <>
                                                <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: `${getAccentColor()}20`, borderTopColor: getAccentColor() }} />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50" style={{ color: getAccentColor() }}>Fetching Archive...</p>
                                            </>
                                        ) : hasMore ? (
                                            <div className="h-20" />
                                        ) : (
                                            <div className="text-center opacity-20 py-10">
                                                <div className="w-1 h-8 mx-auto mb-4" style={{ backgroundColor: getAccentColor() }} />
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">End of Records</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="py-40 text-center opacity-30">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/5">
                                        <FontAwesomeIcon icon={faAward} className="text-4xl" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">Vault is Empty</p>
                                    <p className="text-xs mt-4 max-w-[240px] mx-auto leading-relaxed">
                                        Visit REVOO partner venues to start building your digital privilege history.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Footer */}
                    <div className="p-6 bg-black border-t border-white/10 relative z-20">
                        <div className="max-w-3xl mx-auto flex items-start space-x-4 opacity-50">
                            <FontAwesomeIcon icon={faInfoCircle} className="mt-1" style={{ color: getAccentColor() }} />
                            <p className="text-[10px] leading-relaxed uppercase tracking-wider font-bold">
                                {t('status_disclaimer', 'This is an immutable ledger of your statuses. Information is synced in real-time across the REVOO ecosystem.')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative z-[100]">
            {/* Trigger Button */}
            {trigger ? (
                <div onClick={() => setIsOpen(true)}>
                    {trigger}
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white/80 active:scale-90 transition-all shadow-lg"
                >
                    <FontAwesomeIcon icon={faCircleUser} className="text-[20px]" />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                        />

                        {/* Dropdown Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, x: -20, y: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20, y: -20 }}
                            className="absolute top-0 left-0 w-[85vw] max-w-[320px] bg-[#121214] border border-white/10 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 border rounded-full flex items-center justify-center" style={{ backgroundColor: `${getAccentColor()}20`, borderColor: `${getAccentColor()}20`, color: getAccentColor() }}>
                                        <FontAwesomeIcon icon={faCircleUser} className="text-lg" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-white uppercase tracking-tight">{user?.displayName || 'REVOO Guest'}</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: getAccentColor() }}>Verified Profile</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-white/20 transition-colors">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>

                            {/* Menu Body */}
                            <div className="p-4 space-y-3">
                                <button 
                                    onClick={() => { navigate('/guest-dashboard'); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-white/5 transition-all border border-white/5 group"
                                    style={{ borderColor: isGuestView ? `${getAccentColor()}20` : 'transparent' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.1)]" style={{ backgroundColor: `${getAccentColor()}10`, color: getAccentColor() }}>
                                            <FontAwesomeIcon icon={faGaugeHigh} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_guest_dashboard', 'Guest Dashboard')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <button 
                                    onClick={() => { setShowStatusDetails(true); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-[#00FF41]/5 hover:border-[#00FF41]/20 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#00FF41]/10 text-[#00FF41] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,255,65,0.1)]">
                                            <FontAwesomeIcon icon={faCrown} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_my_statuses', 'My Statuses')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <button 
                                    onClick={() => { navigate('/map'); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl text-white hover:bg-white/5 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faMapLocationDot} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{t('menu_map', 'Venue Map')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 bg-white/5 text-white/40 rounded-xl flex items-center justify-center">
                                            <FontAwesomeIcon icon={faGear} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-white/60">{t('menu_settings', 'Settings')}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
                                        {[
                                            { code: 'en', flag: '🇺🇸' },
                                            { code: 'ru', flag: '🇷🇺' },
                                            { code: 'ar', flag: '🇦🇪' },
                                            { code: 'vi', flag: '🇻🇳' }
                                        ].map((lang) => (
                                            <button 
                                                key={lang.code}
                                                onClick={() => i18n.changeLanguage(lang.code)}
                                                className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black flex flex-col items-center justify-center gap-1.5 border transition-all ${i18n.language === lang.code ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.3)]' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <span className="text-base leading-none">{lang.flag}</span>
                                                <span className="uppercase">{lang.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { if (user) handleLogout(); else { navigate('/activate'); setIsOpen(false); } }}
                                    className={`w-full flex items-center justify-between p-5 rounded-[24px] active:scale-[0.98] transition-all border mt-4 ${user ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#00FF41]/10 border-[#00FF41]/20 text-[#00FF41]'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <FontAwesomeIcon icon={user ? faRightFromBracket : faRightToBracket} className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">{user ? t('menu_logout') : t('menu_login')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                </button>

                                <div className="pt-6 text-center opacity-10">
                                    <p className="text-[7px] font-black text-white uppercase tracking-[0.5em]">REVOO DIGITAL ECOSYSTEM © 2026</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <StatusDetailsModal />
        </div>
    );
};

export default UserMenu;
