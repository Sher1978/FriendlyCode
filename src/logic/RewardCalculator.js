export class RewardCalculator {
    /**
     * Calculates the reward based on the time difference between now
     * and the last visit using the Venue's LoyaltyConfig.
     * 
     * @param {Date} lastVisit 
     * @param {Date} currentTime 
     * @param {Object} config - The loyaltyConfig object from Firestore
     * @returns {Object} { discount: number, status: string, nextTierIn: number }
     */
    static calculate(lastVisit, currentTime, config) {
        // Default Config if missing
        const safeConfig = {
            safetyCooldownHours: config?.safetyCooldownHours || 12,
            vipWindowHours: config?.vipWindowHours || 48,
            tier1DecayHours: config?.tier1DecayHours || 72,
            tier2DecayHours: config?.tier2DecayHours || 168,
            percBase: config?.percBase || 5,
            percVip: config?.percVip || 20,
            percDecay1: config?.percDecay1 || 15,
            percDecay2: config?.percDecay2 || 10,
        };

        const diffMs = currentTime - lastVisit;
        const hours = diffMs / (1000 * 60 * 60);

        // 1. Safety Cooldown
        if (hours < safeConfig.safetyCooldownHours) {
            // Too soon -> No upgrade
            return {
                discount: safeConfig.percBase,
                status: 'cooldown',
                hoursPassed: hours,
                cooldownHours: safeConfig.safetyCooldownHours
            };
        }

        // 2. VIP Window (e.g., 12h <= delta <= 48h)
        if (hours <= safeConfig.vipWindowHours) {
            return {
                discount: safeConfig.percVip, // 20%
                status: 'vip',
                hoursPassed: hours
            };
        }

        // 3. Decay Tier 1 (e.g., 48h < delta <= 72h)
        if (hours <= safeConfig.tier1DecayHours) {
            return {
                discount: safeConfig.percDecay1, // 15%
                status: 'decay1',
                hoursPassed: hours
            };
        }

        // 4. Decay Tier 2 (e.g., 72h < delta <= 168h)
        if (hours <= safeConfig.tier2DecayHours) {
            return {
                discount: safeConfig.percDecay2, // 10%
                status: 'decay2',
                hoursPassed: hours
            };
        }

        // 5. Reset (e.g., delta > 168h)
        return {
            discount: safeConfig.percBase, // 5%
            status: 'reset',
            hoursPassed: hours
        };
    }
}
