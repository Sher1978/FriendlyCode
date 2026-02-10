import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const UnifiedActivation = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const guestName = location.state?.guestName || 'Guest';

    return (
        <div className="flex flex-col min-h-screen bg-[#FFF8E1] font-sans text-[#4E342E] antialiased">
            <div className="flex-grow flex flex-col items-center justify-between px-6 py-12">
                <div className="flex-grow flex flex-col items-center justify-center w-full">

                    {/* Status Card */}
                    <div className="w-full max-w-sm bg-white border-2 border-[#81C784] rounded-[32px] p-10 text-center shadow-xl shadow-[#4E342E]/5">
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#81C784]">
                            {t('success_unlocked')}
                        </span>

                        <h1 className="text-[96px] font-black leading-none text-[#E68A00] mt-4">
                            20%
                        </h1>

                        <p className="text-[18px] font-black opacity-40 uppercase tracking-tighter mt-2">
                            {t('off_bill')}
                        </p>
                    </div>

                    <div className="mt-12 text-center max-w-xs">
                        <h2 className="text-[24px] font-black text-[#4E342E]">
                            {t('enjoy_meal', { name: guestName })}
                        </h2>
                        <p className="mt-3 text-[18px] opacity-60 leading-tight">
                            {t('show_waiter')}
                        </p>
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    <div className="w-full h-1.5 bg-[#4E342E]/10 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-[#81C784]"></div>
                    </div>
                    <p className="text-center text-[14px] font-bold opacity-40">
                        {t('expires_in')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnifiedActivation;
