export class RewardCalculator {
    /**
     * Helper to get a date string in a specific timezone
     */
    static getVenueDateString(date, timezone = 'Asia/Dubai') {
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(date);
        } catch (e) {
            console.error("Invalid timezone, falling back to UTC:", e);
            return new Date(date).toISOString().split('T')[0];
        }
    }

    /**
     * Calculates the reward based strictly on Calendar Days difference.
     * @param {string|null} lastVisitDateStr - The "YYYY-MM-DD" of the last active visit.
     * @param {Date} currentTime - Now.
     * @param {Object} config - Venue config (contains percBase, percVip, vipWindowDays, etc.)
     * @param {string} venueTimezone - e.g. "Asia/Dubai"
     * @param {boolean} isDayActive - true if the user already activated a visit TODAY.
     */
    static calculate(lastVisitDateStr, currentTime, config, venueTimezone = 'Asia/Dubai', isDayActive = false) {
        const safeConfig = {
            percBase: config?.percBase || 5,
            percVip: config?.percVip || 20,
            percDecay1: config?.percDecay1 || 15,
            percDecay2: config?.percDecay2 || 10,
            vipWindowDays: config?.vipWindowDays || 1, // default 1 day (daily visit)
            tier1DecayDays: config?.tier1DecayDays || 2, // default 2 days
            tier2DecayDays: config?.tier2DecayDays || 6, // default 6 days
        };

        const todayStr = this.getVenueDateString(currentTime, venueTimezone);

        // If no previous visit, user is new -> Base
        if (!lastVisitDateStr) {
            return {
                discount: safeConfig.percBase,
                status: 'new',
                phase: 'initial',
                isDayActive,
                currentDiscount: safeConfig.percBase,
                nextDiscount: safeConfig.percVip,
                diffDays: 'N/A'
            };
        }

        // Calculate days difference
        // Parse 'YYYY-MM-DD' as UTC to find difference in full 24h intervals safely
        const msPerDay = 1000 * 60 * 60 * 24;
        const todayUtc = Date.parse(todayStr + "T00:00:00Z");
        const lastVisitUtc = Date.parse(lastVisitDateStr + "T00:00:00Z");
        
        let diffDays = Math.round((todayUtc - lastVisitUtc) / msPerDay);
        
        if (diffDays < 0) diffDays = 0; // Sanity check if timezones act weird

        let todayDiscount = safeConfig.percBase;
        let status = 'reset';

        if (diffDays <= safeConfig.vipWindowDays) {
            todayDiscount = safeConfig.percVip;
            status = 'vip';
        } else if (diffDays <= safeConfig.tier1DecayDays) {
            todayDiscount = safeConfig.percDecay1;
            status = 'decay1';
        } else if (diffDays <= safeConfig.tier2DecayDays) {
            todayDiscount = safeConfig.percDecay2;
            status = 'decay2';
        } else {
            todayDiscount = safeConfig.percBase;
            status = 'reset';
        }

        return {
            discount: todayDiscount,
            status: status,
            phase: diffDays <= safeConfig.vipWindowDays ? 'maintenance' : 'decay',
            isDayActive,
            currentDiscount: todayDiscount,
            nextDiscount: safeConfig.percVip,
            diffDays
        };
    }
}
