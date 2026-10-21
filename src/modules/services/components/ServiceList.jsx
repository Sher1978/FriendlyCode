import React, { useState, useMemo } from 'react';
import { ServiceCard } from './ServiceCard';

export const ServiceList = ({ 
  services = [], 
  selectedServiceId, 
  onSelectService, 
  currency = 'RUB' 
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    services.forEach(s => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    return ['all', ...Array.from(set)];
  }, [services]);

  // Filter services by active category
  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return services;
    return services.filter(s => s.category?.trim() === activeCategory);
  }, [services, activeCategory]);

  if (!services || services.length === 0) {
    return (
      <div className="p-8 text-center bg-[#18181A]/50 rounded-2xl border border-white/5 my-4">
        <p className="text-sm text-white/50">Список услуг пуст или обновляется администратором.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Pills Header */}
      {categories.length > 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isCatActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isCatActive
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                }`}
              >
                {cat === 'all' ? 'Все услуги' : cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Services Grid */}
      <div className="space-y-2.5">
        {filteredServices.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            currency={currency}
            isSelected={selectedServiceId === service.id}
            onSelect={() => onSelectService(service)}
            promoDiscountText="до -25%"
          />
        ))}
      </div>
    </div>
  );
};
