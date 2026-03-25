# SOURCE OF TRUTH: PROJECT "FRIENDLY CODE"
**Version:** 3.5 (RBAC & ADVANCED NOTIFICATIONS)
**Status:** IMPLEMENTED/PRODUCTION

## 1. PROJECT OVERVIEW
"Friendly Code" is a **Global Loyalty Platform (SaaS)** connecting Guests with HoReCa venues via a unified "Time-Decay" reward system.
*   **Core Value:** "Visit often, pay less."
*   **Strategic Pivot:** "Zero Friction" onboarding for Guests and "Retention > Operations" focus for Business Owners.
*   **B2B Onboarding Model:** Paid Setup with 30-Day Money-Back Guarantee (Retention-based).

## 2. SYSTEM ARCHITECTURE (THE HYBRID SPLIT)
*   **B2C Guest Flow (React):** Marketing landing and the primary QR Scanning/Reward activation experience. Optimized for mobile browser performance and zero-friction.
*   **Staff/Admin Panels (Flutter):** High-interaction dashboards for Venue Owners, Managers, and SuperAdmins.

## 3. B2C WEB APPLICATION FLOW (ZERO FRICTION)
**Core Mechanic:** Identity is established via `signInAnonymously` (Firebase) and persistent `localStorage`. Email serves as a recovery/linking key.

### User Journey (QR Scan or NFC Tap):
1.  **Splash Screen:** Dynamic "Calculating Reward..." state while fetching venue/user data.
2.  **Landing Page (Battery Home):**
    *   **Activation:** Tap NFC tag or scan QR code. No app required.
    *   **Visual:** Photorealistic 3D Battery with high-fidelity glassmorphism.
    *   **Logic (OLED Glow):** 
        *   Ambient glows matching battery state (Blue for cold/base, Green for VIP).
        *   Frosted glass panels (`#1C1C1E/60`) for timeline and stats.
    *   **Route:** `/qr` (Production), `/test` (Design Demo/Debug).
3.  **Activation:**
    *   User enters Name/Email (if not saved).
    *   One-click `[CONFIRM & ACTIVATE]`.
    *   Instant Notification to Venue Staff (Email, Telegram, Browser).

## 4. DYNAMIC DISCOUNT LOGIC (CALENDAR DAYS)
*   **Base (New/Cold):** 5%
*   **Max (VIP):** 20%
*   **Timeframe Mechanics:** Decay operates via strict Calendar Days difference (`Current Date` vs `Last Visit Date`) based on the selected venue Timezone.
*   **Daily Logins:** Multiple scans in the same calendar day count as one visit.
*   **Decay Tiers (Configurable):**
    *   Max VIP: Achieved via consecutive visiting (e.g. 1 Day interval).
    *   Stage 1: e.g. 15% 
    *   Stage 2: e.g. 10%
*   **Reset:** Back to 5% automatically when the maximum permitted decay interval is exceeded.

## 5. RBAC & ADMIN HIERARCHY (FLUTTER)
The system supports four distinct operational roles within the Admin Panel:

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **SuperAdmin** | Global | Full platform control. Analytics, Billing, Staff Management (Creating Admins/Managers). |
| **Admin** | Regional/Multi-Venue | Manages a set of assigned venues. View stats, edit venue info, assign Managers to venues. |
| **Manager** | Venue-Specific | Primarily operational. Can edit assigned venue details (Categories, Links, Tiers). No Analytics access. |
| **Owner** | Business | View analytics, edit venue details (Loyalty Tiers, Profile), assign per-venue staff, and view subscription status. |

## 6. NOTIFICATION SYSTEM
*   **Delivery Channels:**
    *   **Browser (Bell Icon):** Real-time updates in the Admin Panel via `notifications` collection.
    *   **Email:** via Resend API. Automatic fallback to Owner User Profile if Venue contact email is missing.
    *   **Telegram:** Bot-driven notifications to venue groups.
*   **Logic:** 
    * Triggered by `onVisitCreated` Firebase Cloud Function.
    * Subscription Expiry Warning: Automated email sent 7 days before subscription end date to owners.

## 7. DESIGN SYSTEM (iOS 26 OLED)
*   **Theme:** "iOS 26 Dark Mode" (Pure OLED Black).
*   **Aesthetics:** 
    *   **Glassmorphism**: 60% opacity panels with `backdrop-blur-[40px]`.
    *   **Ambient Lighting**: Neon blurs (`Deep Sea Blue`, `Friendly Orange`) rendered behind UI cards.
*   **Colors:**
    *   **Background**: OLED Black (`#000000`).
    *   **Cards**: Frosted Grey (`#1C1C1E`).
    *   **Accent**: Neon Green (`#00FF41`), Neon Orange (`#FF9933`).
*   **Typography:** `Inter` (Production Default).

## 8. DATABASE (FIRESTORE)
*   `users`: Stores `role`, `email`, `name`.
*   `venues`: Stores `ownerId`, `assignedAdminId`, `assignedManagerId`, `loyaltyConfig`.
*   `visits`: Records every activation event.
*   `notifications`: Queue for in-app browser notification badge.

