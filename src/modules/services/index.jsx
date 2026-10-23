import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMapsHeader } from './components/GoogleMapsHeader';
import { ServiceList } from './components/ServiceList';
import { MasterSelector } from './components/MasterSelector';
import { SlotGrid } from './components/SlotGrid';
import { BookingModal } from './components/BookingModal';
import { VehicleSeatMap } from './components/VehicleSeatMap';
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
    const cat = (venue?.category || '').toLowerCase();
    const name = (venue?.name || '').toLowerCase();
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

  // Handlers
  const handleSelectService = (service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setSelectedSeats([]);
    setIsSelectingSeat(false);
    setCurrentStep('slots');
    window.scrollTo({ top: 320, behavior: 'smooth' });
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
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Выберите услугу
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
