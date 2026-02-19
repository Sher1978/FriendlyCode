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

        // 2. ACTIVE DAY LOGIC (Safety Cooldown Window)
        // Flutter Logic: if (hoursPassed >= config.safetyCooldownHours && hoursPassed < 24)
        const isDayActive = (hoursPassed >= safeConfig.safetyCooldownHours && hoursPassed < 24);

        if (isDayActive) {
            return {
                discount: safeConfig.percVip, // Or keep previous? Flutter keeps current.
                status: 'active',
                phase: 'active',
                isDayActive: true,
                hoursPassed: hoursPassed,
                secondsUntilDecay: safeConfig.vipWindowHours * 3600,
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: false,
                currentDiscount: safeConfig.percVip, // Fallback
                nextDiscount: safeConfig.percVip
            };
        }

        // 3. COOLDOWN (Too soon)
        if (hoursPassed < safeConfig.safetyCooldownHours) {
            return {
                discount: safeConfig.percBase,
                status: 'cooldown',
                phase: 'cooldown',
                isDayActive: false, // Wait! Flutter might say active if same day? No, cooldown is strict.
                hoursPassed: hoursPassed,
                secondsUntilDecay: 0,
                secondsUntilNextTier: secondsUntilNextTier,
                isLocked: true,
                currentDiscount: safeConfig.percBase,
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
