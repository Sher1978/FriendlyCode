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
    static calculate(lastVisitDateStr, currentTime, config, venueTimezone = 'Asia/Dubai', isDayActive = false, hasLockedDiscount = false, baseDiscountFallback = 5) {
        // If user has a locked deposit discount, return highest deposit tier
        const lockedDiscountAmount = Array.isArray(config) 
            ? Math.max(...config.map(t => Number(t.percentage || t.percent || 0)).filter(p => p > 0), 25)
            : Number(config?.percDeposit ?? 25);
            
        if (hasLockedDiscount) {
            return {
                discount: lockedDiscountAmount,
                status: 'deposit',
                phase: 'maintenance',
                isDayActive,
                currentDiscount: lockedDiscountAmount,
                nextDiscount: lockedDiscountAmount,
                diffDays: 'N/A',
                isLocked: true
            };
        }

        const todayStr = this.getVenueDateString(currentTime, venueTimezone);

        let minDiscount = baseDiscountFallback;
        let maxDiscount = 20;

        if (Array.isArray(config)) {
            const validTiers = config
                .map(t => ({
                    discount: Number(t.percentage || t.percent || 0),
                    maxDays: Math.round(Number(t.maxHours || 0) / 24)
                }))
                .filter(t => t.discount > 0);
            
            if (validTiers.length > 0) {
                const arrMin = Math.min(...validTiers.map(t => t.discount));
                minDiscount = arrMin < minDiscount ? arrMin : minDiscount;
                maxDiscount = Math.max(...validTiers.map(t => t.discount));
            }
            
            // If no previous visit, user is new -> Minimal (Base)
            if (!lastVisitDateStr) {
                return {
                    discount: minDiscount,
                    status: 'new',
                    phase: 'initial',
                    isDayActive,
                    currentDiscount: minDiscount,
                    nextDiscount: maxDiscount,
                    diffDays: 'N/A',
                    isLocked: false
                };
            }

            const msPerDay = 1000 * 60 * 60 * 24;
            const todayUtc = Date.parse(todayStr + "T00:00:00Z");
            const lastVisitUtc = Date.parse(lastVisitDateStr + "T00:00:00Z");
            
            let diffDays = Math.round((todayUtc - lastVisitUtc) / msPerDay);
            if (diffDays < 0) diffDays = 0;

            let todayDiscount = minDiscount;
            let status = 'reset';
            
            const sortedTiers = [...validTiers].sort((a, b) => b.discount - a.discount);
            
            for (const tier of sortedTiers) {
                // Ignore the base tier for diffDays matching because it's the fallback
                if (tier.discount > minDiscount && tier.maxDays > 0 && diffDays <= tier.maxDays) {
                    todayDiscount = tier.discount;
                    status = tier.discount === maxDiscount ? 'vip' : 'decay1';
                    break;
                }
            }

            return {
                discount: todayDiscount,
                status: status,
                phase: diffDays > 0 && todayDiscount < maxDiscount ? 'decay' : 'maintenance',
                isDayActive,
                currentDiscount: todayDiscount,
                nextDiscount: maxDiscount,
                diffDays,
                isLocked: false
            };
        }

        const decayStage0 = (config?.decayStages && config.decayStages.length > 0) ? config.decayStages[0] : null;

        const percs = [
            Number(config?.percBase),
            Number(config?.percDecay2),
            Number(config?.percDecay1),
            Number(config?.percVip),
            Number(decayStage0?.discount)
        ].filter(p => !isNaN(p) && p > 0);
        
        let minAvailable = 5;
        let maxAvailable = 20;
        let midAvailable = 15;

        if (percs.length > 0) {
            const sorted = [...new Set(percs)].sort((a, b) => a - b);
            minAvailable = sorted[0];
            maxAvailable = sorted[sorted.length - 1];
            midAvailable = sorted.length > 2 ? sorted[Math.floor((sorted.length - 1) / 2)] : (sorted[1] || minAvailable);
        }

        const safeConfig = {
            percBase: Number(config?.percBase) || minAvailable,
            percVip: Number(config?.percVip) || maxAvailable,
            percMedium: Number(decayStage0?.discount ?? config?.percDecay1) || midAvailable,
            percDeposit: Number(config?.percDeposit ?? 25),
            vipWindowDays: Number(config?.vipWindowDays ?? 1), // default 1 day (tomorrow)
            mediumDays: Number(decayStage0?.days ?? config?.tier1DecayDays ?? 7), // default 7 days for medium discount
            depositThreshold: Number(config?.depositThreshold ?? 1000000),
        };

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
