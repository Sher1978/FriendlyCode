import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBed, 
  faChair, 
  faLock, 
  faCheck, 
  faSnowflake, 
  faBolt, 
  faSuitcase, 
  faArrowLeft, 
  faUserFriends,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';

/**
 * Default Presets for Single-deck Minivan & Double-deck Sleeper Bus
 */
const SLEEPER_BUS_PRESET = {
  id: 'sleeper_std_36',
  name: 'VIP Sleeper Bus (2 этажа / 36 полок)',
  type: 'sleeper',
  decks: [
    {
      id: 'lower',
      name: 'Нижний ярус',
      badge: 'Плавный ход • Без качки',
      deckPrefix: 'A',
      numberingScheme: 'deck_prefix',
      priceModifier: 0,
      rows: [
        {
          rowNumber: 1,
          seats: [
            { id: 'L01', label: 'A01', col: 1, type: 'window', status: 'occupied', features: ['window', 'usb'] },
            { id: 'L02', label: 'A02', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: 0 },
            { id: 'L03', label: 'A03', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 2,
          seats: [
            { id: 'L04', label: 'A04', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: 'L05', label: 'A05', col: 2, type: 'center', status: 'occupied', features: ['usb', 'ac_shield'] },
            { id: 'L06', label: 'A06', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 3,
          seats: [
            { id: 'L07', label: 'A07', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: 'L08', label: 'A08', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: 0 },
            { id: 'L09', label: 'A09', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 4,
          seats: [
            { id: 'L10', label: 'A10', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: 'L11', label: 'A11', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: 0 },
            { id: 'L12', label: 'A12', col: 3, type: 'window', status: 'occupied', features: ['window', 'usb'] }
          ]
        },
        {
          rowNumber: 5,
          seats: [
            { id: 'L13', label: 'A13', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: 'L14', label: 'A14', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: 0 },
            { id: 'L15', label: 'A15', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 6,
          seats: [
            { id: 'L16', label: 'A16', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: 'L17', label: 'A17', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: 0 },
            { id: 'L18', label: 'A18', col: 3, type: 'luggage', status: 'locked', note: 'Багаж гида', features: [] }
          ]
        }
      ]
    },
    {
      id: 'upper',
      name: 'Верхний ярус',
      badge: 'Панорамный вид • Скидка 100 ฿',
      deckPrefix: 'B',
      numberingScheme: 'deck_prefix',
      priceModifier: -100,
      rows: [
        {
          rowNumber: 1,
          seats: [
            { id: 'U19', label: 'B01', col: 1, type: 'window', status: 'occupied', features: ['window', 'usb'] },
            { id: 'U20', label: 'B02', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: -100 },
            { id: 'U21', label: 'B03', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 }
          ]
        },
        {
          rowNumber: 2,
          seats: [
            { id: 'U22', label: 'B04', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 },
            { id: 'U23', label: 'B05', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: -100 },
            { id: 'U24', label: 'B06', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 }
          ]
        },
        {
          rowNumber: 3,
          seats: [
            { id: 'U25', label: 'B07', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 },
            { id: 'U26', label: 'B08', col: 2, type: 'center', status: 'occupied', features: ['usb', 'ac_shield'] },
            { id: 'U27', label: 'B09', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 }
          ]
        },
        {
          rowNumber: 4,
          seats: [
            { id: 'U28', label: 'B10', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 },
            { id: 'U29', label: 'B11', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: -100 },
            { id: 'U30', label: 'B12', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 }
          ]
        },
        {
          rowNumber: 5,
          seats: [
            { id: 'U31', label: 'B13', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 },
            { id: 'U32', label: 'B14', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: -100 },
            { id: 'U33', label: 'B15', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 }
          ]
        },
        {
          rowNumber: 6,
          seats: [
            { id: 'U34', label: 'B16', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: -100 },
            { id: 'U35', label: 'B17', col: 2, type: 'center', status: 'available', features: ['usb', 'ac_shield'], priceModifier: -100 },
            { id: 'U36', label: 'B18', col: 3, type: 'window', status: 'locked', note: 'Резерв', features: [] }
          ]
        }
      ]
    }
  ]
};

const MINIVAN_VIP_PRESET = {
  id: 'minivan_vip_10',
  name: 'Toyota Commuter VIP (10 мест)',
  type: 'seat',
  decks: [
    {
      id: 'main',
      name: 'Салон VIP (1 этаж)',
      badge: 'Кожаные кресла • Кондиционер',
      priceModifier: 0,
      rows: [
        {
          rowNumber: 1,
          seats: [
            { id: '1A', label: '1A', col: 1, type: 'vip', status: 'occupied', features: ['window', 'usb'], priceModifier: 0 },
            { id: '1B', label: '1B', col: 3, type: 'vip', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 2,
          seats: [
            { id: '2A', label: '2A', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: '2B', label: '2B', col: 2, type: 'center', status: 'available', features: ['ac_shield'], priceModifier: 0 },
            { id: '2C', label: '2C', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 3,
          seats: [
            { id: '3A', label: '3A', col: 1, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 },
            { id: '3B', label: '3B', col: 2, type: 'center', status: 'occupied', features: ['ac_shield'] },
            { id: '3C', label: '3C', col: 3, type: 'window', status: 'available', features: ['window', 'usb'], priceModifier: 0 }
          ]
        },
        {
          rowNumber: 4,
          seats: [
            { id: '4A', label: '4A', col: 1, type: 'window', status: 'available', features: ['window'], priceModifier: 0 },
            { id: '4B', label: '4B', col: 3, type: 'window', status: 'locked', note: 'Багажный отсек', features: [] }
          ]
        }
      ]
    }
  ]
};

export const VehicleSeatMap = ({
  vehicle,
  slot,
  currency = 'RUB',
  selectedSeats = [],
  onSelectSeats,
  onProceed,
  onBack
}) => {
  // Transport layout is strictly determined by the Administrator (assigned vehicle / template)
  const activeLayout = useMemo(() => {
    // 1. If vehicle provides explicit custom decks/layout from Firestore
    if (vehicle?.decks && Array.isArray(vehicle.decks) && vehicle.decks.length > 0) {
      return {
        id: vehicle.id || 'custom_vehicle',
        name: vehicle.name || 'Транспорт',
        type: vehicle.layoutType || (vehicle.decks.length > 1 ? 'sleeper' : 'seat'),
        decks: vehicle.decks
      };
    }

    // 2. Otherwise determine layout preset from assigned vehicle name / role / metadata
    const str = `${vehicle?.name || ''} ${vehicle?.role || ''} ${vehicle?.id || ''}`.toLowerCase();
    const isSleeper = str.includes('слипер') || str.includes('sleeper') || str.includes('ночной') || str.includes('этаж');

    return isSleeper ? SLEEPER_BUS_PRESET : MINIVAN_VIP_PRESET;
  }, [vehicle]);

  // Current active Deck/Zone tab (e.g. 'lower' or 'upper')
  const [activeDeckId, setActiveDeckId] = useState(() => activeLayout.decks[0]?.id || 'lower');

  // Sync activeDeckId when vehicle changes
  React.useEffect(() => {
    if (activeLayout.decks[0]?.id) {
      setActiveDeckId(activeLayout.decks[0].id);
    }
  }, [activeLayout]);

  // Ensure activeDeckId matches current layout
  const currentDeck = useMemo(() => {
    const found = activeLayout.decks.find(d => d.id === activeDeckId);
    return found || activeLayout.decks[0];
  }, [activeLayout, activeDeckId]);

  // Calculate dynamic price per seat
  const getSeatFinalPrice = (seat) => {
    const slotBase = slot?.finalPrice || slot?.basePrice || 2500;
    const deckMod = currentDeck?.priceModifier || 0;
    const seatMod = seat?.priceModifier || 0;
    return Math.max(0, slotBase + deckMod + seatMod);
  };

  const formatPrice = (amount) => {
    const num = Math.round(Number(amount) || 0);
    if (currency === 'VND') return `${num.toLocaleString('vi-VN')} ₫`;
    if (currency === 'AED') return `${num.toLocaleString()} AED`;
    if (currency === 'USD') return `$${num}`;
    if (currency === 'THB' || currency === '฿') return `${num.toLocaleString()} ฿`;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  // Toggle seat selection
  const handleToggleSeat = (seat) => {
    if (seat.status === 'occupied' || seat.status === 'locked') return;

    const isAlreadySelected = selectedSeats.some(s => s.id === seat.id);
    let updated;
    if (isAlreadySelected) {
      updated = selectedSeats.filter(s => s.id !== seat.id);
    } else {
      // Add seat with deck metadata
      const seatWithMeta = {
        ...seat,
        deckId: currentDeck.id,
        deckName: currentDeck.name,
        price: getSeatFinalPrice(seat)
      };
      updated = [...selectedSeats, seatWithMeta];
    }
    if (onSelectSeats) onSelectSeats(updated);
  };

  // Quick auto-pick: assign best available seat
  const handleAutoPick = () => {
    // Find first available seat across decks
    for (const deck of activeLayout.decks) {
      for (const row of deck.rows) {
        for (const seat of row.seats) {
          if (seat.status === 'available') {
            const seatWithMeta = {
              ...seat,
              deckId: deck.id,
              deckName: deck.name,
              price: getSeatFinalPrice(seat)
            };
            if (onSelectSeats) onSelectSeats([seatWithMeta]);
            setActiveDeckId(deck.id);
            return;
          }
        }
      }
    }
  };

  const totalPrice = useMemo(() => {
    if (selectedSeats.length === 0) return slot?.finalPrice || slot?.basePrice || 2500;
    return selectedSeats.reduce((sum, s) => sum + (s.price || getSeatFinalPrice(s)), 0);
  }, [selectedSeats, slot]);

  return (
    <div className="space-y-4">
      {/* Top Bar: Back & Vehicle Summary */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-all font-medium"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span>К выбору времени</span>
        </button>

        <div className="text-[11px] text-[#00FF41] font-semibold flex items-center gap-1">
          <span>Рейс {slot?.time} • Выбор места</span>
        </div>
      </div>

      {/* Assigned Vehicle Info Banner (Determined strictly by Administrator) */}
      <div className="p-3 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
            {activeLayout.type === 'sleeper' ? '🛏' : '🚌'}
          </div>
          <div>
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
              Транспорт рейса
            </div>
            <div className="text-xs font-bold text-white leading-tight mt-0.5">
              {vehicle?.name || activeLayout.name}
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-xl bg-[#00FF41]/10 text-[#00FF41] text-[10px] font-bold border border-[#00FF41]/30 shrink-0 whitespace-nowrap">
          {activeLayout.decks.length > 1 ? '2 этажа • 36 полок' : 'VIP Салон • 10 мест'}
        </span>
      </div>

      {/* Multi-Deck / Zone Tabs (Custom Naming Supported!) */}
      {activeLayout.decks.length > 1 && (
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          {activeLayout.decks.map((deck) => {
            const isSelected = activeDeckId === deck.id;
            return (
              <button
                key={deck.id}
                type="button"
                onClick={() => setActiveDeckId(deck.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-[#00FF41] text-black shadow-lg shadow-[#00FF41]/20'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faBed} className="text-xs" />
                  <span>{deck.name}</span>
                </div>
                {deck.badge && (
                  <span className={`text-[9px] font-normal ${isSelected ? 'text-black/80' : 'text-white/40'}`}>
                    {deck.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Visual Bus Container */}
      <div className="relative bg-[#141416] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden">
        {/* Windshield / Driver Zone */}
        <div className="relative mb-5 pb-3 border-b border-dashed border-white/10">
          <div className="w-full h-7 rounded-t-2xl bg-gradient-to-b from-white/10 to-transparent border-t border-x border-white/20 flex items-center justify-center">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-white/50 flex items-center gap-1.5">
              <span>🪟</span> Лобовое стекло • Водитель
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 text-[10px] text-white/60 mb-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-lg border border-[#00FF41] bg-[#00FF41]/20" />
            <span>Свободно</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-lg bg-[#00FF41] text-black flex items-center justify-center text-[9px] font-bold">
              ✓
            </div>
            <span>Выбрано</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center text-[8px]">
              ✕
            </div>
            <span>Занято</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-lg bg-white/10 text-white/40 flex items-center justify-center text-[8px]">
              <FontAwesomeIcon icon={faLock} />
            </div>
            <span>Служебное</span>
          </div>
        </div>

        {/* Dynamic Rows Rendering */}
        <div className="space-y-3">
          {currentDeck.rows.map((row) => {
            const isSleeper = activeLayout.type === 'sleeper';
            // 3-column sleeper bus has 2 walking aisles: Col 1 | Aisle | Col 2 | Aisle | Col 3
            return (
              <div key={row.rowNumber} className="flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Column 1 (Left Window) */}
                <SeatSlot
                  seat={row.seats.find(s => s.col === 1)}
                  isSleeper={isSleeper}
                  isSelected={selectedSeats.some(s => s.id === row.seats.find(s => s.col === 1)?.id)}
                  currency={currency}
                  price={getSeatFinalPrice(row.seats.find(s => s.col === 1))}
                  onToggle={handleToggleSeat}
                />

                {/* Walking Aisle 1 */}
                <div className="w-4 sm:w-6 text-center text-[9px] text-white/20 select-none">
                  {row.rowNumber === 1 ? '🚶' : '·'}
                </div>

                {/* Column 2 (Center berth or aisle in minivan) */}
                <SeatSlot
                  seat={row.seats.find(s => s.col === 2)}
                  isSleeper={isSleeper}
                  isSelected={selectedSeats.some(s => s.id === row.seats.find(s => s.col === 2)?.id)}
                  currency={currency}
                  price={getSeatFinalPrice(row.seats.find(s => s.col === 2))}
                  onToggle={handleToggleSeat}
                />

                {/* Walking Aisle 2 (Only in 3-column layouts) */}
                {isSleeper && (
                  <div className="w-4 sm:w-6 text-center text-[9px] text-white/20 select-none">
                    {row.rowNumber === 1 ? '🚶' : '·'}
                  </div>
                )}

                {/* Column 3 (Right Window) */}
                <SeatSlot
                  seat={row.seats.find(s => s.col === 3)}
                  isSleeper={isSleeper}
                  isSelected={selectedSeats.some(s => s.id === row.seats.find(s => s.col === 3)?.id)}
                  currency={currency}
                  price={getSeatFinalPrice(row.seats.find(s => s.col === 3))}
                  onToggle={handleToggleSeat}
                />
              </div>
            );
          })}
        </div>

        {/* Back of Vehicle Notice */}
        <div className="mt-5 pt-3 border-t border-dashed border-white/10 text-center text-[10px] text-white/30 uppercase tracking-wider">
          Задняя часть салона • Выход
        </div>
      </div>

      {/* Selected Seat Feature Chips & Quick Auto-Pick */}
      <div className="flex items-center justify-between gap-2 px-1">
        {selectedSeats.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/80">
            <span className="text-white/40">Выбрано:</span>
            {selectedSeats.map(s => (
              <span key={s.id} className="px-2 py-0.5 rounded-lg bg-[#00FF41]/20 border border-[#00FF41]/40 text-[#00FF41] font-bold">
                {s.label} ({s.deckName || 'Место'})
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-white/50">
            Нажмите на свободное кресло или полку
          </span>
        )}

        <button
          type="button"
          onClick={handleAutoPick}
          className="text-[11px] text-[#00FF41] hover:underline font-semibold shrink-0"
        >
          ⚡ Выбрать автоматически
        </button>
      </div>

      {/* Floating Bottom Booking Action Bar */}
      <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-[#00FF41]/40 flex items-center justify-between shadow-xl">
        <div>
          <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
            {selectedSeats.length > 0 ? `Мест выбрано: ${selectedSeats.length}` : 'Без выбора места'}
          </div>
          <div className="text-base font-extrabold text-[#00FF41] mt-0.5">
            {formatPrice(totalPrice)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onProceed(selectedSeats)}
          className="py-2.5 px-5 rounded-xl bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-extrabold text-xs shadow-lg shadow-[#00FF41]/25 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>Забронировать</span>
          <FontAwesomeIcon icon={faCheck} className="text-xs" />
        </button>
      </div>
    </div>
  );
};

/**
 * Individual Seat / Berth Cell Component
 */
const SeatSlot = ({ seat, isSleeper, isSelected, currency, price, onToggle }) => {
  if (!seat) {
    // Empty spacer in layout
    return <div className="flex-1 min-h-[48px]" />;
  }

  const isOccupied = seat.status === 'occupied';
  const isLocked = seat.status === 'locked';
  const isAvailable = seat.status === 'available';

  return (
    <motion.button
      type="button"
      whileTap={isAvailable ? { scale: 0.94 } : undefined}
      disabled={!isAvailable}
      onClick={() => onToggle(seat)}
      className={`relative flex-1 py-2 px-1 rounded-2xl border transition-all flex flex-col items-center justify-center text-center ${
        isSelected
          ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.4)] z-10 scale-[1.03]'
          : isOccupied
          ? 'bg-red-500/10 border-red-500/20 text-red-400/60 cursor-not-allowed opacity-60'
          : isLocked
          ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
          : 'bg-[#1C1C1E] hover:bg-white/10 border-white/10 text-white hover:border-[#00FF41]/50'
      } ${isSleeper ? 'min-h-[56px]' : 'min-h-[48px]'}`}
    >
      {/* Icon: Bed for Sleeper vs Chair for Minivan */}
      <div className="flex items-center gap-1">
        <FontAwesomeIcon
          icon={isSleeper ? faBed : faChair}
          className={`text-xs ${
            isSelected
              ? 'text-black'
              : isOccupied
              ? 'text-red-400/50'
              : isLocked
              ? 'text-white/20'
              : 'text-[#00FF41]'
          }`}
        />
        <span className="font-extrabold text-xs">
          {seat.label}
        </span>
      </div>

      {/* Status or Price */}
      <div className="text-[9px] mt-0.5 font-medium leading-none">
        {isSelected ? (
          <span className="font-bold">Выбрано</span>
        ) : isOccupied ? (
          <span>Занято</span>
        ) : isLocked ? (
          <span className="flex items-center gap-0.5 text-[8px]">
            <FontAwesomeIcon icon={faLock} /> {seat.note || 'Резерв'}
          </span>
        ) : (
          <span className="text-white/60">
            {currency === '฿' || currency === 'THB' ? `${price}฿` : `${price}`}
          </span>
        )}
      </div>

      {/* Feature Micro-Badges (Window, USB, Shield) */}
      {!isOccupied && !isLocked && !isSelected && (
        <div className="flex items-center gap-1 mt-1 text-[8px] text-white/40">
          {seat.features?.includes('window') && <span title="У окна">🪟</span>}
          {seat.features?.includes('usb') && <FontAwesomeIcon icon={faBolt} className="text-[#00FF41]/70" title="USB зарядка" />}
          {seat.features?.includes('ac_shield') && <FontAwesomeIcon icon={faSnowflake} className="text-cyan-400/60" title="Вдали от прямого обдува" />}
        </div>
      )}
    </motion.button>
  );
};

export default VehicleSeatMap;
