const safeStorage = {
    getItem: (k) => { try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch (e) { return null; } },
    setItem: (k, v) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch (e) {} },
    removeItem: (k) => { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); } catch (e) {} }
};

export class RewardCalculator {
    /**
     * Helper to get a YYYY-MM-DD date string in a specific timezone
     */
    static getVenueDateString(date, timezone = 'Asia/Ho_Chi_Minh') {
        try {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) {
                return new Date().toISOString().split('T')[0];
            }
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone || 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(d);
        } catch (e) {
            console.error("Invalid timezone, falling back to UTC:", e);
            const d = date instanceof Date ? date : new Date(date);
            return (isNaN(d.getTime()) ? new Date() : d).toISOString().split('T')[0];
        }
    }

    /**
     * Persistent Browser Session ID for anonymous user tracking across reloads
     */
    static getBrowserSessionUid() {
        let sessionUid = safeStorage.getItem('revoo_browser_session_uid');
        if (!sessionUid) {
            sessionUid = 'anon_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            safeStorage.setItem('revoo_browser_session_uid', sessionUid);
        }
        return sessionUid;
    }

    /**
     * Save or retrieve the Firebase anonymous UID so it can be merged when the user logs in
     */
    static saveAnonymousUid(uid) {
        if (uid) safeStorage.setItem('revoo_anon_uid', uid);
    }

    static getAnonymousUid() {
        return safeStorage.getItem('revoo_anon_uid');
    }

    /**
     * Record a visit calendar day (YYYY-MM-DD) in localStorage for a venue
     */
    static recordLocalVisitDate(venueId, dateStr, isGrabBag = false) {
        if (!venueId || !dateStr) return;
        try {
            const key = `revoo_visit_dates_${venueId}`;
            const raw = safeStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            if (!list.includes(dateStr)) {
                list.push(dateStr);
                list.sort((a, b) => b.localeCompare(a));
                safeStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
            }
            if (isGrabBag) {
                safeStorage.setItem(`revoo_grab_bag_date_${venueId}`, dateStr);
            }
        } catch (e) {
            console.warn("recordLocalVisitDate warning:", e);
        }
    }

    /**
     * Read cached visit calendar dates (YYYY-MM-DD) for a venue from localStorage
     */
    static getLocalVisitDates(venueId) {
        if (!venueId) return [];
        try {
            const raw = safeStorage.getItem(`revoo_visit_dates_${venueId}`);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list.filter(Boolean) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Detects Scenario 2: Client scanned the special QR code inside a Grab / Glovo / Aggregator delivery bag.
     * Scanning this QR code is equated to having placed an order today and immediately unlocks Maximum Discount (Tier 3).
     */
    static checkGrabBagScenario(venueId, todayStr, searchString = '') {
        try {
            const search = searchString || (typeof window !== 'undefined' ? window.location.search : '');
            const params = new URLSearchParams(search);
            const utmSource = (params.get('utm_source') || '').toLowerCase();
            const utmCampaign = (params.get('utm_campaign') || '').toLowerCase();
            const promo = (params.get('promo') || '').toLowerCase();
            const source = (params.get('source') || '').toLowerCase();
            const bagQr = params.get('bag_qr');

            const isFromUrl =
                utmSource === 'grab_bag' ||
                utmSource === 'aggregator_qr' ||
                utmSource === 'grab' ||
                utmSource === 'glovo' ||
                utmCampaign === 'grab_bag' ||
                promo === 'max_tier' ||
                promo === 'grab' ||
                promo === 'grab_bag' ||
                source === 'grab_bag' ||
                source === 'aggregator_qr' ||
                bagQr === '1' ||
                bagQr === 'true';

            if (isFromUrl && venueId && todayStr) {
                this.recordLocalVisitDate(venueId, todayStr, true);
                return true;
            }

            if (venueId && todayStr) {
                const savedGrabDate = safeStorage.getItem(`revoo_grab_bag_date_${venueId}`);
                if (savedGrabDate === todayStr) {
                    return true;
                }
            }
        } catch (e) {
            console.warn("checkGrabBagScenario warning:", e);
        }
        return false;
    }

    /**
     * Resolves a list of Firestore visit/order documents + local browser session dates into:
     * - todayStr: current calendar date in venue timezone
     * - isDayActive: whether a visit/order already happened today
     * - lastVisitDateStr: the most recent visit calendar date STRICTLY BEFORE today (ignores today's date)
     * - isGrabBagActive: whether Scenario 2 (Grab Bag QR immediate max tier) is active today
     */
    static resolveVisitHistory(visitDocs = [], venueId = '', currentTime = new Date(), venueTimezone = 'Asia/Ho_Chi_Minh', searchString = '') {
        const todayStr = this.getVenueDateString(currentTime, venueTimezone);
        let isGrabBagActive = this.checkGrabBagScenario(venueId, todayStr, searchString);

        const dateSet = new Set(this.getLocalVisitDates(venueId));

        if (Array.isArray(visitDocs)) {
            for (const item of visitDocs) {
                if (!item) continue;
                const data = typeof item.data === 'function' ? item.data() : item;
                let ts = data.timestamp || data.createdAt || data.date;
                let dateObj = null;

                if (ts && typeof ts.toDate === 'function') {
                    dateObj = ts.toDate();
                } else if (ts instanceof Date) {
                    dateObj = ts;
                } else if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
                    dateSet.add(ts);
                } else if (ts && typeof ts.seconds === 'number') {
                    dateObj = new Date(ts.seconds * 1000);
                } else if (ts) {
                    const parsed = new Date(ts);
                    if (!isNaN(parsed.getTime())) dateObj = parsed;
                }

                const dStr = dateObj ? this.getVenueDateString(dateObj, venueTimezone) : (typeof ts === 'string' ? ts.slice(0, 10) : null);
                if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
                    dateSet.add(dStr);
                    if (dStr === todayStr && (data.source === 'grab_bag_qr' || data.isAggregatorBagScan === true || data.acquisition_source === 'grab_bag')) {
                        isGrabBagActive = true;
                        this.recordLocalVisitDate(venueId, todayStr, true);
                    }
                }
            }
        }

        const uniqueDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
        const isDayActive = uniqueDates.includes(todayStr);
        // Strictly ignore today's date when computing lastVisitDateStr for regular dynamic discount
        const pastDates = uniqueDates.filter(d => d < todayStr);
        const lastVisitDateStr = pastDates.length > 0 ? pastDates[0] : null;

        return {
            todayStr,
            isDayActive,
            lastVisitDateStr,
            isGrabBagActive,
            uniqueDates
        };
    }

    /**
     * Normalizes loyaltyConfig / deliveryLoyaltyConfig / legacy tiers array into a clean structure
     */
    static normalizeConfig(config, baseDiscountFallback = 5) {
        if (Array.isArray(config)) {
            const validTiers = config
                .map(t => ({
                    discount: Number(t.percentage || t.percent || 0),
                    maxDays: Math.round(Number(t.maxHours || 0) / 24)
                }))
                .filter(t => t.discount > 0);

            const discounts = validTiers.map(t => t.discount).sort((a, b) => a - b);
            const percBase = discounts.length > 0 ? discounts[0] : baseDiscountFallback;
            const percVip = discounts.length > 0 ? discounts[discounts.length - 1] : 20;
            const percMedium = discounts.length > 2 ? discounts[Math.floor(discounts.length / 2)] : (discounts[1] || 15);

            return {
                isArrayConfig: true,
                validTiers,
                percBase,
                percMedium,
                percVip,
                percDeposit: Math.max(percVip, 25),
                vipWindowDays: 1,
                mediumDays: 7,
                depositThreshold: 1000000
            };
        }

        const decayStages = Array.isArray(config?.decayStages) ? [...config.decayStages] : [];
        const decayStage0 = decayStages.length > 0 ? decayStages[0] : null;

        const rawBase = Number(config?.percBase);
        const rawVip = Number(config?.percVip);
        const rawMedium = Number(config?.percMedium ?? decayStage0?.discount ?? config?.percDecay1);
        const rawDeposit = Number(config?.percDeposit);

        const percBase = (!isNaN(rawBase) && rawBase > 0) ? rawBase : baseDiscountFallback;
        const percVip = (!isNaN(rawVip) && rawVip > 0) ? rawVip : 20;
        const percMedium = (!isNaN(rawMedium) && rawMedium > 0) ? rawMedium : Math.round((percBase + percVip) / 2);
        const percDeposit = (!isNaN(rawDeposit) && rawDeposit > 0) ? rawDeposit : 25;

        const vipWindowDays = Number(config?.vipWindowDays ?? 1) || 1;
        const mediumDays = Number(
            config?.mediumDays ??
            decayStage0?.days ??
            config?.tier1DecayDays ??
            config?.degradationIntervalDays ??
            7
        ) || 7;

        return {
            isArrayConfig: false,
            decayStages,
            percBase,
            percMedium,
            percVip,
            percDeposit,
            vipWindowDays,
            mediumDays,
            depositThreshold: Number(config?.depositThreshold ?? 1000000)
        };
    }

    /**
     * Calculates the reward based strictly on:
     * 1. Active Deposit Balance (> 0) -> Deposit Discount (percDeposit). When balance == 0, automatically falls back to regular tiers.
     * 2. Scenario 2 (Grab / Aggregator Bag QR) -> Immediate Maximum Regular Discount (Tier 3 / percVip) today & tomorrow.
     * 3. Scenario 1 / Regular Dynamic Discount -> Calendar Days difference from lastVisitDateStr (excluding today).
     *
     * @param {string|Date|null} lastVisitInput - The "YYYY-MM-DD" (or Date) of the last visit prior to today.
     * @param {Date} currentTime - Now.
     * @param {Object|Array} config - Venue loyaltyConfig or deliveryLoyaltyConfig.
     * @param {string} venueTimezone - e.g. "Asia/Ho_Chi_Minh" or "Asia/Dubai"
     * @param {boolean} isDayActive - true if the user already activated a visit TODAY.
     * @param {boolean} hasLockedDiscount - legacy flag (deposit is active whenever depositBalance > 0).
     * @param {number} baseDiscountFallback - default base discount (e.g. 5%).
     * @param {number} depositBalance - current user deposit balance in venue currency.
     * @param {boolean} isGrabBagVip - true if user scanned the Grab/Aggregator food bag QR code (Scenario 2).
     */
    static calculate(
        lastVisitInput,
        currentTime = new Date(),
        config = {},
        venueTimezone = 'Asia/Ho_Chi_Minh',
        isDayActive = false,
        hasLockedDiscount = false,
        baseDiscountFallback = 5,
        depositBalance = 0,
        isGrabBagVip = false,
        isOnlineOrder = false
    ) {
        const norm = this.normalizeConfig(config, baseDiscountFallback);
        const todayStr = this.getVenueDateString(currentTime, venueTimezone);

        // 1. DEPOSIT DISCOUNT:
        // When ordering food online (isOnlineOrder = true), regular tier discounts strictly apply.
        // The deposit is used solely as a payment method for debiting the order.
        if (!isOnlineOrder && hasLockedDiscount && Number(depositBalance) > 0) {
            return {
                discount: norm.percDeposit,
                status: 'deposit',
                phase: 'maintenance',
                isDayActive,
                currentDiscount: norm.percDeposit,
                nextDiscount: norm.percDeposit,
                diffDays: 'N/A',
                isLocked: true,
                isDeposit: true,
                isGrabBagVip: false
            };
        }

        // 2. SCENARIO 2 (GRAB / AGGREGATOR BAG QR):
        // Scanning the QR code in a Grab/Glovo delivery bag is equated to placing an order today.
        // Client skips minimum discount and immediately gets Maximum Discount (Tier 3 / percVip).
        if (isGrabBagVip) {
            return {
                discount: norm.percVip,
                status: 'vip',
                phase: 'maintenance',
                isDayActive: true,
                currentDiscount: norm.percVip,
                nextDiscount: norm.percVip,
                diffDays: 0,
                isLocked: false,
                isDeposit: false,
                isGrabBagVip: true
            };
        }

        // Normalize lastVisitInput to a YYYY-MM-DD string (safely handling Date objects if passed)
        let lastVisitDateStr = null;
        if (lastVisitInput instanceof Date) {
            const converted = this.getVenueDateString(lastVisitInput, venueTimezone);
            // If a caller passed today's Date object directly without filtering today, ignore it unless it's strictly before today
            lastVisitDateStr = converted < todayStr ? converted : null;
        } else if (typeof lastVisitInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(lastVisitInput)) {
            const cleanStr = lastVisitInput.slice(0, 10);
            lastVisitDateStr = cleanStr < todayStr ? cleanStr : null;
        }

        // 3. NEW GUEST (or only visited today for the first time under Scenario 1) -> Tier 1 (Minimal / Base) today, Tier 3 tomorrow
        if (!lastVisitDateStr) {
            return {
                discount: norm.percBase,
                status: 'new',
                phase: 'initial',
                isDayActive,
                currentDiscount: norm.percBase,
                nextDiscount: norm.percVip,
                diffDays: 'N/A',
                isLocked: false,
                isDeposit: false,
                isGrabBagVip: false
            };
        }

        // 4. RETURNING GUEST -> Calculate strict Calendar Days difference (Current Date - Last Visit Date)
        const msPerDay = 1000 * 60 * 60 * 24;
        const todayUtc = Date.parse(todayStr + "T00:00:00Z");
        const lastVisitUtc = Date.parse(lastVisitDateStr + "T00:00:00Z");

        let diffDays = Math.round((todayUtc - lastVisitUtc) / msPerDay);
        if (isNaN(diffDays) || diffDays < 1) diffDays = 1;

        if (norm.isArrayConfig && norm.validTiers.length > 0) {
            let todayDiscount = norm.percBase;
            let status = 'reset';
            const sortedTiers = [...norm.validTiers].sort((a, b) => b.discount - a.discount);

            for (const tier of sortedTiers) {
                if (tier.discount > norm.percBase && tier.maxDays > 0 && diffDays <= tier.maxDays) {
                    todayDiscount = tier.discount;
                    status = tier.discount === norm.percVip ? 'vip' : 'decay1';
                    break;
                }
            }

            return {
                discount: todayDiscount,
                status,
                phase: todayDiscount < norm.percVip ? 'decay' : 'maintenance',
                isDayActive,
                currentDiscount: todayDiscount,
                nextDiscount: norm.percVip,
                diffDays,
                isLocked: false,
                isDeposit: false,
                isGrabBagVip: false
            };
        }

        let todayDiscount = norm.percBase;
        let status = 'reset';

        if (diffDays <= norm.vipWindowDays) {
            // Tier 3: Maximal regular discount (visited yesterday / within VIP window)
            todayDiscount = norm.percVip;
            status = 'vip';
        } else if (diffDays <= norm.mediumDays) {
            // Tier 2: Medium regular discount (within decay stage window)
            todayDiscount = norm.percMedium;
            status = 'decay1';
        } else {
            // Tier 1: Minimal base discount (reset after decay window)
            todayDiscount = norm.percBase;
            status = 'reset';
        }

        return {
            discount: todayDiscount,
            status,
            phase: diffDays <= norm.vipWindowDays ? 'maintenance' : 'decay',
            isDayActive,
            currentDiscount: todayDiscount,
            nextDiscount: norm.percVip,
            diffDays,
            isLocked: false,
            isDeposit: false,
            isGrabBagVip: false
        };
    }
}
