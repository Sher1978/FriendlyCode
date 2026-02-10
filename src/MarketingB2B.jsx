import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faMobileAlt, faIdCard, faCheckCircle, faRocket, faLeaf } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const MarketingB2B = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ city: '', phone: '', email: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Заявка пока не отправляется (Демо режим).");
    };

    return (
        <div className="min-h-screen bg-background-cream font-sans text-brand-brown overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-background-cream/80 backdrop-blur-md z-50 border-b border-brand-brown/5 h-16 flex items-center justify-between px-6">
                <div className="font-black text-xl tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                    <span>FRIENDLY CODE</span>
                </div>
                <div
                    className="text-xs font-bold bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full uppercase tracking-widest border border-brand-orange/20 cursor-pointer hover:bg-brand-orange/20 transition-all"
                    onClick={() => window.location.href = '/admin/'}
                >
                    LOGIN
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto gap-12">
                <div className="flex-1 text-center md:text-left">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-6xl font-black leading-tight mb-6 text-brand-brown"
                    >
                        Привлечь гостя — дорого. <br />
                        <span className="text-brand-orange">
                            Удержать — бесценно.
                        </span>
                    </motion.h1>

                    <p className="text-lg text-brand-brown/60 mb-8 leading-relaxed max-w-xl font-medium">
                        Единственная «умная» система лояльности, которая увеличивает реальную прибыль заведения на 25%. Мы превращаем прохожих в Super VIP клиентов за 24 часа. Без разработки приложений. Без пластика. Без усилий.
                    </p>

                    <form onSubmit={handleSubmit} className="bg-white/60 p-6 rounded-[2rem] border border-brand-brown/5 shadow-xl shadow-brand-brown/5 max-w-md backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-4 text-brand-brown flex items-center gap-2">
                            <FontAwesomeIcon icon={faLeaf} className="text-brand-green" />
                            Начните бесплатно
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Город"
                                className="w-full p-4 rounded-xl bg-white border border-brand-brown/10 focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none text-brand-brown placeholder-brand-brown/30 transition-all"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                            />
                            <input
                                type="tel"
                                placeholder="+7 (999) 000-00-00"
                                className="w-full p-4 rounded-xl bg-white border border-brand-brown/10 focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none text-brand-brown placeholder-brand-brown/30 transition-all"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full p-4 rounded-xl bg-white border border-brand-brown/10 focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none text-brand-brown placeholder-brand-brown/30 transition-all"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <button className="w-full bg-brand-orange text-white font-black py-4 rounded-xl shadow-lg shadow-brand-orange/20 hover:shadow-xl hover:shadow-brand-orange/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm">
                                <FontAwesomeIcon icon={faRocket} />
                                Оставить заявку
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex-1 relative h-[500px] w-full flex items-center justify-center">
                    {/* "Profit Engine" Visual Placeholder */}
                    <div className="relative w-80 h-96 bg-white rounded-[2.5rem] border-[6px] border-surface-cream shadow-2xl flex flex-col items-center justify-center p-8 text-center rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-background-cream opacity-50 rounded-[2rem]"></div>
                        <div className="relative z-10">
                            <div className="w-32 h-32 bg-brand-green/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <FontAwesomeIcon icon={faChartLine} className="text-5xl text-brand-green" />
                            </div>
                            <h2 className="text-6xl font-black text-brand-brown mb-2">+25%</h2>
                            <p className="text-brand-brown/40 font-bold uppercase tracking-widest text-sm">Net Profit Growth</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pain Points */}
            <section className="py-24 bg-brand-brown text-background-cream px-6 rounded-t-[3rem] shadow-inner shadow-black/20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black mb-4">Почему старые методы не работают?</h2>
                        <p className="text-white/40 max-w-2xl mx-auto">Рынок изменился. Гости хотят заботы и простоты, а не пластиковых карт.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <PainCard
                            icon={faMobileAlt}
                            title="Свое Приложение"
                            cost="$20,000+"
                            desc="Никто не скачивает (конверсия <5%). Бюджет впустую."
                        />
                        <PainCard
                            icon={faIdCard}
                            title="Пластик и Анкеты"
                            cost="Устарело"
                            desc="В 2024 году никто не носит пластик. Вы не знаете гостя."
                        />
                        <PainCard
                            icon={faChartLine}
                            title="Агрегаторы"
                            cost="-30% маржи"
                            desc="Приводят «одноразовых» клиентов. Вы работаете в минус."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const PainCard = ({ icon, title, cost, desc }) => (
    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-brand-orange/50 hover:bg-white/10 transition-all group">
        <div className="flex justify-between items-start mb-6">
            <FontAwesomeIcon icon={icon} className="text-3xl text-white/20 group-hover:text-brand-orange transition-colors" />
            <span className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20">{cost}</span>
        </div>
        <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-white/50 leading-relaxed text-sm">{desc}</p>
    </div>
);

export default MarketingB2B;
