import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faCheck, faArrowLeft, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const LeadCapture = () => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [selectedMessenger, setSelectedMessenger] = useState('whatsapp');
    const navigate = useNavigate();

    const messengerLinks = {
        whatsapp: 'https://wa.me/1234567890', // placeholder for AppConfig.whatsappBotUrl
        telegram: 'https://t.me/FriendlyCodeBot' // placeholder for AppConfig.telegramBotUrl
    };

    const handleContinue = () => {
        if (!name.trim()) return;

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
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased">
            <div className="flex-grow flex flex-col px-6 py-12">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-[#4E342E] shadow-sm border border-[#4E342E]/5 absolute top-8 left-6"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                <div className="mt-12 text-left">
                    <h1 className="text-[32px] font-black leading-tight">
                        {t('welcome')}
                    </h1>
                    <p className="mt-2 text-[18px] opacity-70">
                        {t('enable_rewards')}
                    </p>
                </div>

                <div className="mt-12 space-y-10">
                    {/* Manual Input */}
                    <div className="relative">
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#4E342E]/40 mb-3 block">
                            {t('your_name')}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E68A00]" />
                            <input
                                type="text"
                                placeholder="e.g., Alex"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[64px] pl-12 pr-6 bg-white border border-[#E68A00]/10 rounded-[18px] font-bold text-[18px] focus:ring-2 focus:ring-[#E68A00] outline-none shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Messenger Picker */}
                    <div>
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#E68A00] mb-4 block">
                            {t('connect_messenger')}
                        </label>
                        <div className="flex gap-4">
                            <MessengerButton
                                id="whatsapp"
                                label="WhatsApp"
                                icon={faGlobe}
                                isSelected={selectedMessenger === 'whatsapp'}
                                onClick={() => setSelectedMessenger('whatsapp')}
                            />
                            <MessengerButton
                                id="telegram"
                                label="Telegram"
                                icon={faGlobe}
                                isSelected={selectedMessenger === 'telegram'}
                                onClick={() => setSelectedMessenger('telegram')}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Submit */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim()}
                    className="w-full h-[64px] bg-[#E68A00] text-white rounded-[18px] font-black text-[20px] active:scale-[0.98] transition-all shadow-lg shadow-[#E68A00]/20 uppercase mt-8"
                >
                    {t('continue_guest')}
                </button>
            </div>
        </div>
    );
};

const MessengerButton = ({ label, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center p-5 rounded-[22px] border-2 transition-all ${isSelected
                ? 'bg-[#E68A00]/5 border-[#E68A00] scale-[1.02]'
                : 'bg-white border-[#E68A00]/10'
            }`}
    >
        <span className={`text-[16px] font-bold ${isSelected ? 'text-[#E68A00]' : 'text-[#4E342E]'}`}>
            {label}
        </span>
        <span className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-tighter">OPEN APP</span>
    </button>
);

export default LeadCapture;
