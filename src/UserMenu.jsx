import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCircleUser, 
    faStore, 
    faMapLocationDot, 
    faDownload, 
    faGear, 
    faChevronRight,
    faStar,
    faXmark,
    faUserCircle, // Added
    faCrown, // Added
    faMapMarkedAlt, // Added
    faRightFromBracket, // Added
    faRightToBracket // Added
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStatuses } from './hooks/useUserStatuses';

import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const UserMenu = ({ user, venue, activeStatuses = [], trigger }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showStatusDetails, setShowStatusDetails] = useState(null); // Added
    const { statuses, loading } = useUserStatuses(); // Kept for now, but might be removed if activeStatuses replaces it
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsOpen(false);
            navigate('/activate');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: t('menu_guest_dashboard'), icon: faUserCircle, path: '/activate' },
        { id: 'statuses', label: t('menu_my_statuses'), icon: faCrown, action: () => setIsOpen(false) },
        { id: 'map', label: t('menu_map'), icon: faMapMarkedAlt, path: '/map' },
        { id: 'settings', label: t('menu_settings'), icon: faGear, action: () => {} },
    ];

    const authItem = user ? {
        id: 'logout',
        label: t('menu_logout', 'Logout'),
        icon: faRightFromBracket,
        action: handleLogout,
        className: 'text-red-400 mt-4 border-t border-white/5 pt-4'
    } : {
        id: 'login',
        label: t('menu_login', 'Login'),
        icon: faRightToBracket,
        path: '/activate',
        className: 'text-[#00FF41] mt-4 border-t border-white/5 pt-4'
    };

    // PWA Install Logic
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert(t('pwa_manual_install', "To install: Tap the share button in your browser and 'Add to Home Screen'"));
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    };

    const toggleLanguage = () => {
        const cycle = { 'en': 'ru', 'ru': 'ar', 'ar': 'vi', 'vi': 'en' };
        i18n.changeLanguage(cycle[i18n.language] || 'en');
    };

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

                        {/* Dropdown Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20, x: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, x: -20 }}
                            className="absolute top-0 left-0 w-[85vw] max-w-[320px] bg-[#1C1C1E] border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCircleUser} className="text-white/40" />
                                    </div>
                                    <span className="font-bold text-[16px] text-white">{t('menu_guest_dashboard', 'Guest Dashboard')}</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>

                            {/* Menu Content */}
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                
                                    {/* Dashboard link */}
                                    <button 
                                        onClick={() => { navigate('/activate'); setIsOpen(false); }}
                                        className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl text-white active:scale-98 transition-all border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#00FF41]/20 text-[#00FF41] rounded-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faUserCircle} />
                                            </div>
                                            <span className="text-[14px] font-semibold">{t('menu_guest_dashboard', 'Dashboard')}</span>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                    </button>

                                    {/* My Statuses */}
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl text-white active:scale-98 transition-all border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-yellow-500/20 text-yellow-400 rounded-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCrown} />
                                            </div>
                                            <span className="text-[14px] font-semibold">{t('menu_my_statuses', 'My Statuses')}</span>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                    </button>

                                    {/* Map */}
                                    <button 
                                        onClick={() => { navigate('/map'); setIsOpen(false); }}
                                        className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl text-white active:scale-98 transition-all border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faMapLocationDot} />
                                            </div>
                                            <span className="text-[14px] font-semibold">{t('menu_map', 'Venue Map')}</span>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                    </button>

                                    {/* App Download */}
                                    <button 
                                        onClick={handleInstallClick}
                                        className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl text-white active:scale-98 transition-all border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faDownload} />
                                            </div>
                                            <span className="text-[14px] font-semibold">{t('menu_download_app', 'Download App')}</span>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                    </button>

                                    {/* Settings / Language */}
                                    <button 
                                        onClick={toggleLanguage}
                                        className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl text-white active:scale-98 transition-all border border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faGear} />
                                            </div>
                                            <span className="text-[14px] font-semibold">{t('menu_settings', 'Settings')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-white/40 uppercase">{i18n.language}</span>
                                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-30" />
                                        </div>
                                    </button>

                                    {/* Auth Section */}
                                    <button 
                                        onClick={() => { if (user) handleLogout(); else { navigate('/activate'); setIsOpen(false); } }}
                                        className={`w-full flex items-center justify-between p-3.5 bg-white/5 rounded-2xl active:scale-98 transition-all border border-white/5 mt-4 ${user ? 'text-red-400' : 'text-[#00FF41]'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${user ? 'bg-red-500/20' : 'bg-[#00FF41]/20'}`}>
                                                <FontAwesomeIcon icon={user ? faRightFromBracket : faRightToBracket} />
                                            </div>
                                            <span className="text-[14px] font-bold">{user ? t('menu_logout') : t('menu_login')}</span>
                                        </div>
                                    </button>
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-white/5 text-center">
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">REVOO Digital Ecosystem v2.0</p>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
};

export default UserMenu;
