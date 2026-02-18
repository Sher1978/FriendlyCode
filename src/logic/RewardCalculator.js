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
        const totalHours = diffMs / (1000 * 60 * 60);

        // Calculate seconds until NEXT day (midnight) in venue's time
        // Note: For React client, we'll use local midnight as a proxy or simple math 
        // since full timezone logic is heavier here.
        const tomorrow = new Date(currentTime);
        tomorrow.setHours(24, 0, 0, 0);
        const secondsUntilNextTier = Math.max(0, Math.floor((tomorrow - currentTime) / 1000));

        // 2. ACTIVE DAY LOGIC (Safety Cooldown Window)
        // If they returned between [12h - 24h], it's an "Active Day" visit -> Reset timer to 0
        if (totalHours >= safeConfig.safetyCooldownHours && totalHours < 24) {
            return {
                discount: safeConfig.percVip,
                status: 'active',
                hoursPassed: totalHours,
                secondsUntilDecay: safeConfig.vipWindowHours * 3600,
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: false
            };
        }

        // 3. COOLDOWN (Too soon)
        if (totalHours < safeConfig.safetyCooldownHours) {
            return {
                discount: safeConfig.percBase,
                status: 'cooldown',
                hoursPassed: totalHours,
                secondsUntilDecay: 0,
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: true
            };
        }

        // 4. DECAY LOGIC (Multi-tier windows)
        // We calculate which window we are in
        if (totalHours <= safeConfig.vipWindowHours) {
            const left = (safeConfig.vipWindowHours - totalHours) * 3600;
            return { discount: safeConfig.percVip, status: 'vip', secondsUntilDecay: left, secondsUntilNextTier, isLocked: false };
        }
        if (totalHours <= safeConfig.tier1DecayHours) {
            const left = (safeConfig.tier1DecayHours - totalHours) * 3600;
            return { discount: safeConfig.percDecay1, status: 'decay1', secondsUntilDecay: left, secondsUntilNextTier, isLocked: false };
        }
        if (totalHours <= safeConfig.tier2DecayHours) {
            const left = (safeConfig.tier2DecayHours - totalHours) * 3600;
            return { discount: safeConfig.percDecay2, status: 'decay2', secondsUntilDecay: left, secondsUntilNextTier, isLocked: false };
        }

        // 5. BASE
        return {
            discount: safeConfig.percBase,
            status: 'reset',
            hoursPassed: totalHours,
            secondsUntilDecay: 0,
            secondsUntilNextTier: secondsUntilNextTier,
            isLocked: false
        };
    }
}
