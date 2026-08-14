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
     * Calculates the reward based strictly on Calendar Days difference or pinned Deposit status.
     * @param {string|null} lastVisitDateStr - The "YYYY-MM-DD" of the last active visit.
     * @param {Date} currentTime - Now.
     * @param {Object} config - Venue config (contains percBase, percVip, percDeposit, decayStages, etc.)
     * @param {string} venueTimezone - e.g. "Asia/Dubai"
     * @param {boolean} isDayActive - true if the user already activated a visit TODAY.
     * @param {boolean} hasLockedDiscount - true if user has a pinned/locked deposit discount.
     */
    static calculate(lastVisitDateStr, currentTime, config, venueTimezone = 'Asia/Dubai', isDayActive = false, hasLockedDiscount = false) {
        const decayStage0 = (config?.decayStages && config.decayStages.length > 0) ? config.decayStages[0] : null;

        const safeConfig = {
            percBase: Number(config?.percBase ?? 5),
            percVip: Number(config?.percVip ?? 20),
            percMedium: Number(decayStage0?.discount ?? config?.percDecay1 ?? 15),
            percDeposit: Number(config?.percDeposit ?? 25),
            vipWindowDays: Number(config?.vipWindowDays ?? 1), // default 1 day (tomorrow)
            mediumDays: Number(decayStage0?.days ?? config?.tier1DecayDays ?? 7), // default 7 days for medium discount
            depositThreshold: Number(config?.depositThreshold ?? 1000000),
        };

        // If user has a locked deposit discount, return highest deposit tier
        if (hasLockedDiscount) {
            return {
                discount: safeConfig.percDeposit,
                status: 'deposit',
                phase: 'maintenance',
                isDayActive,
                currentDiscount: safeConfig.percDeposit,
                nextDiscount: safeConfig.percDeposit,
                diffDays: 'N/A',
                isLocked: true
            };
        }

        const todayStr = this.getVenueDateString(currentTime, venueTimezone);

        // If no previous visit, user is new -> Minimal (Base)
        if (!lastVisitDateStr) {
            return {
                discount: safeConfig.percBase,
                status: 'new',
                phase: 'initial',
                isDayActive,
                currentDiscount: safeConfig.percBase,
                nextDiscount: safeConfig.percVip,
                diffDays: 'N/A',
                isLocked: false
            };
        }

        // Calculate days difference
        const msPerDay = 1000 * 60 * 60 * 24;
        const todayUtc = Date.parse(todayStr + "T00:00:00Z");
        const lastVisitUtc = Date.parse(lastVisitDateStr + "T00:00:00Z");
        
        let diffDays = Math.round((todayUtc - lastVisitUtc) / msPerDay);
        if (diffDays < 0) diffDays = 0;

        console.log(`[RewardCalculator] today: ${todayStr}, last: ${lastVisitDateStr}, diff: ${diffDays}. Thresholds: VIP <= ${safeConfig.vipWindowDays}, Medium <= ${safeConfig.mediumDays}`);

        let todayDiscount = safeConfig.percBase;
        let status = 'reset';

        if (diffDays <= safeConfig.vipWindowDays) {
            // Tier 3: Maximal discount (Visit-based)
            todayDiscount = safeConfig.percVip;
            status = 'vip';
        } else if (diffDays <= safeConfig.mediumDays) {
            // Tier 2: Medium discount (Visit-based)
            todayDiscount = safeConfig.percMedium;
            status = 'decay1';
        } else {
            // Tier 1: Minimal discount (Visit-based)
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
            diffDays,
            isLocked: false
        };
    }
}
