import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCircleUser, 
    faChevronRight,
    faXmark,
    faLayoutDashboard,
    faCrown,
    faMapLocationDot,
    faGear,
    faRightFromBracket,
    faRightToBracket,
    faAward,
    faCalendarAlt,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStatuses } from './hooks/useUserStatuses';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const UserMenu = ({ user, trigger }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showStatusDetails, setShowStatusDetails] = useState(false);
    const { statuses, loading } = useUserStatuses();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsOpen(false);
            navigate('/activate');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const StatusDetailsModal = () => (
        <AnimatePresence>
            {showStatusDetails && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 pt-12 md:pt-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/50 backdrop-blur-md z-10">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                                <FontAwesomeIcon icon={faAward} className="w-6 h-6 text-[#D4AF37]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">История Ваших Статусов</h2>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Личный Архив Привилегий</p>
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
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto space-y-6 pb-20">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Подключение к сети...</p>
                                </div>
                            ) : statuses.length > 0 ? (
                                statuses.map((status, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-6 rounded-[32px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity" />
                                        
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-white/40" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Дата визита</p>
                                                    <p className="text-white font-medium">{status.lastVisit?.toLocaleDateString() || 'Недавно'}</p>
                                                </div>
                                            </div>
                                            <div className="px-4 py-2 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/20 text-[#00FF41] text-[10px] font-black uppercase tracking-widest">
                                                Визит Подтвержден
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black mb-1">{status.venueName}</p>
                                                <p className="text-2xl font-black text-[#00FF41]">{status.discount}%</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black mb-1">Статус</p>
                                                <p className="text-sm font-black text-white uppercase tracking-tighter">
                                                    {status.discount >= 20 ? 'REVOO ELITE' : 'ACTIVE STATUS'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                                                <span className="text-xs text-white/60 font-medium tracking-tight">Ваш персональный коэффициент лояльности</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-30">
                                    <FontAwesomeIcon icon={faAward} className="text-6xl mb-6" />
                                    <p className="text-sm font-bold uppercase tracking-widest">История пуста</p>
                                    <p className="text-xs mt-2 max-w-xs mx-auto">Посещайте заведения REVOO, чтобы разблокировать историю ваших привилегий.</p>
                                </div>
                            )}

                            {/* Infinite Scroll Indicator */}
                            {statuses.length > 5 && (
                                <div className="py-10 text-center opacity-20">
                                    <div className="inline-block w-8 h-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em]">Конец записи...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Footer */}
                    <div className="p-6 bg-black border-t border-white/10">
                        <div className="max-w-3xl mx-auto flex items-start space-x-4 opacity-50">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-[#D4AF37] mt-1" />
                            <p className="text-[10px] leading-relaxed uppercase tracking-wider font-bold">
                                Это защищенный реестр ваших статусов. Информация обновляется сразу после подтверждения транзакции в заведении.
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
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />

                        {/* Dropdown Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20, x: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, x: -20 }}
                            className="absolute top-0 left-0 w-[85vw] max-w-[320px] bg-[#1C1C1E] border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/40">
                                        <FontAwesomeIcon icon={faCircleUser} />
                                    </div>
                                    <span className="font-bold text-[16px] text-white">{user?.displayName || 'REVOO Guest'}</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>

                            {/* Menu Body */}
                            <div className="p-4 space-y-3">
                                <button 
                                    onClick={() => { navigate('/guest-dashboard'); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#00FF41]/10 text-[#00FF41] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faLayoutDashboard} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-tight">{t('menu_guest_dashboard', 'Guest Dashboard')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <button 
                                    onClick={() => { setShowStatusDetails(true); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faCrown} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-tight">{t('menu_my_statuses', 'My Statuses')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <button 
                                    onClick={() => { navigate('/map'); setIsOpen(false); }}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-all border border-white/5 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faMapLocationDot} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-tight">{t('menu_map', 'Venue Map')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-20" />
                                </button>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/5 text-white/40 rounded-xl flex items-center justify-center">
                                            <FontAwesomeIcon icon={faGear} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-tight">{t('menu_settings', 'Settings')}</span>
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
                                                className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border transition-all ${i18n.language === lang.code ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <span>{lang.flag}</span>
                                                <span className="uppercase">{lang.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { if (user) handleLogout(); else { navigate('/activate'); setIsOpen(false); } }}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl active:scale-95 transition-all border mt-4 ${user ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#00FF41]/10 border-[#00FF41]/20 text-[#00FF41]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FontAwesomeIcon icon={user ? faRightFromBracket : faRightToBracket} className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">{user ? t('menu_logout') : t('menu_login')}</span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                </button>

                                <div className="pt-4 text-center">
                                    <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em]">REVOO Digital Ecosystem</p>
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
