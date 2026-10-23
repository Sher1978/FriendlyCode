import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faCheckCircle, 
  faUser, 
  faPhone, 
  faCalendarAlt, 
  faClock, 
  faShieldAlt, 
  faSpinner, 
  faLocationDot,
  faFire
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

export const BookingModal = ({
  isOpen,
  onClose,
  service,
  staff,
  slot,
  dateStr,
  venue,
  currency = 'RUB',
  onConfirmSuccess
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  if (!isOpen || !service || !slot) return null;

  const formatPrice = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (currency === 'VND') return `${num.toLocaleString('vi-VN')} ₫`;
    if (currency === 'AED') return `${num.toLocaleString()} AED`;
    if (currency === 'USD') return `$${num}`;
    if (currency === 'THB' || currency === '฿') return `${num.toLocaleString()} ฿`;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Keep numbers and leading +
    val = val.replace(/[^0-9+]/g, '');
    setClientPhone(val);
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setErrorMessage('Пожалуйста, укажите ваше имя');
      return;
    }

    // Phone validation: must have at least 10 digits
    const digitsOnly = clientPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setErrorMessage('Пожалуйста, введите корректный номер телефона (минимум 10 цифр)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // Build start and end dates
      const startDateTime = new Date(`${dateStr}T${slot.time}:00Z`);
      const endDateTime = new Date(startDateTime.getTime() + (slot.durationMinutes || 45) * 60000);

      const bookingPayload = {
        venueId: venue?.id || 'default_venue',
        clientName,
        clientPhone,
        serviceId: service.id,
        serviceName: service.title || service.name || 'Услуга',
        staffId: staff?.id || 'any',
        staffName: staff?.name || 'Любой свободный мастер',
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        originalPrice: slot.basePrice,
        finalPrice: slot.finalPrice,
        discountAmount: slot.discountAmount || 0,
        discountType: slot.discountType || 'percent',
        appliedRuleName: slot.appliedRuleName,
        notes,
        source: 'google_maps'
      };

      const result = await onConfirmSuccess(bookingPayload);
      setBookingSuccess(result);
    } catch (err) {
      console.error('Booking failed:', err);
      setErrorMessage('Произошла ошибка при сохранении записи. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleMapsUrl = venue?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue?.name || ''} ${venue?.address || ''}`)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative w-full max-w-lg bg-[#141416] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-all"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>

          {!bookingSuccess ? (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded">
                  Подтверждение записи
                </span>
                <h2 className="text-xl font-bold text-white mt-1.5">
                  {service.name}
                </h2>
                <div className="text-xs text-white/60 mt-0.5">
                  Мастер: <span className="text-white font-medium">{staff?.name || 'Любой свободный мастер'}</span>
                </div>
              </div>

              {/* Date & Time pill */}
              <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div>
                    <div className="text-white font-bold">{dateStr}</div>
                    <div className="text-white/50 text-[11px] flex items-center gap-1">
                      <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                      <span>{slot.time} ({slot.durationMinutes || 45} мин)</span>
                    </div>
                  </div>
                </div>

                {slot.hasDiscount && (
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-[#FF9933] text-black text-[10px] font-extrabold flex items-center gap-1">
                      <FontAwesomeIcon icon={faFire} className="text-[9px]" />
                      <span>{slot.discountType === 'fixed' ? `-${slot.discountAmount} ₽` : `-${Math.round((slot.discountAmount / slot.basePrice) * 100)}%`}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Price Calculation breakdown */}
              <div className="p-3.5 rounded-2xl bg-[#1C1C1E]/50 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-white/60">
                  <span>Базовая стоимость услуги:</span>
                  <span>{formatPrice(slot.basePrice)}</span>
                </div>
                {slot.hasDiscount && (
                  <div className="flex items-center justify-between text-[#00FF41] font-medium">
                    <span>Динамическая скидка на свободный час:</span>
                    <span>-{formatPrice(slot.discountAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold text-white">
                  <span>Итого к оплате на месте:</span>
                  <span className="text-base text-[#00FF41]">{formatPrice(slot.finalPrice)}</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Ваше имя <span className="text-[#FF9933]">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-3.5 text-white/40 text-xs" />
                    <input
                      type="text"
                      placeholder="Иван"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF41] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Номер телефона для подтверждения <span className="text-[#FF9933]">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-3.5 text-white/40 text-xs" />
                    <input
                      type="tel"
                      placeholder="+7 999 000-00-00"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      required
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF41] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Комментарий мастеру (необязательно)
                  </label>
                  <input
                    type="text"
                    placeholder="Например: хочу сменить стрижку"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF41] transition-all"
                  />
                </div>
              </div>

              {/* Payment Guarantee Notice */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2 text-[11px] text-white/60">
                <FontAwesomeIcon icon={faShieldAlt} className="text-[#00FF41] mt-0.5 shrink-0" />
                <span>
                  Предоплата не требуется. Оплата производится на месте в заведении после оказания услуги.
                </span>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-extrabold text-sm shadow-lg shadow-[#00FF41]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base" />
                    <span>Бронирование...</span>
                  </>
                ) : (
                  <>
                    <span>Забронировать визит со скидкой</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,255,65,0.2)]">
                <FontAwesomeIcon icon={faCheckCircle} className="text-3xl" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded">
                  Запись подтверждена
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">
                  Ждем вас в {venue?.name || 'заведении'}!
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Детали визита сохранены. Мы отправим напоминание за 2 часа до визита.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">Услуга:</span>
                  <span className="font-semibold text-white">{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Мастер:</span>
                  <span className="font-semibold text-white">{staff?.name || 'Любой свободный мастер'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Дата и время:</span>
                  <span className="font-semibold text-[#00FF41]">{dateStr} в {slot.time}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-white/50">К оплате на месте:</span>
                  <span className="font-bold text-white text-sm">{formatPrice(slot.finalPrice)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
                >
                  <FontAwesomeIcon icon={faLocationDot} className="text-[#EA4335]" />
                  <span>Построить маршрут на Google Картах</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-transparent text-white/60 hover:text-white text-xs font-medium"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
