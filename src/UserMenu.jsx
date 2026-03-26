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
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserStatuses } from './hooks/useUserStatuses';

const UserMenu = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const { statuses, loading } = useUserStatuses();
    const [deferredPrompt, setDeferredPrompt] = useState(null);

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
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="relative z-[100]">
            {/* Trigger Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white/80 active:scale-90 transition-all shadow-lg"
            >
                <FontAwesomeIcon icon={faCircleUser} className="text-[20px]" />
            </button>

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
                            initial={{ opacity: 0, scale: 0.95, y: -20, x: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, x: 20 }}
                            className="absolute top-0 right-0 w-[85vw] max-w-[320px] bg-[#1C1C1E] border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCircleUser} className="text-white/40" />
                                    </div>
                                    <span className="font-bold text-[16px] text-white">Guest Dashboard</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40">
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>

                            {/* Menu Content */}
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                
                                {/* Section: My Statuses */}
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em] px-2">{t('menu_my_statuses', 'My Statuses')}</h4>
                                    <div className="bg-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                        {loading ? (
                                            <div className="p-4 text-center animate-pulse"><div className="w-full h-4 bg-white/10 rounded"></div></div>
                                        ) : statuses.length > 0 ? (
                                            statuses.map((status, idx) => (
                                                <div key={idx} className="p-3 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-bold text-white leading-tight">{status.venueName}</span>
                                                        <span className="text-[10px] text-white/40 font-medium">VIP {status.discount}% • {new Date(status.expiry).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faStar} className="text-[10px] text-yellow-500" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-[12px] text-white/40">{t('no_statuses', 'No active VIP statuses')}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Section: Actions */}
                                <div className="space-y-1.5">
                                    <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.1em] px-2">Navigation</h4>
                                    
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
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-white/5 text-center mt-2">
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
