import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faCheck, faArrowLeft, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const LeadCapture = () => {
    const { t, i18n } = useTranslation();
    const [isReviewing, setIsReviewing] = useState(false);
    const [formData, setFormData] = useState({ name: '', contact: '' });
    const [agreedToTerms, setAgreedToTerms] = useState(true);
    const navigate = useNavigate();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
    };

    const handleContinue = (e) => {
        e.preventDefault();
        if (formData.name && formData.contact) {
            setIsReviewing(true);
        }
    };

    const handleActivate = () => {
        navigate('/thank-you');
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-cream font-sans text-brand-brown antialiased">
            <div className="flex-grow flex flex-col px-6 py-4">
                {/* Header with Back and Language */}
                <div className="flex justify-between items-center mt-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-brand-brown shadow-sm border border-brand-brown/5 hover:bg-brand-brown hover:text-white transition"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>

                    <button
                        onClick={toggleLanguage}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-brand-brown shadow-sm border border-brand-brown/5 hover:bg-brand-brown hover:text-white transition"
                    >
                        <span className="text-xs font-bold uppercase">{i18n.language}</span>
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <h1 className="text-3xl font-bold">
                        {isReviewing ? t('lead_checking') : t('lead_nice_meet')}
                    </h1>
                    <p className="mt-2 text-text-secondary">
                        {isReviewing
                            ? t('lead_sub_look_correct')
                            : t('lead_sub_need_name')}
                    </p>
                </div>

                <div className="mt-12">
                    {!isReviewing ? (
                        <form onSubmit={handleContinue} className="space-y-4">
                            <FriendlyInput
                                label={t('lead_label_name')}
                                hint={t('lead_hint_name')}
                                icon={faUser}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <FriendlyInput
                                label={t('lead_label_contact')}
                                hint={t('lead_hint_contact')}
                                icon={faEnvelope}
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </form>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
                            <div className="flex items-center gap-4">
                                <FontAwesomeIcon icon={faUser} className="text-brand-orange" />
                                <div>
                                    <div className="font-bold">{formData.name}</div>
                                    <div className="text-xs text-brand-brown/60 uppercase tracking-widest">{t('lead_label_name')}</div>
                                </div>
                            </div>
                            <div className="border-t border-brand-brown/5 pt-4 flex items-center gap-4">
                                <FontAwesomeIcon icon={faEnvelope} className="text-brand-orange" />
                                <div>
                                    <div className="font-bold">{formData.contact}</div>
                                    <div className="text-xs text-brand-brown/60 uppercase tracking-widest">{t('lead_label_contact')}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-grow"></div>

                {!isReviewing ? (
                    <div className="mb-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 accent-brand-orange"
                            />
                            <p className="text-[12px] text-text-secondary leading-tight">
                                {t('lead_terms')}
                            </p>
                        </div>
                        <button
                            onClick={handleContinue}
                            disabled={!formData.name || !formData.contact}
                            className="w-full h-14 bg-brand-orange text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 shadow-lg"
                        >
                            {t('lead_continue')}
                        </button>
                    </div>
                ) : (
                    <div className="mb-6 flex gap-4">
                        <button
                            onClick={() => setIsReviewing(false)}
                            className="flex-1 h-14 border border-brand-brown text-brand-brown bg-transparent rounded-2xl font-bold active:scale-95 transition-transform"
                        >
                            {t('lead_edit')}
                        </button>
                        <button
                            onClick={handleActivate}
                            className="flex-[2] h-14 bg-brand-green text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-transform shadow-lg"
                        >
                            <FontAwesomeIcon icon={faCheck} />
                            {t('lead_activate')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const FriendlyInput = ({ label, hint, icon, value, onChange }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-bold ml-1">{label}</label>
        <div className="relative">
            <FontAwesomeIcon
                icon={icon}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange/70 text-sm"
            />
            <input
                type="text"
                placeholder={hint}
                value={value}
                onChange={onChange}
                className="w-full h-14 pl-12 pr-4 bg-white rounded-xl focus:ring-2 focus:ring-brand-orange transition-shadow outline-none text-base"
                required
            />
        </div>
    </div>
);

export default LeadCapture;
