import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';

const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ar', name: 'العربية', flag: '🇦🇪' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
];

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLang = languages.find(l => l.code === (i18n.language?.substring(0,2) || 'ru')) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all backdrop-blur-md"
            >
                <span className="text-sm">{currentLang.flag}</span>
                <span className="uppercase tracking-wider">{currentLang.code}</span>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#1C1C1E] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl py-2 z-50 overflow-hidden animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5">
                        Язык / Language
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/10 transition-colors ${i18n.language?.startsWith(lang.code) ? 'text-[#D4AF37] font-bold bg-white/5' : 'text-white/80'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </span>
                                {i18n.language?.startsWith(lang.code) && (
                                    <FontAwesomeIcon icon={faCheck} className="text-xs text-[#D4AF37]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
