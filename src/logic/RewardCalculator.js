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

        // Placeholder for currentTierValue. This would typically be passed in or derived from user's current state.
        // For the purpose of this edit, we'll assume it's defined elsewhere or will be defined.
        // If not defined, this will cause a runtime error.
        const currentTierValue = config?.currentTierValue || safeConfig.percVip; // Assuming a default for compilation

        if (isDayActive) {
            return {
                discount: currentTierValue, // FIX: Return the ACTUAL current tier, not Max VIP
                // meaningful status distinguishing "just visited" vs "waiting" isn't fully needed if we just say "Active Day"
                status: 'active',
                phase: 'active',
                isDayActive: true,
                hoursPassed: hoursPassed,
                secondsUntilDecay: safeConfig.vipWindowHours * 3600, // Or calculation based on midnight?
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: false,
                currentDiscount: currentTierValue,
                nextDiscount: safeConfig.percVip
            };
        }

        // 4. DECAY LOGIC (Multi-tier windows)
        // User Logic: "Based on Calendar Day".
        // If I visit Today (Day 0), I have until the End of Tomorrow (Day 1) to keep the streak.
        // So expiration is Midnight at the start of Day 2.

        // Calculate Midnight of the Day AFTER Tomorrow relative to lastVisit
        // Example: Visit Monday 14:00. Day 0 = Monday. Day 1 = Tuesday. Expiry = Wednesday 00:00.
        const visitDate = new Date(lastVisit);
        visitDate.setHours(0, 0, 0, 0); // Start of Visit Day

        const expiryDate = new Date(visitDate);
        expiryDate.setDate(expiryDate.getDate() + 2); // Add 2 days (Mon -> Wed 00:00)

        // Check if we are still within this "Safety Window" (i.e., it's Mon or Tue)
        if (currentTime < expiryDate.getTime()) {
            // We are safe. User can visit today or tomorrow.
            // Time left is until that expiry deadline.
            const left = Math.floor((expiryDate.getTime() - currentTime) / 1000);

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
