/**
 * @file virtualSlotCalculator.js
 * In-Memory Virtual Slot & Yield Calculation Engine.
 * 
 * Generates available slots on-the-fly without saving empty slots to the database.
 * Time complexity: O(N) where N is number of potential intervals in a day (~20-40).
 * Execution time: ~1-2ms in memory.
 */

class VirtualSlotCalculator {
  /**
   * Parse "HH:mm" to total minutes from midnight.
   * @param {string} timeStr - e.g. "10:30"
   * @returns {number}
   */
  static timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Convert total minutes from midnight back to "HH:mm".
   * @param {number} minutes
   * @returns {string}
   */
  static minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Calculate discount for a slot based on venue yield rules and orthogonal recurrence loyalty.
   * @param {Object} params
   * @param {number} params.slotHour - e.g. 13
   * @param {string} params.dayOfWeek - 'mon', 'tue', etc.
   * @param {number} params.basePrice - e.g. 2500
   * @param {Array} [params.yieldRules=[]] - list of active yield rules
   * @param {number} [params.leadTimeHours=24] - hours remaining until this slot
   * @param {Object} [params.recurrenceReward=null] - { discount: number, status: 'vip' | 'medium' | 'base', name?: string }
   * @param {string} [params.combinationMode='max'] - 'max' or 'stack'
   * @param {number} [params.globalMaxDiscountCap=null]
   * @returns {{ discountAmount: number, discountType: string, finalPrice: number, appliedRuleName: string | null }}
   */
  static calculateSlotPricing({ 
    slotHour, 
    dayOfWeek, 
    basePrice, 
    yieldRules = [], 
    leadTimeHours = 24,
    recurrenceReward = null,
    combinationMode = 'max',
    globalMaxDiscountCap = null
  }) {
    let bestDiscountAmount = 0;
    let bestDiscountType = 'percent';
    let appliedRuleName = null;

    for (const rule of yieldRules) {
      if (!rule.isActive) continue;

      // Check min service price threshold
      if (rule.minServicePrice && basePrice < rule.minServicePrice) continue;

      let ruleMatches = false;

      // 1. Flash Slot Rule (< X hours lead time, dynamic configurable limit)
      if (rule.isFlashSlot) {
        const leadLimit = rule.flashLeadHours ?? rule.leadTimeHoursMax ?? 3;
        if (leadTimeHours <= leadLimit) {
          ruleMatches = true;
        }
      } 
      // 2. Regular Day & Hour Window Rule
      else {
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayIndex = dayNames.indexOf((dayOfWeek || '').toLowerCase());
        const days = Array.isArray(rule.daysOfWeek)
          ? rule.daysOfWeek.map(d => (d != null ? String(d).toLowerCase() : ''))
          : [];
        const isDayMatched = days.length === 0 ||
          days.includes((dayOfWeek || '').toLowerCase()) ||
          (dayIndex !== -1 && days.includes(String(dayIndex)));
        const isHourMatched = slotHour >= (rule.startHour ?? 0) && slotHour < (rule.endHour ?? 24);

        if (isDayMatched && isHourMatched) {
          ruleMatches = true;
        }
      }

      if (ruleMatches) {
        let currentDiscount = 0;
        const discountType = rule.discountType === 'fixed' ? 'fixed' : 'percent';

        if (discountType === 'fixed') {
          currentDiscount = Number(rule.discountValue || 0);
        } else {
          currentDiscount = Math.round((basePrice * Number(rule.discountValue || 0)) / 100);
        }

        // Apply maximum discount cap if configured
        if (rule.maxDiscountCap && currentDiscount > rule.maxDiscountCap) {
          currentDiscount = rule.maxDiscountCap;
        }

        // Pick the rule with the best discount for the client
        if (currentDiscount > bestDiscountAmount) {
          bestDiscountAmount = currentDiscount;
          bestDiscountType = discountType;
          appliedRuleName = rule.name || null;
        }
      }
    }

    // --- ORTHOGONAL RECURRENCE LAYER ---
    let effectiveRuleName = appliedRuleName;
    if (recurrenceReward && Number(recurrenceReward.discount) > 0) {
      const recPercent = Number(recurrenceReward.discount);
      const recDiscountAmount = Math.round((basePrice * recPercent) / 100);

      if (combinationMode === 'stack') {
        bestDiscountAmount += recDiscountAmount;
        effectiveRuleName = appliedRuleName 
          ? `${appliedRuleName} + Лояльность (${recPercent}%)`
          : `Скидка лояльности (${recPercent}%)`;
      } else {
        if (recDiscountAmount > bestDiscountAmount) {
          bestDiscountAmount = recDiscountAmount;
          bestDiscountType = 'percent';
          effectiveRuleName = `Скидка лояльности (${recPercent}%)`;
        }
      }
    }

    if (globalMaxDiscountCap && bestDiscountAmount > Number(globalMaxDiscountCap)) {
      bestDiscountAmount = Number(globalMaxDiscountCap);
    }

    const finalPrice = Math.max(0, basePrice - bestDiscountAmount);

    return {
      discountAmount: bestDiscountAmount,
      discountType: bestDiscountType,
      finalPrice,
      appliedRuleName: effectiveRuleName
    };
  }

