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
   * Create a new booking.
   */
  async createBooking(payload) {
    const bookingDoc = {
      venueId: payload.venueId,
      clientName: payload.clientName.trim(),
      clientPhone: payload.clientPhone.trim(),
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      staffId: payload.staffId || 'any',
      staffName: payload.staffName || 'Любой свободный мастер',
      startTime: Timestamp.fromDate(new Date(payload.startTime)),
      endTime: Timestamp.fromDate(new Date(payload.endTime)),
      originalPrice: Number(payload.originalPrice) || 0,
      finalPrice: Number(payload.finalPrice) || 0,
      discountAmount: Number(payload.discountAmount) || 0,
      discountType: payload.discountType || 'percent',
      status: 'created',
      source: payload.source || 'google_maps',
      appliedRuleName: payload.appliedRuleName || null,
      notes: payload.notes || '',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bookings'), bookingDoc);
    return { id: docRef.id, ...bookingDoc };
  }
};
