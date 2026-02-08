import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import { faCheck as faCheckSolid, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const UnifiedActivation = () => {
    const { t, i18n } = useTranslation();
    const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTimer = () => {
        const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
        const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-brand-green font-sans text-white antialiased">
            {/* Language Toggle */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={toggleLanguage}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
                >
                    <span className="text-xs font-bold uppercase">{i18n.language}</span>
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <FontAwesomeIcon icon={faCheckSolid} className="text-brand-green text-5xl" />
                </div>

                <h1 className="text-3xl font-bold">{t('thank_active')}</h1>
                <p className="mt-2 text-white/70 text-lg">{t('thank_show_waiter')}</p>

                {/* Timer Card */}
                <div className="mt-12 bg-white px-12 py-6 rounded-[24px] shadow-2xl">
                    <div className="text-brand-brown/60 text-[12px] font-bold tracking-[0.15em]">{t('thank_valid_for')}</div>
                    <div className="text-brand-brown text-5xl font-black mt-2 font-mono">
                        {formatTimer()}
                    </div>
                </div>

                {/* Upsell / Retention */}
                <div className="mt-16 w-full max-w-sm bg-white/15 border border-white/30 rounded-2xl p-6 backdrop-blur-sm">
                    <h2 className="text-lg font-bold">{t('thank_upsell_headline')}</h2>
                    <p className="mt-2 text-white/70 text-sm">
                        {t('thank_upsell_sub')}
                    </p>


                    <div className="mt-6 flex justify-center gap-4">
                        <AppStoreButton icon={faApple} label="App Store" />
                        <AppStoreButton icon={faGooglePlay} label="Google Play" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const AppStoreButton = ({ icon, label }) => (
    <button className="bg-black px-4 py-2 rounded-lg flex items-center gap-2 active:scale-95 transition-transform">
        <FontAwesomeIcon icon={icon} className="text-base" />
        <span className="text-[12px] font-bold">{label}</span>
    </button>
);

export default UnifiedActivation;
