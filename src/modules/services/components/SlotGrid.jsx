import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faCalendarAlt, faClock, faCheck } from '@fortawesome/free-solid-svg-icons';

export const SlotGrid = ({ 
  slots = [], 
  selectedSlotTime, 
  onSelectSlot, 
  selectedDateStr, 
  onSelectDate,
  currency = 'RUB',
  archetype = 'personal'
}) => {
  const isBatch = archetype === 'batch';
  // Generate 7 upcoming dates starting today
  const dateOptions = useMemo(() => {
    const list = [];
    const today = new Date();
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];

      let label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
      if (i === 0) label = 'Сегодня';
      if (i === 1) label = 'Завтра';

      list.push({
        dateStr: iso,
        label,
        dayOfWeek: dayNames[d.getDay()],
        dayNum: d.getDate(),
        month: monthNames[d.getMonth()]
      });
    }
    return list;
  }, []);

  const formatPrice = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (currency === 'VND') return `${num.toLocaleString('vi-VN')} ₫`;
    if (currency === 'AED') return `${num.toLocaleString()} AED`;
    if (currency === 'USD') return `$${num}`;
    if (currency === 'THB' || currency === '฿') return `${num.toLocaleString()} ฿`;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  // Group slots into Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (>= 17:00)
  const groupedSlots = useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    slots.forEach(slot => {
      const hour = Math.floor(slot.startMinutes / 60);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  }, [slots]);

  return (
    <div className="space-y-4">
      {/* Date Selector Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="font-semibold text-white/90">Выберите дату</span>
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" />
            <span>на 7 дней вперед</span>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {dateOptions.map(opt => {
            const isDateSelected = selectedDateStr === opt.dateStr;
            return (
              <button
                key={opt.dateStr}
                type="button"
                onClick={() => onSelectDate(opt.dateStr)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-center border transition-all ${
                  isDateSelected
                    ? 'bg-white text-black font-bold shadow-lg shadow-white/10 scale-105'
                    : 'bg-[#18181A]/70 hover:bg-[#1C1C1E] text-white/80 border-white/10'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-70">
                  {opt.dayOfWeek}
                </div>
                <div className="text-sm font-extrabold mt-0.5">
                  {opt.dayNum} {opt.month}
                </div>
                {opt.label === 'Сегодня' && (
                  <div className="text-[9px] text-[#00FF41] font-semibold mt-0.5">Сегодня</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Grid */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="font-semibold text-white/90">
            {isBatch ? 'Доступные рейсы и время' : 'Доступное время'}
          </span>
          <span className="text-[11px] text-[#00FF41] font-medium flex items-center gap-1">
            <FontAwesomeIcon icon={faFire} className="text-[10px] text-[#FF9933]" />
            <span>Окна со значком содержат скидку</span>
          </span>
        </div>

        {slots.length === 0 ? (
          <div className="p-6 text-center bg-[#18181A]/40 rounded-2xl border border-white/5">
            <p className="text-xs text-white/50">На выбранную дату свободных окон не найдено.</p>
            <p className="text-[11px] text-white/30 mt-1">Попробуйте выбрать другую дату или мастера.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Afternoon Group (Most popular for dynamic yield!) */}
            {groupedSlots.afternoon.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-white/50 mb-2 flex items-center gap-1">
                  <span>День (12:00 – 17:00)</span>
                  <span className="text-[10px] text-[#00FF41] bg-[#00FF41]/10 px-1.5 py-0.2 rounded font-normal">
                    выгодные часы
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {groupedSlots.afternoon.map(slot => (
                    <SlotPill 
                      key={slot.time} 
                      slot={slot} 
                      isSelected={selectedSlotTime === slot.time}
                      onSelect={() => onSelectSlot(slot)}
                      formatPrice={formatPrice}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Morning Group */}
            {groupedSlots.morning.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-white/50 mb-2">
                  Утро (до 12:00)
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {groupedSlots.morning.map(slot => (
                    <SlotPill 
                      key={slot.time} 
                      slot={slot} 
                      isSelected={selectedSlotTime === slot.time}
                      onSelect={() => onSelectSlot(slot)}
                      formatPrice={formatPrice}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Evening Group */}
            {groupedSlots.evening.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-white/50 mb-2">
                  Вечер (после 17:00)
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {groupedSlots.evening.map(slot => (
                    <SlotPill 
                      key={slot.time} 
                      slot={slot} 
                      isSelected={selectedSlotTime === slot.time}
                      onSelect={() => onSelectSlot(slot)}
                      formatPrice={formatPrice}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Individual Slot Pill
const SlotPill = ({ slot, isSelected, onSelect, formatPrice, currency = 'RUB' }) => {
  const currencySymbol = currency === 'RUB' ? '₽' : currency === 'THB' || currency === '฿' ? '฿' : currency === 'AED' ? 'AED' : currency === 'USD' ? '$' : currency === 'VND' ? '₫' : currency;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative p-2.5 rounded-xl border text-center transition-all ${
        isSelected
          ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-lg shadow-[#00FF41]/25 scale-105 font-bold'
          : slot.hasDiscount
            ? 'bg-[#18181A] hover:bg-[#1C1C1E] border-[#00FF41]/40 text-white'
            : 'bg-[#141416] hover:bg-[#1C1C1E] border-white/10 text-white/90'
      }`}
    >
      {/* Discount badge */}
      {slot.hasDiscount && (
        <span className={`absolute -top-2 -right-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold tracking-tight flex items-center gap-0.5 shadow-sm ${
          isSelected 
            ? 'bg-black text-[#00FF41]' 
            : 'bg-gradient-to-r from-[#FF9933] to-[#00FF41] text-black'
        }`}>
          <FontAwesomeIcon icon={faFire} className="text-[8px]" />
          <span>
            {slot.discountType === 'fixed' ? `-${slot.discountAmount} ${currencySymbol}` : `-${Math.round((slot.discountAmount / slot.basePrice) * 100)}%`}
          </span>
        </span>
      )}

      {/* Time */}
      <div className="text-sm font-extrabold tracking-tight">
        {slot.time}
      </div>

      {/* Price */}
      <div className="text-[11px] mt-0.5">
        {slot.hasDiscount ? (
          <div className="flex items-center justify-center gap-1">
            <span className={`line-through text-[10px] ${isSelected ? 'text-black/50' : 'text-white/40'}`}>
              {formatPrice(slot.basePrice)}
            </span>
            <span className={`font-bold ${isSelected ? 'text-black' : 'text-[#00FF41]'}`}>
              {formatPrice(slot.finalPrice)}
            </span>
          </div>
        ) : (
          <span className={isSelected ? 'text-black/80 font-semibold' : 'text-white/60'}>
            {formatPrice(slot.finalPrice)}
          </span>
        )}
      </div>
    </button>
  );
};
