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
  const [fleetTemplates, setFleetTemplates] = useState([]);
  const [scheduledTrips, setScheduledTrips] = useState([]);
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

  // 1. Initial Load: Services, Staff, Yield Rules, Fleet Templates, Scheduled Trips
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [loadedServices, loadedStaff, loadedRules, loadedFleet, loadedTrips] = await Promise.all([
          bookingApiService.getServices(venueId, venue?.gmConfig?.services || []),
          bookingApiService.getStaff(venueId),
          bookingApiService.getYieldRules(venueId),
          bookingApiService.getFleetTemplates(venueId),
          bookingApiService.getScheduledTrips(venueId)
        ]);

        if (isMounted) {
          setServices(loadedServices);
          setStaff(loadedStaff);
          setYieldRules(loadedRules);
          setFleetTemplates(loadedFleet);
          setScheduledTrips(loadedTrips);
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

  // 3. Compute Slots from Scheduled Trips (if configured in Admin) OR Virtual Slots using ServiceYieldCalculator
  const computedSlots = useMemo(() => {
    if (!selectedService || !selectedDateStr) return [];

    // Check if there are scheduled trips for this date
    const dateTrips = scheduledTrips.filter(t => {
      if (t.status === 'cancelled') return false;
      if (t.dateStr !== selectedDateStr) return false;
      if (t.serviceId && selectedService.id && t.serviceId === selectedService.id) return true;
      if (t.serviceName && (selectedService.title || selectedService.name)) {
        const sName = String(selectedService.title || selectedService.name).toLowerCase();
        if (String(t.serviceName).toLowerCase().includes(sName) || sName.includes(String(t.serviceName).toLowerCase())) {
          return true;
        }
      }
      return !t.serviceId;
    });

    if (dateTrips.length > 0) {
      return dateTrips
        .filter(t => t.seatsLeft > 0)
        .map(t => {
          const basePrice = Number(t.basePrice || selectedService.price) || 1500;
          const dynDisc = Number(t.currentDynamicDiscount) || 0;
          const hasDiscount = Boolean(t.isYieldActive && dynDisc > 0);
          const discountAmount = hasDiscount ? Math.round((basePrice * dynDisc) / 100) : 0;
          const finalPrice = Math.max(0, basePrice - discountAmount);
          const matchedTemplate = fleetTemplates.find(ft => ft.id === t.fleetTemplateId) ||
            fleetTemplates.find(ft => ft.id === selectedService.fleetTemplateId) ||
            fleetTemplates[0] ||
            null;

          return {
            time: t.timeStr || '07:00',
            durationMinutes: selectedService.durationMinutes || 600,
            basePrice,
            finalPrice,
            discountAmount,
            discountType: 'percent',
            hasDiscount,
            appliedRuleName: hasDiscount ? `Горящий рейс (-${dynDisc}%)` : null,
            seatsLeft: t.seatsLeft,
            tripId: t.id,
            trip: t,
            fleetTemplate: matchedTemplate
          };
        })
        .sort((a, b) => a.time.localeCompare(b.time));
    }

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
  }, [selectedService, selectedStaff, selectedDateStr, busyIntervals, yieldRules, scheduledTrips, fleetTemplates]);

  // 4. Hot Flash Deals Scroller (Распродажа слотов с максимальными скидками)
  const hotDeals = useMemo(() => {
    if (!services || services.length === 0) return [];

    const nowStr = new Date().toISOString().split('T')[0];
    const formatRuDateLabel = (dStr) => {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (dStr === nowStr) return 'Сегодня';
        if (dStr === tomorrowStr) return 'Завтра';
        const d = new Date(`${dStr}T12:00:00`);
        return new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
          .format(d)
          .replace('.', '');
      } catch (_) {
        return dStr;
      }
    };

    // Priority 1: Use real upcoming scheduled_trips if available
    const upcomingTrips = scheduledTrips
      .filter(t => t.dateStr >= nowStr && t.seatsLeft > 0 && t.status !== 'cancelled')
      .sort((a, b) => `${a.dateStr}_${a.timeStr}`.localeCompare(`${b.dateStr}_${b.timeStr}`));

    if (upcomingTrips.length > 0) {
      return upcomingTrips.slice(0, 4).map((t, idx) => {
        const matchedSrv = services.find(s => s.id === t.serviceId) || services[0];
        const orig = Number(t.basePrice || matchedSrv?.price) || 2900;
        const discPercent = (t.isYieldActive && t.currentDynamicDiscount > 0)
          ? Math.round(t.currentDynamicDiscount)
          : (yieldRules[0]?.discountValue && yieldRules[0]?.discountType !== 'fixed'
              ? Number(yieldRules[0].discountValue)
              : [20, 25, 15, 30][idx % 4]);
        const discAmt = Math.round((orig * discPercent) / 100);
        const matchedTemplate = fleetTemplates.find(ft => ft.id === t.fleetTemplateId) || fleetTemplates[0] || null;

        return {
          id: `deal_trip_${t.id}`,
          tripId: t.id,
          trip: t,
          fleetTemplate: matchedTemplate,
          serviceId: matchedSrv?.id || t.serviceId,
          serviceName: t.serviceName || matchedSrv?.title || matchedSrv?.name || 'Рейс',
          dateStr: t.dateStr,
          dateLabel: formatRuDateLabel(t.dateStr),
          slotTime: t.timeStr || '07:00',
          vehicleId: t.fleetTemplateId || staff[0]?.id || 'master_1',
          vehicleName: t.fleetTemplateName || matchedTemplate?.name || staff[0]?.name || 'VIP Трансфер',
          discountPercent: discPercent,
          originalPrice: orig,
          finalPrice: Math.max(0, orig - discAmt),
          discountAmount: discAmt,
          seatsLeft: t.seatsLeft
        };
      });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];
    const dayAfterLabel = formatRuDateLabel(dayAfterStr);

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
        vehicleName: fleetTemplates[0]?.name || staff[0]?.name || (archetype === 'batch' ? 'Toyota Commuter VIP' : 'Топ-мастер'),
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
        vehicleName: fleetTemplates[1]?.name || staff[1]?.name || (archetype === 'batch' ? 'VIP Спринтер #2' : 'Ведущий специалист'),
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
        dateLabel: dayAfterLabel,
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
  }, [services, staff, archetype, scheduledTrips, fleetTemplates, yieldRules]);

  // Handlers
  const handleSelectService = (service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setSelectedSeats([]);
    setIsSelectingSeat(false);

    // If service has an assigned fleetTemplateId from Flutter Admin, bind it to selectedStaff
    if (service?.fleetTemplateId && fleetTemplates.length > 0) {
      const ft = fleetTemplates.find(t => t.id === service.fleetTemplateId);
      if (ft) {
        setSelectedStaff({
          id: ft.id,
          name: ft.name,
          decks: ft.decks,
          layoutType: ft.category === 'sleeper' ? 'sleeper' : 'seat'
        });
      }
    }

    setCurrentStep('slots');
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleSelectHotDeal = (deal) => {
    const matchedService = services.find(s => s.id === deal.serviceId) || services[0];
    const matchedTemplate = deal.fleetTemplate ||
      fleetTemplates.find(ft => ft.id === deal.vehicleId) ||
      fleetTemplates.find(ft => ft.id === matchedService?.fleetTemplateId) ||
      null;
    const matchedStaff = matchedTemplate
      ? {
          id: matchedTemplate.id,
          name: matchedTemplate.name,
          decks: matchedTemplate.decks,
          layoutType: matchedTemplate.category === 'sleeper' ? 'sleeper' : 'seat'
        }
      : (staff.find(st => st.id === deal.vehicleId) || staff[0] || { id: 'any', name: deal.vehicleName });

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
      appliedRuleName: `Горящее предложение (-${deal.discountPercent}%)`,
      tripId: deal.tripId || null,
      trip: deal.trip || null,
      fleetTemplate: matchedTemplate
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
    const tpl = slot?.fleetTemplate ||
      fleetTemplates.find(ft => ft.id === selectedService?.fleetTemplateId) ||
      fleetTemplates[0] ||
      null;
    if (tpl && archetype === 'batch') {
      setSelectedStaff({
        id: tpl.id,
        name: tpl.name,
        decks: tpl.decks,
        layoutType: tpl.category === 'sleeper' ? 'sleeper' : 'seat'
      });
    }
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
    // Refresh scheduled trips after booking so reserved seats update in real time
    if (venueId) {
      bookingApiService.getScheduledTrips(venueId).then(updatedTrips => {
        setScheduledTrips(updatedTrips);
      }).catch(() => {});
    }
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
