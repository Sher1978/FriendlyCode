import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'en', flag: '🇺🇸', label: 'English' },
        { code: 'ar', flag: '🇦🇪', label: 'العربية' },
        { code: 'ru', flag: '🇷🇺', label: 'Русский' },
        { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' }
    ];

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group"
            >
                <span className="text-xl leading-none group-hover:scale-110 transition-transform">{currentLang.flag}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{currentLang.code}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-40 bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl z-[100]"
                    >
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    i18n.changeLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                    i18n.language === lang.code 
                                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]' 
                                    : 'hover:bg-white/5 text-white/70 hover:text-white'
                                }`}
                            >
                                <span className="text-xl">{lang.flag}</span>
                                <span className="text-sm font-bold tracking-tight">{lang.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSelector;
