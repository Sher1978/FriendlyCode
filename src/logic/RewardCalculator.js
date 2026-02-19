export class RewardCalculator {
    /**
     * Calculates the reward based on the time difference between now
     * and the last visit using the Venue's LoyaltyConfig.
     */
    static calculate(lastVisit, currentTime, config) {
        // 1. Setup Defaults
        const safeConfig = {
            safetyCooldownHours: config?.safetyCooldownHours || 12,
            vipWindowHours: config?.vipWindowHours || 48,
            tier1DecayHours: config?.tier1DecayHours || 72,
            tier2DecayHours: config?.tier2DecayHours || 168,
            percBase: config?.percBase || 5,
            percVip: config?.percVip || 20,
            percDecay1: config?.percDecay1 || 15,
            percDecay2: config?.percDecay2 || 10,
            degradationIntervalHours: config?.degradationIntervalHours || 168
        };

        const diffMs = currentTime - lastVisit;
        const hoursPassed = diffMs / (1000 * 60 * 60);

        // Calculate seconds until NEXT day (midnight)
        const tomorrow = new Date(currentTime);
        tomorrow.setHours(24, 0, 0, 0);
        const secondsUntilNextTier = Math.max(0, Math.floor((tomorrow - currentTime) / 1000));

        // 2. ACTIVE DAY LOGIC (0 - 24 Hours)
        // Flutter/Business Logic: ANY visit within 24 hours is considered an "Active Day".
        // We removed the "Too Soon" cooldown restriction.
        const isDayActive = (hoursPassed < 24);

        if (isDayActive) {
            return {
                discount: safeConfig.percVip, // Keep Max? Or current? 
                // meaningful status distinguishing "just visited" vs "waiting" isn't fully needed if we just say "Active Day"
                status: 'active',
                phase: 'active',
                isDayActive: true,
                hoursPassed: hoursPassed,
                secondsUntilDecay: safeConfig.vipWindowHours * 3600, // Or calculation based on midnight?
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: false,
                currentDiscount: safeConfig.percVip,
                nextDiscount: safeConfig.percVip
            };
        }

        // 4. DECAY LOGIC (Multi-tier windows)
        // We calculate which window we are in
        if (hoursPassed <= safeConfig.vipWindowHours) {
            const left = (safeConfig.vipWindowHours - hoursPassed) * 3600;
            return {
                discount: safeConfig.percVip,
                status: 'vip',
                phase: 'maintenance',
                isDayActive: false,
                secondsUntilDecay: left,
                secondsUntilNextTier,
                isLocked: false,
                currentDiscount: safeConfig.percVip,
                nextDiscount: safeConfig.percVip
            };
        }
        if (hoursPassed <= safeConfig.tier1DecayHours) {
            const left = (safeConfig.tier1DecayHours - hoursPassed) * 3600;
            return {
                discount: safeConfig.percDecay1,
                status: 'decay1',
                phase: 'decay',
                isDayActive: false,
                secondsUntilDecay: left,
                secondsUntilNextTier,
                isLocked: false,
                currentDiscount: safeConfig.percDecay1,
                nextDiscount: safeConfig.percVip
            };
        }
        if (hoursPassed <= safeConfig.tier2DecayHours) {
            const left = (safeConfig.tier2DecayHours - hoursPassed) * 3600;
            return {
                discount: safeConfig.percDecay2,
                status: 'decay2',
                phase: 'decay',
                isDayActive: false,
                secondsUntilDecay: left,
                secondsUntilNextTier,
                isLocked: false,
                currentDiscount: safeConfig.percDecay2,
                nextDiscount: safeConfig.percVip
            };
        }

        // 5. BASE
        return {
            discount: safeConfig.percBase,
            status: 'reset',
            phase: 'decay',
            isDayActive: false,
            hoursPassed: hoursPassed,
            secondsUntilDecay: 0,
            secondsUntilNextTier: secondsUntilNextTier,
            isLocked: false,
            currentDiscount: safeConfig.percBase,
            nextDiscount: safeConfig.percVip
        };
    }
}
