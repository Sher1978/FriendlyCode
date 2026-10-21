/**
 * @file IBookingAdapter.js
 * Base interface/contract for all CRM booking integrations.
 * Every CRM integration (Google Calendar, Altegio, Fresha, Square, etc.)
 * must extend or implement this adapter contract.
 */

class IBookingAdapter {
  constructor(credentials = {}) {
    this.credentials = credentials;
  }

  /**
   * Fetch real-time available time slots for a given date, service, and optional staff member.
   * @param {Object} params
   * @param {string} params.venueId
   * @param {string} params.dateStr - 'YYYY-MM-DD'
   * @param {string} params.serviceId
   * @param {string} [params.staffId]
   * @param {number} [params.durationMinutes]
   * @returns {Promise<Array<{ time: string, staffId: string, isAvailable: boolean }>>}
   */
  async getAvailableSlots(params) {
    throw new Error('IBookingAdapter: getAvailableSlots() must be implemented.');
  }

  /**
   * Create an appointment in the external CRM.
   * @param {Object} bookingData - Canonical booking payload
   * @returns {Promise<{ success: boolean, externalBookingId: string, error?: string }>}
   */
  async createAppointment(bookingData) {
    throw new Error('IBookingAdapter: createAppointment() must be implemented.');
  }

  /**
   * Cancel an appointment in the external CRM.
   * @param {string} externalBookingId
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async cancelAppointment(externalBookingId) {
    throw new Error('IBookingAdapter: cancelAppointment() must be implemented.');
  }

  /**
   * Sync services and staff catalog from the external CRM.
   * @param {string} venueId
   * @returns {Promise<{ services: Array, staff: Array }>}
   */
  async syncCatalog(venueId) {
    throw new Error('IBookingAdapter: syncCatalog() must be implemented.');
  }
}

module.exports = { IBookingAdapter };
