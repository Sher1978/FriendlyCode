# SOURCE OF TRUTH: PROJECT "FRIENDLY CODE"
**Version:** 2.1 (PLATFORM & UI DETAILED)
**Status:** IMMUTABLE

## 1. PROJECT OVERVIEW
"Friendly Code" is a **Global Loyalty Platform (SaaS)**.
* **Concept:** An aggregator app connecting Guests with multiple HoReCa venues via a unified "Time-Decay" discount system.
* **Core Value:** "Visit often, pay less."

## 2. BUSINESS LOGIC
### A. The "Time-Decay" Model
* Venues configure up to **5 Tiers** of discounts based on hours since the last visit.
* Example: 0-24h (20%), 24-48h (15%), etc.

### B. The "Secure Handshake" (Security)
1.  Guest Scans QR -> "I am here" (Status: Pending).
2.  Staff receives alert -> Verifies order -> Clicks "Confirm".
3.  System resets Guest's timer -> "Visit Counted".

## 3. USER ROLES

### Role A: The Guest (Client App)
* Finds venues via **Map**.
* Tracks status across multiple venues.
* Receives Push Notifications about burning discounts.

### Role B: The Venue (Business App)
* **Owner/Manager:** Configures Venue Profile (Photo, Hours, Links) and Discount Rules. Views Analytics (Retention, Efficiency).
* **Waiter:** Validates scans in real-time.

### Role C: Super Admin (Sher)
* Manages the Ecosystem.
* Controls Venue Subscription Status (Active/Frozen).
* Monitors Global Stats.
