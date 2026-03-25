export class RewardCalculator {
    /**
     * Calculates the reward based on visit history.
     * @param {Date} lastVisit - The most recent visit BEFORE today.
     * @param {Date} currentTime - Now.
     * @param {Object} config - Venue config.
     * @param {Date} visitToday - (Optional) If the user already visited today.
     */
    static calculate(lastVisit, currentTime, config, visitToday = null) {
        const safeConfig = {
            percBase: config?.percBase || 5,
            percVip: config?.percVip || 20,
            percDecay1: config?.percDecay1 || 15,
            percDecay2: config?.percDecay2 || 10,
        };

        const today = new Date(currentTime);
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const secondsUntilNextTier = Math.max(0, Math.floor((tomorrow - currentTime) / 1000));

        // If no previous visit, user is new -> Base
        if (!lastVisit) {
            return {
                discount: safeConfig.percBase,
                status: 'new',
                phase: 'initial',
                isDayActive: !!visitToday,
                secondsUntilDecay: 0,
                secondsUntilNextTier,
                currentDiscount: safeConfig.percBase,
                nextDiscount: safeConfig.percVip
            };
        }

        const refVisitDate = new Date(lastVisit);
        refVisitDate.setHours(0, 0, 0, 0);

        // Difference in calendar days
        const diffDays = Math.round((today - refVisitDate) / (1000 * 60 * 60 * 24));

        // --- CORE LOGIC: DETERMINING TODAY'S DISCOUNT ---
        // Today's discount is based on the LAST visit BEFORE today.

        let todayDiscount = safeConfig.percBase;
        let status = 'reset';

        if (diffDays === 0) {
            // This case shouldn't happen if we pass "lastVisit BEFORE today" correctly,
            // but if it does, it means we already have a visit today.
            // We should use the visit BEFORE that one to determine the discount.
            // For now, let's assume the caller handles this.
            status = 'active';
        } else if (diffDays === 1) {
            // Yesterday was active! Max Discount.
            todayDiscount = safeConfig.percVip;
            status = 'vip';
        } else if (diffDays === 2) {
            // Day before yesterday -> 15%
            todayDiscount = safeConfig.percDecay1;
            status = 'decay1';
        } else if (diffDays >= 3 && diffDays <= 6) {
            // 3 to 6 days ago -> 10%
            todayDiscount = safeConfig.percDecay2;
            status = 'decay2';
        } else {
            // 7+ days ago -> 5%
            todayDiscount = safeConfig.percBase;
            status = 'reset';
        }

        // Calculation for decay timer
        // If at 20%, it decays at the end of tomorrow (Day 1).
        // Since today is Day 0 (visited yesterday), they have today AND tomorrow.
        // Penalty hits at Day 2 00:00.
        const expiryDate = new Date(refVisitDate);
        expiryDate.setDate(expiryDate.getDate() + 2); // Mon -> Wed 00:00
        const secondsUntilDecay = Math.max(0, Math.floor((expiryDate - currentTime) / 1000));

        return {
            discount: todayDiscount,
            status: status,
            phase: diffDays <= 1 ? 'maintenance' : 'decay',
            isDayActive: !!visitToday,
            secondsUntilDecay: secondsUntilDecay,
            secondsUntilNextTier: secondsUntilNextTier,
            currentDiscount: todayDiscount,
            nextDiscount: safeConfig.percVip,
            diffDays
        };
    }
}
