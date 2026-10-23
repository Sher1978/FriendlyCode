import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMapsHeader } from './components/GoogleMapsHeader';
import { ServiceList } from './components/ServiceList';
import { MasterSelector } from './components/MasterSelector';
import { SlotGrid } from './components/SlotGrid';
import { BookingModal } from './components/BookingModal';
import { VehicleSeatMap } from './components/VehicleSeatMap';
import { HotDealsScroller } from './components/HotDealsScroller';
import { AIConciergeWidget } from './components/AIConciergeWidget';
import { bookingApiService } from './services/bookingApiService';
import { ServiceYieldCalculator } from './logic/ServiceYieldCalculator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faCalendarAlt, faFire, faSpinner } from '@fortawesome/free-solid-svg-icons';

export const ServiceStorefront = ({ venue }) => {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [yieldRules, setYieldRules] = useState([]);
  const [busyIntervals, setBusyIntervals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Flow Steps: 'services' -> 'slots' -> 'modal'
  const [currentStep, setCurrentStep] = useState('services');

  // Selected State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState({ id: 'any', name: 'Любой свободный мастер' });
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isSelectingSeat, setIsSelectingSeat] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const venueId = venue?.id;
  const currency = venue?.currency || 'RUB';

  // Compute Archetype: batch (transfers/visa), asset (dentistry/clinic/detailing), space (courts/studios), personal (masters/barbers/spa)
  const archetype = useMemo(() => {
    if (venue?.archetype) return venue.archetype;
    const cat = String(venue?.category || '').toLowerCase();
    const name = String(venue?.name || '').toLowerCase();
    const str = `${cat} ${name}`;
    if (str.includes('бордер') || str.includes('виза') || str.includes('трансфер') || str.includes('тур') || str.includes('bus') || str.includes('рейс')) {
      return 'batch';
    }
    if (str.includes('стоматолог') || str.includes('клиник') || str.includes('детейлинг') || str.includes('бокс') || str.includes('узи') || str.includes('мрт')) {
      return 'asset';
    }
    if (str.includes('корт') || str.includes('студи') || str.includes('баня') || str.includes('зал') || str.includes('аренд')) {
      return 'space';
    }
    return 'personal';
  }, [venue]);

  // 1. Initial Load: Services, Staff, Yield Rules
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [loadedServices, loadedStaff, loadedRules] = await Promise.all([
          bookingApiService.getServices(venueId, venue?.gmConfig?.services || []),
          bookingApiService.getStaff(venueId),
          bookingApiService.getYieldRules(venueId)
        ]);

        if (isMounted) {
          setServices(loadedServices);
          setStaff(loadedStaff);
          setYieldRules(loadedRules);
        }
      } catch (err) {
        console.error('ServiceStorefront: failed to load catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [venueId]);

  // 2. Load busy intervals when date or staff changes
  useEffect(() => {
    let isMounted = true;
    async function loadBusy() {
      if (!venueId || !selectedDateStr) return;
      try {
        const busy = await bookingApiService.getBusyIntervals(venueId, selectedStaff?.id, selectedDateStr);
        if (isMounted) setBusyIntervals(busy);
      } catch (err) {
        console.error('ServiceStorefront: failed to load busy intervals:', err);
      }
    }

    loadBusy();
    return () => { isMounted = false; };
  }, [venueId, selectedStaff?.id, selectedDateStr]);

  // 3. Compute Virtual Slots on the fly using ServiceYieldCalculator
  const computedSlots = useMemo(() => {
    if (!selectedService || !selectedDateStr) return [];

    const now = new Date();
    const nowDateStr = now.toISOString().split('T')[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return ServiceYieldCalculator.generateSlots({
      shiftStart: selectedStaff?.workStartTime || "10:00",
      shiftEnd: selectedStaff?.workEndTime || "21:00",
      stepMinutes: 30,
      durationMinutes: selectedService.durationMinutes || 45,
      busyIntervals,
      yieldRules,
      basePrice: selectedService.price || 1000,
      dateStr: selectedDateStr,
      nowDateStr,
      nowMinutes
    });
  }, [selectedService, selectedStaff, selectedDateStr, busyIntervals, yieldRules]);

  // 4. Hot Flash Deals Scroller (Распродажа слотов с максимальными скидками)
  const hotDeals = useMemo(() => {
    if (!services || services.length === 0) return [];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    const deals = [];

    // Service 1: Top Deal (-25% discount)
    if (services[0]) {
      const s0 = services[0];
      const orig = Number(s0.price) || 2900;
      const discPercent = 25;
      const discAmt = Math.round((orig * discPercent) / 100);
      deals.push({
        id: 'deal_top_1',
        serviceId: s0.id,
        serviceName: s0.title || s0.name || 'Бордер-ран в Камбоджу',
        dateStr: tomorrowStr,
        dateLabel: 'Завтра',
        slotTime: '10:00',
        vehicleId: staff[0]?.id || 'master_1',
        vehicleName: staff[0]?.name || (archetype === 'batch' ? 'Toyota Commuter VIP' : 'Топ-мастер'),
        discountPercent: discPercent,
        originalPrice: orig,
        finalPrice: orig - discAmt,
        discountAmount: discAmt,
        seatsLeft: 2
      });
    }

    // Service 2: VIP Deal (-30% discount)
    if (services[1]) {
      const s1 = services[1];
      const orig = Number(s1.price) || 3800;
      const discPercent = 30;
      const discAmt = Math.round((orig * discPercent) / 100);
      deals.push({
        id: 'deal_top_2',
        serviceId: s1.id,
        serviceName: s1.title || s1.name || 'Бордер-ран в Камбоджу (VIP)',
        dateStr: tomorrowStr,
        dateLabel: 'Завтра',
        slotTime: '10:30',
        vehicleId: staff[1]?.id || 'master_2',
        vehicleName: staff[1]?.name || (archetype === 'batch' ? 'VIP Спринтер #2' : 'Ведущий специалист'),
        discountPercent: discPercent,
        originalPrice: orig,
        finalPrice: orig - discAmt,
        discountAmount: discAmt,
        seatsLeft: 3
      });
    }

    // Service 3: Overnight / Sleeper deal (-20% discount)
    if (services[2] || services[0]) {
      const s2 = services[2] || services[0];
      const orig = Number(s2.price) || (services[2] ? 7500 : 2900);
      const discPercent = 20;
      const discAmt = Math.round((orig * discPercent) / 100);
      deals.push({
        id: 'deal_top_3',
        serviceId: s2.id,
        serviceName: s2.title || s2.name,
        dateStr: dayAfterStr,
        dateLabel: 'Вс, 25 окт',
        slotTime: '07:00',
        vehicleId: staff[2]?.id || staff[0]?.id || 'master_3',
        vehicleName: staff[2]?.name || (archetype === 'batch' ? 'Слипер-бас #3 (2 этажа)' : 'Специалист'),
        discountPercent: discPercent,
        originalPrice: orig,
        finalPrice: orig - discAmt,
        discountAmount: discAmt,
        seatsLeft: 5
      });
    }

    return deals;
  }, [services, staff, archetype]);

  // Handlers
  const handleSelectService = (service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setSelectedSeats([]);
    setIsSelectingSeat(false);
    setCurrentStep('slots');
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleSelectHotDeal = (deal) => {
    const matchedService = services.find(s => s.id === deal.serviceId) || services[0];
    const matchedStaff = staff.find(st => st.id === deal.vehicleId) || staff[0] || { id: 'any', name: deal.vehicleName };

    setSelectedService(matchedService);
    setSelectedStaff(matchedStaff);
    setSelectedDateStr(deal.dateStr);

    const syntheticSlot = {
      time: deal.slotTime,
      durationMinutes: matchedService?.durationMinutes || 60,
      basePrice: deal.originalPrice,
      finalPrice: deal.finalPrice,
      discountAmount: deal.discountAmount,
      discountType: 'percent',
      hasDiscount: true,
      appliedRuleName: `Горящее предложение (-${deal.discountPercent}%)`
    };
    setSelectedSlot(syntheticSlot);
    setSelectedSeats([]);

    if (archetype === 'batch') {
      setIsSelectingSeat(true);
      setCurrentStep('slots');
      window.scrollTo({ top: 350, behavior: 'smooth' });
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setSelectedSeats([]);
    if (archetype === 'batch') {
      setIsSelectingSeat(true);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    } else {
      setIsModalOpen(true);
    }
  };

  const handleProceedFromSeatMap = (seats) => {
    setSelectedSeats(seats);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = async (payload) => {
    const result = await bookingApiService.createBooking(payload);
    return result;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans antialiased pb-24">
      {/* Google Maps + Revo Hero Header */}
      <GoogleMapsHeader venue={venue} />

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5">
        {isLoading ? (
          <div className="py-20 text-center text-white/50 space-y-3">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[#00FF41]" />
            <p className="text-xs">Загрузка каталога услуг и свободных слотов...</p>
          </div>
        ) : (
          <div>
            {/* Step Indicator */}
            {currentStep === 'slots' && (
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentStep('services')}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-all font-medium"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  <span>Назад к списку услуг</span>
                </button>

                <div className="text-[11px] text-[#00FF41] font-semibold flex items-center gap-1">
                  <span>Шаг 2 из 2: Выбор времени</span>
                </div>
              </div>
            )}

            {/* Step 1: Select Service */}
            {currentStep === 'services' && (
              <div className="space-y-4">
                {/* 🔥 Горящие предложения с максимальной скидкой (Hot Deals Scroller) */}
                {hotDeals.length > 0 && (
                  <HotDealsScroller
                    deals={hotDeals}
                    currency={currency}
                    onSelectDeal={handleSelectHotDeal}
                    archetype={archetype}
                  />
                )}

                <div className="flex items-center justify-between pt-1">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Все услуги
                  </h2>
                  <span className="text-xs text-white/40">
                    {services.length} доступно
                  </span>
                </div>

                <ServiceList
                  services={services}
                  selectedServiceId={selectedService?.id}
                  onSelectService={handleSelectService}
                  currency={currency}
                />
              </div>
            )}

            {/* Step 2: Pick Master & Time Slots OR Vehicle Seating */}
            {currentStep === 'slots' && selectedService && (
              <div className="space-y-6">
                {/* Active Service Card Summary */}
                <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-[#00FF41]/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                      Выбранная услуга
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {selectedService.title || selectedService.name || 'Услуга'}
                    </div>
                    <div className="text-xs text-white/60">
                      {selectedService.durationMinutes || 45} мин
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-[#00FF41]">
                      от {selectedService.price} {currency}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep('services');
                        setIsSelectingSeat(false);
                      }}
                      className="text-[11px] text-white/50 hover:text-white underline mt-0.5"
                    >
                      Изменить
                    </button>
                  </div>
                </div>

                {/* If user picked a batch slot, show Interactive Vehicle Seat Map with Decks/Zones */}
                {isSelectingSeat && selectedSlot ? (
                  <VehicleSeatMap
                    vehicle={selectedStaff}
                    slot={selectedSlot}
                    currency={currency}
                    selectedSeats={selectedSeats}
                    onSelectSeats={setSelectedSeats}
                    onProceed={handleProceedFromSeatMap}
                    onBack={() => setIsSelectingSeat(false)}
                  />
                ) : (
                  <>
                    {/* Master / Vehicle Selection */}
                    {staff.length > 0 && (
                      <MasterSelector
                        staff={staff}
                        selectedStaffId={selectedStaff?.id}
                        onSelectStaff={setSelectedStaff}
                        archetype={archetype}
                      />
                    )}

                    {/* Slot Selection Grid */}
                    <SlotGrid
                      slots={computedSlots}
                      selectedSlotTime={selectedSlot?.time}
                      onSelectSlot={handleSelectSlot}
                      selectedDateStr={selectedDateStr}
                      onSelectDate={setSelectedDateStr}
                      currency={currency}
                      archetype={archetype}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal Confirmation */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedService}
        staff={selectedStaff}
        slot={selectedSlot}
        dateStr={selectedDateStr}
        venue={venue}
        currency={currency}
        archetype={archetype}
        selectedSeats={selectedSeats}
        onConfirmSuccess={handleConfirmBooking}
      />

      {/* 24/7 AI-Concierge Floating Chat Widget */}
      <AIConciergeWidget venue={venue} />
    </div>
  );
};

export default ServiceStorefront;
