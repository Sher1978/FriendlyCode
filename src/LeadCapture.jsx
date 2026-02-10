import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const LeadCapture = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { discount } = location.state || { discount: 5 }; // Default to 5% if direct access

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleContinue = () => {
        if (!name.trim() || !email.trim()) return;

        // Save guest data
        localStorage.setItem('guestName', name);
        localStorage.setItem('guestEmail', email);
        console.log('Saved Guest:', { name, email });

        // Navigate to UnifiedActivation (Reward Screen)
        navigate('/thank-you', { state: { guestName: name, discountValue: discount } });
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased">
            <div className="flex-grow flex flex-col px-6 py-12 relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-[#4E342E] shadow-sm border border-[#4E342E]/5 absolute top-8 left-6 z-10"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>

                <div className="mt-16 text-left">
                    <h1 className="text-[32px] font-black leading-tight mb-2">
                        {t('almost_there', "Almost there!")}
                    </h1>
                    <p className="text-[18px] opacity-70">
                        {t('introduce_yourself', "Please introduce yourself to claim your reward.")}
                    </p>
                </div>

                <div className="mt-12 space-y-6">
                    {/* Name Input */}
                    <div className="relative">
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#4E342E]/40 mb-2 block pl-1">
                            {t('your_name')}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faUser} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E68A00]" />
                            <input
                                type="text"
                                placeholder="e.g., Alex"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[64px] pl-12 pr-6 bg-white border-2 border-transparent focus:border-[#E68A00] rounded-[24px] font-bold text-[18px] outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div className="relative">
                        <label className="text-[12px] font-black uppercase tracking-widest text-[#4E342E]/40 mb-2 block pl-1">
                            {t('your_email', "Your Email")}
                        </label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faEnvelope} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E68A00]" />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-[64px] pl-12 pr-6 bg-white border-2 border-transparent focus:border-[#E68A00] rounded-[24px] font-bold text-[18px] outline-none shadow-sm transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-grow"></div>

                {/* Submit */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim() || !email.trim()}
                    className={`w-full h-[64px] rounded-[24px] font-black text-[20px] uppercase transition-all flex items-center justify-center shadow-xl ${name.trim() && email.trim()
                            ? 'bg-[#E68A00] text-white active:scale-95 shadow-[#E68A00]/30'
                            : 'bg-[#4E342E]/10 text-[#4E342E]/40 cursor-not-allowed shadow-none'
                        }`}
                >
                    {t('continue_reward', "Get Reward")}
                </button>
            </div>
        </div>
    );
};

export default LeadCapture;
