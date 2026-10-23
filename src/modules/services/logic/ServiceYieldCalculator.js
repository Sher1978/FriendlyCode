/**
 * @file ServiceYieldCalculator.js
 * Client-Side In-Memory Yield Management & Virtual Slot Calculator.
 * 
 * Computes dynamic pricing and available slots in < 2ms without heavy database queries.
 */

export class ServiceYieldCalculator {
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
   * Calculate slot discount and final price based on venue yield rules and orthogonal recurrence loyalty.
   * @param {Object} params
   * @param {number} params.slotHour - hour of day (0-23)
   * @param {string} params.dayOfWeek - 'mon', 'tue', etc.
   * @param {number} params.basePrice - base price of service
   * @param {Array} [params.yieldRules=[]] - list of active yield rules
   * @param {number} [params.leadTimeHours=24] - hours left until this slot
   * @param {Object} [params.recurrenceReward=null] - { discount: number, status: 'vip' | 'medium' | 'base', name?: string }
   * @param {string} [params.combinationMode='max'] - 'max' (best discount wins) or 'stack' (sum discounts up to cap)
   * @param {number} [params.globalMaxDiscountCap=null] - absolute cap for stacked discounts
   * @returns {{ discountAmount: number, discountType: string, finalPrice: number, appliedRuleName: string | null, recurrenceBonus: number }}
   */
  static calculatePricing({ 
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

    const base = Number(basePrice) || 0;

    for (const rule of yieldRules) {
      if (!rule || rule.isActive === false) continue;

      // Check min service price threshold
      if (rule.minServicePrice && base < Number(rule.minServicePrice)) {
        continue;
      }

      let matches = false;

      // 1. Flash Slot (< X hours lead time, fully configurable per rule)
      if (rule.isFlashSlot) {
        const leadLimit = rule.flashLeadHours ?? rule.leadTimeHoursMax ?? 3;
        if (leadTimeHours <= leadLimit) {
          matches = true;
        }
      } 
      // 2. Regular Day & Hour Window
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
          matches = true;
        }
      }

      if (matches) {
        let currentDiscount = 0;
        const discountType = rule.discountType === 'fixed' ? 'fixed' : 'percent';

        if (discountType === 'fixed') {
          currentDiscount = Number(rule.discountValue || 0);
        } else {
          currentDiscount = Math.round((base * Number(rule.discountValue || 0)) / 100);
        }

        // Apply discount ceiling if configured on rule
        if (rule.maxDiscountCap && currentDiscount > Number(rule.maxDiscountCap)) {
          currentDiscount = Number(rule.maxDiscountCap);
        }

        if (currentDiscount > bestDiscountAmount) {
          bestDiscountAmount = currentDiscount;
          bestDiscountType = discountType;
          appliedRuleName = rule.name || null;
        }
      }
    }

    // --- ORTHOGONAL RECURRENCE LAYER (Time-Decay Retention Loyalty Add-on) ---
    let recurrenceBonus = 0;
    let effectiveRuleName = appliedRuleName;

    if (recurrenceReward && Number(recurrenceReward.discount) > 0) {
      const recPercent = Number(recurrenceReward.discount);
      const recDiscountAmount = Math.round((base * recPercent) / 100);

      if (combinationMode === 'stack') {
        // Stack mode: sum yield + loyalty up to cap
        recurrenceBonus = recDiscountAmount;
        bestDiscountAmount += recDiscountAmount;
        effectiveRuleName = appliedRuleName 
          ? `${appliedRuleName} + Лояльность (${recPercent}%)`
          : `Скидка лояльности (${recPercent}%)`;
      } else {
        // Max mode (default): give client whichever is higher
        if (recDiscountAmount > bestDiscountAmount) {
          bestDiscountAmount = recDiscountAmount;
          bestDiscountType = 'percent';
          recurrenceBonus = recDiscountAmount;
          effectiveRuleName = `Скидка лояльности (${recPercent}%)`;
        }
      }
    }

    // Global Safety Cap check
    if (globalMaxDiscountCap && bestDiscountAmount > Number(globalMaxDiscountCap)) {
      bestDiscountAmount = Number(globalMaxDiscountCap);
    }

    const finalPrice = Math.max(0, base - bestDiscountAmount);

    return {
      discountAmount: bestDiscountAmount,
      discountType: bestDiscountType,
      finalPrice,
      appliedRuleName: effectiveRuleName,
      recurrenceBonus
    };
  }

  /**
   * Generates virtual slots on-the-fly for client booking.
   * @param {Object} options
   */
  static generateSlots({
    shiftStart = "10:00",
    shiftEnd = "20:00",
    stepMinutes = 30,
    durationMinutes = 45,
    busyIntervals = [],
    yieldRules = [],
    basePrice = 1000,
    dateStr,
    nowDateStr = '',
    nowMinutes = 0,
    recurrenceReward = null,
    combinationMode = 'max',
    globalMaxDiscountCap = null
  }) {
    const startM = this.timeToMinutes(shiftStart);
    const endM = this.timeToMinutes(shiftEnd);
    const slots = [];

    const dateObj = new Date(`${dateStr}T12:00:00Z`);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[dateObj.getUTCDay()] || 'mon';

    const isToday = nowDateStr && nowDateStr === dateStr;

    for (let currentStart = startM; currentStart + durationMinutes <= endM; currentStart += stepMinutes) {
      const currentEnd = currentStart + durationMinutes;

      // Filter past times if booking for today
      if (isToday && currentStart <= nowMinutes) {
        continue;
      }

      // Check collision with booked intervals
      const isCollision = busyIntervals.some(busy => {
        return currentStart < busy.endMinutes && currentEnd > busy.startMinutes;
      });

      if (!isCollision) {
        const slotTimeStr = this.minutesToTime(currentStart);
        const slotHour = Math.floor(currentStart / 60);

        let leadTimeHours = 24;
        if (isToday) {
          leadTimeHours = Math.max(0, (currentStart - nowMinutes) / 60);
        }

        const pricing = this.calculatePricing({
          slotHour,
          dayOfWeek,
          basePrice,
          yieldRules,
          leadTimeHours,
          recurrenceReward,
          combinationMode,
          globalMaxDiscountCap
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
