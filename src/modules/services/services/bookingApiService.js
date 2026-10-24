/**
 * @file bookingApiService.js
 * API client for Revoo Services module.
 * Communicates with Firestore for service catalog, staff, yield rules, and bookings.
 */

import { db } from '../../../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export const bookingApiService = {
  /**
   * Fetch services for a venue. Fallbacks to gmConfig.services if subcollection is empty.
   */
  async getServices(venueId, fallbackServices = []) {
    try {
      if (!venueId) return fallbackServices;
      const ref = collection(db, 'venues', venueId, 'services');
      const snap = await getDocs(ref);
      
      if (!snap.empty) {
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.isActive !== false);
      }

      // Fallback to embedded gmConfig.services
      if (Array.isArray(fallbackServices) && fallbackServices.length > 0) {
        return fallbackServices.map((s, idx) => ({
          id: s.id || `srv_${idx}`,
          name: s.name || s.title || 'Услуга',
          category: s.category || 'Общие',
          description: s.description || '',
          price: Number(s.price) || 0,
          durationMinutes: Number(s.duration || s.durationMinutes) || 45,
          staffIds: s.staffIds || [],
          isActive: s.isActive !== false
        }));
      }

      // Smart niche fallback for test venues if subcollection is empty
      if (venueId.includes('borderrun') || venueId.includes('pattaya')) {
        return [
          {
            id: 'srv_cambodia_basic',
            name: 'Бордер-ран в Камбоджу (Базовый пакет)',
            title: 'Бордер-ран в Камбоджу (Базовый пакет)',
            description: 'Ежедневный выезд в 06:00. Трансфер на минивэне с кондиционером, пограничные сборы, обед, сопровождение и страховка.',
            price: 2900,
            durationMinutes: 600,
            category: 'Камбоджа',
            isActive: true
          },
          {
            id: 'srv_cambodia_vip',
            name: 'Бордер-ран в Камбоджу (VIP Всё включено)',
            title: 'Бордер-ран в Камбоджу (VIP Всё включено)',
            description: 'Пикап прямо из отеля/кондо, приоритетный вип-коридор без очередей на границе, горячий обед, напитки и новый штамп на 60 дней.',
            price: 3800,
            durationMinutes: 600,
            category: 'Камбоджа VIP',
            isActive: true
          },
          {
            id: 'srv_penang_2days',
            name: 'Виза-ран в Пенанг / Малайзия (2 дня / 1 ночь)',
            title: 'Виза-ран в Пенанг / Малайзия (2 дня / 1 ночь)',
            description: 'Поездка за туристической или студенческой визой. Отель 4*, трансфер, сопровождение в консульстве Таиланда и питание.',
            price: 7500,
            durationMinutes: 1440,
            category: 'Малайзия / Пенанг',
            isActive: true
          }
        ];
      }

      return [];
    } catch (err) {
      console.warn('bookingApiService: getServices failed, using fallback:', err);
      return fallbackServices;
    }
  },

  /**
   * Fetch staff members for a venue.
   */
  async getStaff(venueId) {
    try {
      if (!venueId) return [];
      const ref = collection(db, 'venues', venueId, 'staff');
      const snap = await getDocs(ref);
      
      if (!snap.empty) {
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.isActive !== false);
      }

      if (venueId.includes('borderrun') || venueId.includes('pattaya')) {
        return [
          {
            id: 'master_1',
            name: 'VIP Минивэн Toyota Commuter #1 (Рейс 06:00)',
            role: '10-местный VIP салон, кондиционер, USB и Wi-Fi',
            avatarUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=250&q=80',
            rating: 4.98,
            workStartTime: '06:00',
            workEndTime: '18:00',
            isActive: true
          },
          {
            id: 'master_2',
            name: 'VIP Спринтер #2 (Рейс 07:00)',
            role: 'Кожаные кресла, напитки, индивидуальное прохождение границы',
            avatarUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=250&q=80',
            rating: 4.95,
            workStartTime: '07:00',
            workEndTime: '19:00',
            isActive: true
          },
          {
            id: 'master_3',
            name: 'VIP Слипер-бас #3 (Рейс 21:00 / Ночной)',
            role: '36 спальных мест, 2 этажа (Нижний и Верхний ярус), розетки USB, шторки',
            avatarUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=250&q=80',
            rating: 4.99,
            workStartTime: '21:00',
            workEndTime: '23:30',
            isActive: true
          }
        ];
      }

      return [];
    } catch (err) {
      console.warn('bookingApiService: getStaff failed:', err);
      return [];
    }
  },

  /**
   * Fetch active dynamic yield rules for a venue.
   */
  async getYieldRules(venueId) {
    try {
      if (!venueId) return [];
      const ref = collection(db, 'venues', venueId, 'yield_rules');
      const snap = await getDocs(ref);
      
      if (!snap.empty) {
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.isActive !== false);
      }

      if (venueId.includes('borderrun') || venueId.includes('pattaya')) {
        return [
          {
            id: 'rule_weekday',
            name: 'Скидка на выезд среди недели (Вт-Ср)',
            daysOfWeek: ['tue', 'wed'],
            startHour: 6,
            endHour: 18,
            discountType: 'fixed',
            discountValue: 300,
            isActive: true
          },
          {
            id: 'rule_flash',
            name: 'Горящее место за 12 часов до выезда',
            isFlashSlot: true,
            flashLeadHours: 12,
            discountType: 'percent',
            discountValue: 15,
            isActive: true
          }
        ];
      }

      return [];
    } catch (err) {
      console.warn('bookingApiService: getYieldRules failed:', err);
      return [];
    }
  },

  /**
   * Fetch booked intervals for a specific staff member and date to compute virtual slots.
   */
  async getBusyIntervals(venueId, staffId, dateStr) {
    try {
      if (!venueId || !dateStr) return [];
      
      const startOfDay = new Date(`${dateStr}T00:00:00Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59Z`);

      const q = query(
        collection(db, 'bookings'),
        where('venueId', '==', venueId),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      const snap = await getDocs(q);
      const busy = [];

      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'cancelled') return;
        if (staffId && data.staffId && data.staffId !== staffId) return;

        if (data.startTime && data.endTime) {
          const s = data.startTime.toDate();
          const e = data.endTime.toDate();
          busy.push({
            startMinutes: s.getHours() * 60 + s.getMinutes(),
            endMinutes: e.getHours() * 60 + e.getMinutes()
          });
        }
      });

      return busy;
    } catch (err) {
      console.warn('bookingApiService: getBusyIntervals failed:', err);
      return [];
    }
  },

  /**
   * Fetch custom vehicle/fleet layout templates configured in Flutter Admin.
   */
  async getFleetTemplates(venueId) {
    try {
      if (!venueId) return [];
      const ref = collection(db, 'venues', venueId, 'fleetTemplates');
      const snap = await getDocs(ref);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('bookingApiService: getFleetTemplates failed:', err);
      return [];
    }
  },

  /**
   * Fetch scheduled trips from venues/{venueId}/scheduled_trips.
   */
  async getScheduledTrips(venueId) {
    try {
      if (!venueId) return [];
      const ref = collection(db, 'venues', venueId, 'scheduled_trips');
      const snap = await getDocs(ref);
      return snap.docs.map(d => {
        const data = d.data();
        let dateStr = data.dateStr || '';
        let timeStr = data.timeStr || '';
        let departureDate = null;

        if (data.departureTime && typeof data.departureTime.toDate === 'function') {
          departureDate = data.departureTime.toDate();
          const yyyy = departureDate.getFullYear();
          const mm = String(departureDate.getMonth() + 1).padStart(2, '0');
          const dd = String(departureDate.getDate()).padStart(2, '0');
          if (!dateStr) dateStr = `${yyyy}-${mm}-${dd}`;
          const hh = String(departureDate.getHours()).padStart(2, '0');
          const min = String(departureDate.getMinutes()).padStart(2, '0');
          if (!timeStr) timeStr = `${hh}:${min}`;
        } else if (typeof data.departureTime === 'string') {
          timeStr = data.departureTime;
        }

        const rawSeats = data.seats;
        const seatsList = Array.isArray(rawSeats)
          ? rawSeats
          : (rawSeats && typeof rawSeats === 'object' ? Object.values(rawSeats) : []);

        const seatsLeft = seatsList.length > 0
          ? seatsList.filter(s => !s.status || s.status === 'available').length
          : (typeof data.sellableCapacity === 'number'
              ? Math.max(0, data.sellableCapacity - (data.confirmedCount || 0) - (data.reservedCount || 0))
              : 10);

        return {
          id: d.id,
          ...data,
          dateStr,
          timeStr: timeStr || '07:00',
          departureDate,
          seatsList,
          seatsLeft
        };
      });
    } catch (err) {
      console.warn('bookingApiService: getScheduledTrips failed:', err);
      return [];
    }
  },

  /**
   * Reserve seats in a scheduled trip when a guest submits a booking.
   */
  async reserveSeatsInScheduledTrip(venueId, tripId, seatIds, passengerInfo = {}) {
    if (!venueId || !tripId || !Array.isArray(seatIds) || seatIds.length === 0) return;
    try {
      const tripRef = doc(db, 'venues', venueId, 'scheduled_trips', tripId);
      const snap = await getDoc(tripRef);
      if (!snap.exists()) return;

      const tripData = snap.data() || {};
      const rawSeats = tripData.seats;
      const seatSet = new Set(seatIds.map(String));

      if (Array.isArray(rawSeats)) {
        const nextSeats = rawSeats.map(s => {
          const sid = String(s.seatId || s.id || '');
          const slabel = String(s.label || '');
          if (seatSet.has(sid) || seatSet.has(slabel)) {
            return {
              ...s,
              status: 'reserved',
              passengerName: passengerInfo.clientName || '',
              passengerPhone: passengerInfo.clientPhone || '',
              bookingId: passengerInfo.bookingId || null,
              reservedAt: new Date().toISOString()
            };
          }
          return s;
        });
        await updateDoc(tripRef, { seats: nextSeats });
      } else if (rawSeats && typeof rawSeats === 'object') {
        const updatedSeatsMap = { ...rawSeats };
        const pricePerSeat = seatIds.length > 0
          ? Math.round((Number(passengerInfo.finalPrice) || 0) / seatIds.length)
          : (Number(passengerInfo.finalPrice) || 0);

        for (const [key, sObj] of Object.entries(updatedSeatsMap)) {
          const s = sObj || {};
          const sid = String(s.seatId || s.id || key);
          const slabel = String(s.label || key);
          if (seatSet.has(key) || seatSet.has(sid) || seatSet.has(slabel)) {
            updatedSeatsMap[key] = {
              ...s,
              status: 'reserved',
              passengerName: passengerInfo.clientName || '',
              passengerPhone: passengerInfo.clientPhone || '',
              finalPrice: pricePerSeat,
              notes: passengerInfo.notes || s.notes || '',
              updatedBy: 'guest_storefront',
              updatedAt: Timestamp.now()
            };
          }
        }

        let blocked = 0;
        let confirmed = 0;
        let reserved = 0;
        for (const s of Object.values(updatedSeatsMap)) {
          if (s?.status === 'blocked') blocked++;
          if (s?.status === 'confirmed') confirmed++;
          if (s?.status === 'reserved') reserved++;
        }
        const totalCap = Number(tripData.totalCapacity) || Object.keys(updatedSeatsMap).length || 13;
        const sellable = Math.max(1, totalCap - blocked);
        const occupancyRate = (confirmed + reserved) / sellable;

        await updateDoc(tripRef, {
          seats: updatedSeatsMap,
          blockedSeatsCount: blocked,
          sellableCapacity: sellable,
          confirmedCount: confirmed,
          reservedCount: reserved,
          occupancyRate
        });
      }
    } catch (err) {
      console.warn('bookingApiService: reserveSeatsInScheduledTrip warning:', err);
    }
  },

  /**
   * Create a new booking.
   */
  async createBooking(payload) {
    const bookingDoc = {
      venueId: payload.venueId,
      tripId: payload.tripId || null,
      clientName: payload.clientName.trim(),
      clientPhone: payload.clientPhone.trim(),
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      staffId: payload.staffId || 'any',
      staffName: payload.staffName || 'Любой свободный мастер',
      dateStr: payload.dateStr || '',
      timeStr: payload.timeStr || '',
      startTime: Timestamp.fromDate(new Date(payload.startTime)),
      endTime: Timestamp.fromDate(new Date(payload.endTime)),
      originalPrice: Number(payload.originalPrice) || 0,
      finalPrice: Number(payload.finalPrice) || 0,
      discountAmount: Number(payload.discountAmount) || 0,
      discountType: payload.discountType || 'percent',
      status: 'pending_confirmation',
      requiresHumanConfirmation: true,
      source: payload.source || 'google_maps',
      appliedRuleName: payload.appliedRuleName || null,
      seats: payload.seats || [],
      seatDescriptions: payload.seatDescriptions || [],
      seatCount: payload.seatCount || 1,
      notes: payload.notes || '',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingDoc);

    if (payload.tripId && Array.isArray(payload.seats) && payload.seats.length > 0) {
      await this.reserveSeatsInScheduledTrip(payload.venueId, payload.tripId, payload.seats, {
        clientName: bookingDoc.clientName,
        clientPhone: bookingDoc.clientPhone,
        finalPrice: bookingDoc.finalPrice,
        notes: bookingDoc.notes,
        bookingId: docRef.id
      });
    }

    return { id: docRef.id, ...bookingDoc };
  }
};
