# SOURCE OF TRUTH: PROJECT "FRIENDLY CODE"
**Version:** 3.5 (RBAC & ADVANCED NOTIFICATIONS)
**Status:** IMPLEMENTED/PRODUCTION

## 1. PROJECT OVERVIEW
"Friendly Code" is a **Global Loyalty Platform (SaaS)** connecting Guests with HoReCa venues via a unified "Time-Decay" reward system.
*   **Core Value:** "Visit often, pay less."
*   **Strategic Pivot:** "Zero Friction" onboarding for Guests and "Retention > Operations" focus for Business Owners.

## 2. SYSTEM ARCHITECTURE (THE HYBRID SPLIT)
*   **B2C Guest Flow (React):** Marketing landing and the primary QR Scanning/Reward activation experience. Optimized for mobile browser performance and zero-friction.
*   **Staff/Admin Panels (Flutter):** High-interaction dashboards for Venue Owners, Managers, and SuperAdmins.

## 3. B2C WEB APPLICATION FLOW (ZERO FRICTION)
**Core Mechanic:** Identity is established via `signInAnonymously` (Firebase) and persistent `localStorage`. Email serves as a recovery/linking key.

### User Journey (QR Scan):
1.  **Splash Screen:** Dynamic "Calculating Reward..." state while fetching venue/user data.
2.  **Landing Page (The Gauge):**
    *   **Visual:** A Speedometer-style Gauge.
    *   **Logic (Binary Needle):** 
        *   If Reward = **5%**, needle is at 0 degrees (Left) with a "Tremble" animation (Indicates "Cold" state).
        *   If Reward > **5%** (10, 15, or 20%), needle sweeps to 180 degrees (Right) (Indicates "Active" state).
    *   **Dynamic Instructions:** 
        *   If 20%: "Visit today to keep your Max Discount!"
        *   If <20%: "Visit today to get your Max Discount!"
3.  **Activation:**
    *   User enters Name/Email (if not saved).
    *   One-click `[CONFIRM & ACTIVATE]`.
    *   Instant Notification to Venue Staff (Email, Telegram, Browser).

## 4. DYNAMIC DISCOUNT LOGIC (STAY ACTIVE)
*   **Base (New/Cold):** 5%
*   **Max (VIP):** 20%
*   **Active Window:** 24 hours from the last visit.
*   **Streak Protection:** Users typically hold their 20% status until midnight of the day *after* their last visit ("Come back tomorrow").
*   **Decay Tiers:**
    *   Stage 1: 15% (After 72 hours)
    *   Stage 2: 10% (After 168 hours)
*   **Reset:** Back to 5% after the final decay window.

## 5. RBAC & ADMIN HIERARCHY (FLUTTER)
The system supports four distinct operational roles within the Admin Panel:

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **SuperAdmin** | Global | Full platform control. Analytics, Billing, Staff Management (Creating Admins/Managers). |
| **Admin** | Regional/Multi-Venue | Manages a set of assigned venues. View stats, edit venue info, assign Managers to venues. |
| **Manager** | Venue-Specific | Primarily operational. Can edit assigned venue details (Categories, Links, Tiers). No Analytics access. |
| **Owner** | Business | View analytics and reports for their specific venues. |

## 6. NOTIFICATION SYSTEM
*   **Delivery Channels:**
    *   **Browser (Bell Icon):** Real-time updates in the Admin Panel via `notifications` collection.
    *   **Email:** via Resend API. Automatic fallback to Owner User Profile if Venue contact email is missing.
    *   **Telegram:** Bot-driven notifications to venue groups.
*   **Logic:** Triggered by `onVisitCreated` Firebase Cloud Function.

## 7. DESIGN SYSTEM (AESTHETIC)
*   **Theme:** "Premium Dark/Light" with Glassmorphism.
*   **Colors:**
    *   **Accent:** Brand Orange (`#FF9933`).
    *   **Hierarchy:** Green (20% - Profit), Orange (5%/15% - Base/Warning), Red (10% - Danger of Loss).
*   **Typography:** `Plus Jakarta Sans` / `Outfit`.

## 8. DATABASE (FIRESTORE)
*   `users`: Stores `role`, `email`, `name`.
*   `venues`: Stores `ownerId`, `assignedAdminId`, `assignedManagerId`, `loyaltyConfig`.
*   `visits`: Records every activation event.
*   `notifications`: Queue for in-app browser notification badge.