  /**
   * Generate available virtual slots for a staff member on a specific date.
   * @param {Object} options
   * @param {string} options.shiftStart - e.g. "10:00"
   * @param {string} options.shiftEnd - e.g. "20:00"
   * @param {number} [options.stepMinutes=30] - grid step in minutes
   * @param {number} [options.durationMinutes=45] - duration of requested service
   * @param {Array<{ startMinutes: number, endMinutes: number }>} [options.busyIntervals=[]] - already booked intervals
   * @param {Array} [options.yieldRules=[]] - active dynamic yield rules
   * @param {number} [options.basePrice=1000] - standard service price
   * @param {string} options.dateStr - 'YYYY-MM-DD'
   * @param {string} [options.nowDateStr] - current date for lead-time calculation
   * @param {number} [options.nowMinutes] - current time in minutes for past-slot filtering
   * @returns {Array<Object>} List of available virtual slots with pricing
   */
  static generateVirtualSlots({
    shiftStart = "10:00",
    shiftEnd = "20:00",
    stepMinutes = 30,
    durationMinutes = 45,
    busyIntervals = [],
    yieldRules = [],
    basePrice = 1000,
    dateStr,
    nowDateStr = '',
    nowMinutes = 0
  }) {
    const startM = this.timeToMinutes(shiftStart);
    const endM = this.timeToMinutes(shiftEnd);
    const slots = [];

    // Derive day of week from dateStr (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const dateObj = new Date(`${dateStr}T12:00:00Z`);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[dateObj.getUTCDay()] || 'mon';

    const isToday = nowDateStr && nowDateStr === dateStr;

    for (let currentStart = startM; currentStart + durationMinutes <= endM; currentStart += stepMinutes) {
      const currentEnd = currentStart + durationMinutes;

      // Skip slots in the past if checking today
      if (isToday && currentStart <= nowMinutes) {
        continue;
      }

      // Check collision with busy intervals
      const isCollision = busyIntervals.some(busy => {
        // Overlap condition: startA < endB && endA > startB
        return currentStart < busy.endMinutes && currentEnd > busy.startMinutes;
      });

      if (!isCollision) {
        const slotTimeStr = this.minutesToTime(currentStart);
        const slotHour = Math.floor(currentStart / 60);

        // Approximate lead time in hours
        let leadTimeHours = 24;
        if (isToday) {
          leadTimeHours = Math.max(0, (currentStart - nowMinutes) / 60);
        }

        const pricing = this.calculateSlotPricing({
          slotHour,
          dayOfWeek,
          basePrice,
          yieldRules,
          leadTimeHours
        });

        slots.push({
          time: slotTimeStr,
          startMinutes: currentStart,
          endMinutes: currentEnd,
          durationMinutes,
          basePrice,
          finalPrice: pricing.finalPrice,
          discountAmount: pricing.discountAmount,
          discountType: pricing.discountType,
          hasDiscount: pricing.discountAmount > 0,
          appliedRuleName: pricing.appliedRuleName,
          isAvailable: true
        });
      }
    }

    return slots;
  }
}

module.exports = { VirtualSlotCalculator };
