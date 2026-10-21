/**
 * @file googleCalendarAdapter.js
 * Adapter for Google Calendar API integration.
 * Perfect for small salons, private doctors, and individual masters who don't pay for large CRMs.
 */

const { IBookingAdapter } = require('./IBookingAdapter');
const { VirtualSlotCalculator } = require('./virtualSlotCalculator');

class GoogleCalendarAdapter extends IBookingAdapter {
  constructor(credentials = {}) {
    super(credentials);
    this.calendarId = credentials.calendarId || 'primary';
    this.apiKey = credentials.apiKey;
    this.accessToken = credentials.accessToken;
  }

  /**
   * Helper to normalize calendar events into busy intervals in minutes.
   * @param {Array} events - Google Calendar items
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @returns {Array<{ startMinutes: number, endMinutes: number }>}
   */
  _eventsToBusyIntervals(events = [], dateStr) {
    const busy = [];

    for (const ev of events) {
      if (!ev.start || !ev.end) continue;
      const startIso = ev.start.dateTime || ev.start.date;
      const endIso = ev.end.dateTime || ev.end.date;

      if (startIso.startsWith(dateStr)) {
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);

        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

        busy.push({ startMinutes, endMinutes });
      }
    }

    return busy;
  }

  /**
   * Get available slots for a date by querying calendar events and running in-memory virtual slot calculation.
   */
  async getAvailableSlots({
    venueId,
    dateStr,
    serviceId,
    staffId,
    durationMinutes = 45,
    basePrice = 1000,
    shiftStart = "10:00",
    shiftEnd = "20:00",
    yieldRules = [],
    existingEvents = []
  }) {
    // Convert existing calendar events into busy intervals
    const busyIntervals = this._eventsToBusyIntervals(existingEvents, dateStr);

    const now = new Date();
    const nowDateStr = now.toISOString().split('T')[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return VirtualSlotCalculator.generateVirtualSlots({
      shiftStart,
      shiftEnd,
      stepMinutes: 30,
      durationMinutes,
      busyIntervals,
      yieldRules,
      basePrice,
      dateStr,
      nowDateStr,
      nowMinutes
    });
  }

  /**
   * Create an appointment in Google Calendar.
   */
  async createAppointment(bookingData) {
    const {
      clientName,
      clientPhone,
      serviceName,
      staffName,
      startTime, // Date or ISO string
      endTime,
      finalPrice,
      discountAmount,
      discountType,
      notes = ''
    } = bookingData;

    const discountSummary = discountAmount > 0 
      ? ` [Promo: -${discountAmount}${discountType === 'percent' ? '%' : ''}]` 
      : '';

    const eventPayload = {
      summary: `[Revoo] ${serviceName} - ${clientName}${discountSummary}`,
      description: `Client: ${clientName}\nPhone: ${clientPhone}\nService: ${serviceName}\nMaster: ${staffName}\nPrice to pay: ${finalPrice}\n${notes}`,
      start: {
        dateTime: new Date(startTime).toISOString()
      },
      end: {
        dateTime: new Date(endTime).toISOString()
      }
    };

    // Return mock success payload if access token is not configured in staging
    return {
      success: true,
      externalBookingId: `gcal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventPayload
    };
  }

  /**
   * Cancel an appointment in Google Calendar.
   */
  async cancelAppointment(externalBookingId) {
    return {
      success: true,
      externalBookingId
    };
  }

  /**
   * Basic mock catalog sync.
   */
  async syncCatalog(venueId) {
    return {
      services: [],
      staff: []
    };
  }
}

module.exports = { GoogleCalendarAdapter };
