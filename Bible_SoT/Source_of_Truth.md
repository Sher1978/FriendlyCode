# SOURCE OF TRUTH: PROJECT "REVOO"
**Version:** 3.5 (RBAC & ADVANCED NOTIFICATIONS)
**Status:** IMPLEMENTED/PRODUCTION
**Domains:** `www.revoo.win` (Primary REVOO), `www.friendlycode.fun` (Legacy Friendly Code)

## 1. PROJECT OVERVIEW
"REVOO" is a **Global Loyalty Platform (SaaS)** connecting Guests with HoReCa venues via a unified "Time-Decay" reward system.
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

## 4. DYNAMIC DISCOUNT LOGIC & TWO ACQUISITION SCENARIOS (CALENDAR DAYS)
*   **Calendar-Day Mechanics (`YYYY-MM-DD`):**
    *   All visits and orders are tracked strictly by **Calendar Date** (`YYYY-MM-DD`) in the venue's configured timezone (`venueTimezone`). Exact timestamps within the day do not affect tier decay.
    *   Works identically for **logged-in users** (`uid` / `email`) and **anonymous users** (persistent browser session ID `revoo_browser_session_uid` + local visit date cache `revoo_visit_dates_{venueId}`, which automatically merges into the user's account upon login/registration).
    *   Multiple scans or orders on the same calendar day count as a single day's visit; regular tier calculation compares **Today's Date** against the **Last Visit Date prior to today** (`diffDays = Today - LastVisitDate`).
*   **Regular Dynamic Discount Tiers (3 Tiers, Configurable per Venue):**
    *   **Tier 1 — Base / Minimum (`percBase`, e.g., 5%):** First visit (no prior visit history) OR when `diffDays > mediumDays` (discount has melted due to inactivity).
    *   **Tier 3 — Max Regular / VIP (`percVip`, e.g., 20%):** Next-day return (`1 <= diffDays <= vipWindowDays`, default `1` calendar day — "visit tomorrow to keep max discount").
    *   **Tier 2 — Intermediate (`percMedium`, e.g., 10–15%):** Return within `vipWindowDays < diffDays <= mediumDays`.
*   **Deposit Discount Tier (`percDeposit`, e.g., 25%):**
    *   Configured separately in venue settings.
    *   Active whenever the guest's `depositBalance > 0`. Staff manually tops up and deducts from the deposit balance.
    *   Once `depositBalance` reaches `0`, the guest either tops up their deposit again or automatically returns to the regular dynamic discount tiers (Tier 1 / Tier 2 / Tier 3).
*   **Two Scenarios of Discount Accrual (Direct Delivery & QR Funnel):**
    *   **IMPORTANT UI RULE:** Using the technical term *"Тир"* / *"Tier"* in any guest-facing message is strictly forbidden. Always substitute the actual discount percentage variables from the venue settings (`{percBase}%`, `{percVip}%`).
    *   **Scenario 1 — Google Maps / Organic Entry (`?utm_source=google_maps&id={venueId}` or standard table QR):**
        *   A new guest arriving from Google Maps gets the **Minimum Discount (`percBase`, e.g., 5%) today**.
        *   **Core Message (FOMO):** *"Привет! Сегодня ваша скидка — минимальная ({percBase}%), а завтра после заказа станет максимальной ({percVip}%)! Не пропускайте!"*
    *   **Scenario 2 — Grab / Glovo / Aggregator Delivery Bag QR (`?utm_source=grab_bag&promo=max_tier&id={venueId}`):**
        *   Placed on a physical QR flyer inside a Grab/Glovo/Zomato delivery bag to convert aggregator customers into direct ordering.
        *   **Scanning this QR code is equated to having already placed an order today.**
        *   The guest skips the minimum discount and **immediately receives the Maximum Regular Discount (`percVip`, e.g., 20%)** both **right now** (if they want to order immediately) and **tomorrow**!
        *   **Core Message:** *"Спасибо за заказ! Закажите завтра у нас напрямую (или прямо сейчас) — ваша скидка уже максимальная ({percVip}%)!"*

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



## 9. REVOO SERVICES ARCHITECTURE SPECIFICATIONS
*   **Services Master Architecture:** [`Bible_SoT/Revoo_Services_Architecture.md`](file:///c:/Sher_AI_Studio/projects/FriendlyCode/Bible_SoT/Revoo_Services_Architecture.md)
*   **Dynamic Capacity, Multi-Zone Seating & Yield SoT:** [`Bible_SoT/Dynamic_Capacity_Yield_and_Seating_SoT.md`](file:///c:/Sher_AI_Studio/projects/FriendlyCode/Bible_SoT/Dynamic_Capacity_Yield_and_Seating_SoT.md)
