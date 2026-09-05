import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faShieldHalved, faFileContract, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const LegalModal = ({ isOpen, initialTab = 'privacy', onClose }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(initialTab);

    React.useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl"
                />

                {/* Modal Window */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-3xl bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] z-10 my-auto text-white overflow-hidden max-h-[85vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                                <FontAwesomeIcon icon={activeTab === 'privacy' ? faShieldHalved : activeTab === 'disclaimer' ? faScaleBalanced : faFileContract} />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight">
                                {activeTab === 'privacy' && t('legal_privacy', 'Политика конфиденциальности')}
                                {activeTab === 'disclaimer' && t('legal_disclaimer', 'Отказ от ответственности')}
                                {activeTab === 'terms' && t('legal_terms', 'Публичная оферта')}
                            </h3>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 my-4 p-1 bg-white/5 rounded-2xl border border-white/5 text-xs font-bold uppercase tracking-wider overflow-x-auto shrink-0">
                        <button 
                            onClick={() => setActiveTab('privacy')}
                            className={`flex-1 py-2.5 px-4 rounded-xl transition-all whitespace-nowrap ${activeTab === 'privacy' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            {t('legal_privacy', 'Политика конфиденциальности')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('disclaimer')}
                            className={`flex-1 py-2.5 px-4 rounded-xl transition-all whitespace-nowrap ${activeTab === 'disclaimer' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            {t('legal_disclaimer', 'Отказ от ответственности')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('terms')}
                            className={`flex-1 py-2.5 px-4 rounded-xl transition-all whitespace-nowrap ${activeTab === 'terms' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                        >
                            {t('legal_terms', 'Публичная оферта')}
                        </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="overflow-y-auto pr-2 space-y-4 text-sm text-white/70 leading-relaxed font-sans">
                        {activeTab === 'privacy' && (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-base">1. Общие положения</h4>
                                <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты информации о физических и юридических лицах, использующих сервисы компании REVOO SYSTEM (Дубай, ОАЭ).</p>
                                <h4 className="text-white font-bold text-base">2. Сбор информации</h4>
                                <p>Мы собираем исключительно анонимизированные технические данные устройств (Device Fingerprinting), сведения о частоте посещений и контактные данные, добровольно предоставляемые пользователем для связи.</p>
                                <h4 className="text-white font-bold text-base">3. Безопасность данных</h4>
                                <p>Все данные шифруются по стандарту AES-256 и передаются по защищенным протоколам HTTPS/WSS. Мы гарантируем передачу данных строго в соответствии с международными стандартами GDPR.</p>
                                <h4 className="text-white font-bold text-base">4. Права пользователей</h4>
                                <p>Вы имеете право запросить полное удаление или анонимизацию ваших данных в любой момент, направив запрос в службу поддержки REVOO.</p>
                            </div>
                        )}

                        {activeTab === 'disclaimer' && (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-base">1. Ограничение ответственности</h4>
                                <p>Сервис REVOO предоставляет технологические решения для оптимизации взаимодействия с клиентами в режиме «как есть» (As Is).</p>
                                <h4 className="text-white font-bold text-base">2. Финансовые показатели и ROI</h4>
                                <p>Все расчетные показатели окупаемости (ROI), коэффициенты удержания и прогнозы прироста выручки носят аналитический характер и зависят от специфики конкретного заведения, качества сервиса и внешних факторов рынка.</p>
                                <h4 className="text-white font-bold text-base">3. Сторонние сервисы</h4>
                                <p>REVOO не несет ответственности за изменения в правилах работы сторонних картографических сервисов (Google Maps, TripAdvisor и др.), но обязуется оперативно адаптировать свои алгоритмы.</p>
                            </div>
                        )}

                        {activeTab === 'terms' && (
                            <div className="space-y-4">
                                <h4 className="text-white font-bold text-base">1. Предмет оферты</h4>
                                <p>Настоящий документ является официальным публичным предложением REVOO SYSTEM о предоставлении доступа к платформе локального маркетинга и автоматизации лояльности.</p>
                                <h4 className="text-white font-bold text-base">2. Порядок предоставления услуг</h4>
                                <p>Доступ к платформе предоставляется после согласования индивидуального тарифного плана и подписания договора на техническое сопровождение или оплаты тестового периода.</p>
                                <h4 className="text-white font-bold text-base">3. Условия оплаты и возврата</h4>
                                <p>В рамках 30-дневного тестового периода действует гарантия возврата средств в случае невыполнения целевых KPI по удержанию клиентов при соблюдении регламентов интеграции.</p>
                                <h4 className="text-white font-bold text-base">4. Юрисдикция</h4>
                                <p>Все споры и разногласия регулируются в соответствии с законодательством Международного финансового центра Дубай (DIFC, UAE).</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LegalModal;
