import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faArrowLeft, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const TelegramAuth = () => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [selectedMessenger, setSelectedMessenger] = useState('whatsapp');
    const navigate = useNavigate();

    const messengerLinks = {
        whatsapp: 'https://wa.me/1234567890', // placeholder for AppConfig.whatsappBotUrl
        telegram: 'https://t.me/FriendIycode_bot'
    };

    const handleContinue = () => {
        if (!name.trim()) return;

        // Save guest name for future "Welcome Back" auto-login
        localStorage.setItem('guestName', name);

        // Mocking the behavior of launching messenger then navigating to success
        const link = messengerLinks[selectedMessenger];
        if (selectedMessenger === 'telegram') {
            window.open(`${link}?start=guest_user`, '_blank');
        } else {
            window.open(link, '_blank');
        }

        navigate('/thank-you', { state: { guestName: name } });
    };

    return (
        <div className="flex flex-col min-h-screen bg-black font-sans text-white antialiased overflow-hidden relative" style={{ WebkitFontSmoothing: 'antialiased' }}>
            
            {/* Ambient Background Glow Arrays */}
            <div className="absolute top-[-5%] left-[-20vw] w-[140vw] h-[60vh] rounded-[100%] blur-[100px] pointer-events-none opacity-[0.20] mix-blend-screen bg-[#0088cc]" />
            <div className="absolute bottom-[0%] right-[-20vw] w-[140vw] h-[50vh] rounded-[100%] blur-[120px] pointer-events-none opacity-[0.10] bg-[#25D366]" />

            <div className="flex-grow flex flex-col px-6 py-12 relative z-10 w-full max-w-md mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/5 absolute top-8 left-6 transition-colors hover:bg-white/20"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                </button>

                <div className="mt-20 text-left px-2">
                    <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-2 text-white">
                        {t('welcome')}
                    </h1>
                    <p className="mt-2 text-[16px] font-medium text-white/50">
                        {t('enable_rewards')}
                    </p>
                </div>

                <div className="mt-12 space-y-10 px-2">
                    {/* Manual Input */}
                    <div className="relative">
                        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/40 mb-2 block pl-1">
                            {t('your_name')}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 text-sm" />
                            <input
                                type="text"
                                placeholder="e.g., Alex"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[60px] pl-12 pr-6 bg-[#1C1C1E]/60 backdrop-blur-xl border border-white/10 focus:border-white/30 rounded-[20px] font-semibold text-[17px] text-white placeholder-white/30 outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Messenger Picker */}
                    <div>
                        <label className="text-[12px] font-semibold uppercase tracking-widest text-white/60 mb-4 block pl-1">
                            {t('connect_messenger')}
                        </label>
                        <div className="flex gap-4">
                            <MessengerButton
                                id="whatsapp"
                                label="WhatsApp"
                                icon={faGlobe}
                                isSelected={selectedMessenger === 'whatsapp'}
                                onClick={() => setSelectedMessenger('whatsapp')}
                                accentColor="#25D366"
                            />
                            <MessengerButton
                                id="telegram"
                                label="Telegram"
                                icon={faGlobe}
                                isSelected={selectedMessenger === 'telegram'}
                                onClick={() => setSelectedMessenger('telegram')}
                                accentColor="#0088cc"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Submit */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim()}
                    className={`w-full max-w-[400px] h-[56px] mx-auto rounded-[20px] font-semibold text-[17px] transition-all flex items-center justify-center shadow-xl ${name.trim()
                        ? 'bg-white text-black active:scale-[0.97]'
                        : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                        }`}
                >
                    {t('continue_guest')}
                </button>
            </div>
        </div>
    );
};

const MessengerButton = ({ label, isSelected, onClick, accentColor }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-5 rounded-[22px] border transition-all backdrop-blur-md ${isSelected
            ? `bg-white/10 border-white/40 scale-[1.02] shadow-lg`
            : `bg-[#1C1C1E]/60 border-white/5`
            }`}
        style={isSelected ? { boxShadow: `0 0 20px ${accentColor}40` } : {}}
    >
        <span className={`text-[16px] font-semibold ${isSelected ? 'text-white' : 'text-white/50'}`}>
            {label}
        </span>
        <span className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-wider text-white">OPEN APP</span>
    </button>
);

export default TelegramAuth;
