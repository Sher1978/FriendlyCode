import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useTranslation } from 'react-i18next';

const B2BContactModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#1C1C1E] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden"
                    >
                        {/* Gold Ambient Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-[50px] rounded-full" />
                        
                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>

                        <div className="p-8 md:p-12 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] mx-auto flex items-center justify-center mb-8 shadow-[0_10px_30px_rgba(212,175,55,0.3)]">
                                <FontAwesomeIcon icon={faWhatsapp} className="text-4xl text-black" />
                            </div>

                            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-4">
                                {t('b2b_form_title_start')} <span className="text-[#D4AF37]">{t('b2b_form_title_highlight')}</span>
                            </h3>
                            
                            <p className="text-white/60 text-sm md:text-base mb-8 font-medium leading-relaxed">
                                {t('b2b_form_sub')}
                            </p>

                            <div className="space-y-4 mb-10 text-left">
                                {[
                                    t('b2b_form_benefit_1'),
                                    t('b2b_form_benefit_2'),
                                    t('b2b_form_benefit_3')
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-white/80 text-sm font-bold">
                                        <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                                            <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    window.open('https://wa.me/971588044688', '_blank');
                                    onClose();
                                }}
                                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black py-5 rounded-3xl font-black text-sm md:text-base uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(212,175,55,0.2)] animate-pulse"
                            >
                                {t('b2b_form_whatsapp_btn')}
                            </motion.button>
                            
                            <p className="mt-6 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">
                                {t('b2b_form_response_time')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default B2BContactModal;
