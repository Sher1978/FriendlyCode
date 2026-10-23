import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCheck, faFire, faAngleRight } from '@fortawesome/free-solid-svg-icons';

export const ServiceCard = ({ 
  service, 
  currency = 'RUB', 
  isSelected = false, 
  onSelect,
  promoDiscountText = ''
}) => {
  const formatPrice = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (currency === 'VND') return `${num.toLocaleString('vi-VN')} ₫`;
    if (currency === 'AED') return `${num.toLocaleString()} AED`;
    if (currency === 'USD') return `$${num}`;
    if (currency === 'THB' || currency === '฿') return `${num.toLocaleString()} ฿`;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
        isSelected 
          ? 'bg-[#1C1C1E] border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.15)] scale-[1.01]' 
          : 'bg-[#18181A]/80 hover:bg-[#1C1C1E] border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Category & Promo tag */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {service.category && (
              <span className="text-[10px] font-semibold tracking-wider uppercase text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                {service.category}
              </span>
            )}
            {promoDiscountText && (
              <span className="text-[10px] font-bold text-[#FF9933] bg-[#FF9933]/10 border border-[#FF9933]/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <FontAwesomeIcon icon={faFire} className="text-[9px]" />
                <span>{promoDiscountText}</span>
              </span>
            )}
          </div>

          {/* Service Name */}
          <h3 className="text-base font-semibold text-white tracking-tight leading-snug">
            {service.title || service.name || 'Услуга'}
          </h3>

          {/* Description */}
          {service.description && (
            <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
              {service.description}
            </p>
          )}

          {/* Duration & Details */}
          <div className="flex items-center gap-3 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} className="text-[11px] text-white/40" />
              <span>{service.durationMinutes || 45} мин</span>
            </span>
          </div>
        </div>

        {/* Price & Action Button */}
        <div className="flex flex-col items-end justify-between shrink-0 pl-2">
          <div className="text-right">
            <div className="text-base sm:text-lg font-bold text-white tracking-tight">
              {formatPrice(service.price)}
            </div>
            {promoDiscountText && (
              <div className="text-[11px] text-[#00FF41] font-medium">
                бывает со скидкой
              </div>
            )}
          </div>

          <button 
            type="button"
            className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSelected 
                ? 'bg-[#00FF41] text-black shadow-lg shadow-[#00FF41]/20' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isSelected ? (
              <>
                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                <span>Выбрано</span>
              </>
            ) : (
              <>
                <span>Выбрать</span>
                <FontAwesomeIcon icon={faAngleRight} className="text-[10px] text-white/60" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
