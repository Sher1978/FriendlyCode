# TECHNICAL SPECIFICATIONS (v3.1)
**Scope:** Global Platform (SaaS)
**Framework:** Hybrid (React + Flutter)

## 1. TECHNOLOGY STACK
* **Guest Flow (B2C):** React (Vite) Web PWA. Optimized for mobile browser speed and low-friction entry.
    | Primary Domain | `www.revoo.win` (New) |
    |---|---|
    | Legacy Domain | `www.friendlycode.fun` |
    | Admin Panel | `/admin` |
* **Admin/Owner Panels:** Flutter Web (Desktop/Tablet optimized).
* **Backend:** Firebase (Auth, Firestore, Cloud Functions).
* **Email:** Resend API (Triggered via Cloud Functions).
* **Telegram:** Bot integration for venue staff notifications.

*   **REACT (Vite/React)**:
    *   **Scope**: Marketing Landing Pages & Guest QR Funnel.
    *   **Primary Files**: `src/NewQRPage.jsx` (Production), `src/TestQRPage.jsx` (Demo/Test), `src/UnifiedActivation.jsx`, `src/PngBattery.jsx`.
*   **FLUTTER (Web)**:
    *   **Scope**: Admin/Owner Dashboard, Staff Management, Global Venue Management.
    *   **Primary Files**: `admin/lib/features/web/presentation/layout/admin_shell.dart`, `admin/lib/features/admin/presentation/screens/`.

## 2. INTERFACE A: GUEST WEB APP (REACT)
**Goal:** Zero-friction reward activation in iOS 26 OLED style.

### Screen A1: Discovery & Calculating (Splash)
* **Logic:** Authenticates user via `signInAnonymously`. Fetches `guestName` from localStorage. Performs discount calculation based on `isDayActive` and decay stages.
* **Aesthetic:** Pure OLED Black (`#000000`) with pulse animations.

### Screen A2: Reward Gauge / Battery (Home)
* **Battery Logic (PngBattery):**
    *   **Architecture:** 14-disk 3D geometry mapped to 10%, 25%, 50%, and 100% capacity states.
    *   **Animation:** Two-layer hybrid. Layer 1: Persistent continuous glow wave. Layer 2: 14 individually lit structure blocks.
    *   **Sparkles:** 25 deterministic floating glow particles for active energy visual.
*   **Visuals:** iOS 26 Glassmorphism. `backdrop-blur-3xl` panels sitting over ambient glowing blurs (`mix-blend-screen`).
*   **Colors:** Neon Blue (Deep Sea), Neon Green (iOS 26), Neon Orange (REVOO Energy).

## 3. INTERFACE B: ADMIN PANEL (FLUTTER)
**Goal:** Multi-tenant hierarchy management.

### Screen B1: Master Dashboard (SuperAdmin)
*   **Staff Management:** Screen to promote users to `admin` or `manager` roles. Handles search by email and role toggles.
*   **Venue Control:** Global list of all venues with Search-by-name.

### Screen B2: Venue Management (Admin/Manager)
*   **Permissions:** Admins see all venues assigned to their ID. Managers see only their specific venues.
*   **Assigment:** SuperAdmins/Admins assign `assignedAdminId` and `assignedManagerId` in the Venue Editor.

### Screen B3: Notification Center
*   **Component:** `NotificationBadge` (Bell icon) in the header.
*   **Logic:** Real-time stream from `notifications` collection. Marks as `read: true` on interaction.

## 4. BUSINESS LOGIC: TIME-DECAY 2.0 & TWO ACQUISITION SCENARIOS (CALENDAR DAYS)
*   **Timezone & Calendar Date Enforcement:** All visit dates are normalized to `YYYY-MM-DD` in the venue's configured timezone (e.g., `Asia/Ho_Chi_Minh`, `Asia/Dubai`) via `RewardCalculator.getVenueDateString()`.
*   **Unified Visit History (`RewardCalculator.resolveVisitHistory`):**
    *   Merges Firestore `visits` documents (queried by `uid`, `anonUid`, `browserSessionUid`, and `email`) with browser `localStorage` dates (`revoo_visit_dates_{venueId}`).
    *   When an anonymous user logs in or registers (`findAndMergeUserByEmail`), all historical visits recorded under `revoo_anon_uid` or `revoo_browser_session_uid` are migrated to their authenticated profile.
    *   `lastVisitDateStr` is strictly the most recent visit date **prior to today** (`d !== todayStr`). Multiple scans/orders on the same calendar day do not overwrite the prior visit date used to compute today's discount tier.
*   **Priority of Discount Calculation (`RewardCalculator.calculate`):**
    1.  **Deposit Tier (`status: 'deposit'`):** If `Number(depositBalance) > 0`, returns `percDeposit` (constant maximum deposit discount). Staff manually deducts from the deposit balance in the Admin Panel; when `depositBalance == 0`, the user automatically returns to regular dynamic tiers.
    2.  **Scenario 2 — Grab / Aggregator Bag QR Override (`status: 'vip', isGrabBagVip: true`):**
        *   **QR URL Format:** `https://www.revoo.win/?utm_source=grab_bag&promo=max_tier&id={venueId}`
        *   Scanning the QR code from a Grab/Glovo/Zomato delivery bag is treated as **an order already completed today**: it records today's date (`YYYY-MM-DD`) in `localStorage` (`revoo_grab_bag_date_{venueId}`) and Firestore `visits` (`type: 'grab_bag_qr'`), and immediately unlocks **Maximum Regular Discount (Tier 3 / `percVip`)** both **today (right now)** and **tomorrow** (`diffDays === 1`).
    3.  **Scenario 1 — Google Maps / Organic Entry & Regular Dynamic Tiers:**
        *   **URL Format:** `https://www.revoo.win/?utm_source=google_maps&id={venueId}` (or `/qr?id={venueId}`).
        *   **Day 1 (No past visits prior to today):** Minimum Discount (**Tier 1 / `percBase`**). After ordering/visiting today, tomorrow's discount becomes **Tier 3 (`percVip`)**.
        *   **Subsequent Visits (`diffDays = Today - LastVisitDate`):**
            *   `1 <= diffDays <= vipWindowDays` (default 1 day / "tomorrow"): **Tier 3 (`percVip`)**.
            *   `vipWindowDays < diffDays <= mediumDays`: **Tier 2 (`percMedium`)**.
            *   `diffDays > mediumDays`: **Tier 1 (`percBase`)**.
*   **Debug & Verification:** 
    *   5x Taps on the Guest Name in the QR page opens the Debug Overlay showing the last 5 exact visit dates.
    *   Staff receives an instant Email/Telegram notification upon successful activation validation.

## 5. DATABASE SCHEMA
**Collection: `users`**
*   `role`: enum('superAdmin', 'admin', 'manager', 'owner', 'staff').
*   `venueId`: String (Optional, denotes per-venue assignment for staff/managers).

**Collection: `venues`**
*   `assignedAdminId`: String (UID)
*   `assignedManagerId`: String (UID)
*   `loyaltyConfig`: `{ safetyCooldownHours, vipWindowHours, tier1DecayHours, tier2DecayHours, percBase, percVip, percDecay1, percDecay2 }`.

**Collection: `notifications`**
*   `venueId`: String
*   `title`: String
*   `message`: String
*   `read`: Boolean
*   `timestamp`: ServerTimestamp

## 6. CLOUD FUNCTIONS
*   **`onVisitCreated`**:
    1.  Fetch Venue data.
    2.  Fetch Owner User Profile (Fallback for Email if `ownerEmail` is missing in venue).
    3.  Create Firestore `notification` document.
    4.  Send Email via Resend.
    5.  Push to Telegram (if `telegramChatId` exists).
*   **`subscriptionExpiryReminder`** (Scheduled Daily):
    1. Finds venues whose subscription expires in exactly 7 days.
    2. Sends warning emails to venue owners.

## 7. DEPLOYMENT & HOSTING ARCHITECTURE
**Infrastructure:** Firebase Hosting (Production)
*   **Vercel is NOT used** for this project's production pipeline. Any historical Vercel configurations are deprecated.
*   **CI/CD Pipeline:** Fully automated via GitHub Actions (`.github/workflows/deploy.yml`).
*   **Workflow Logic:**
    1. Triggers on pushes to the `main` branch.
    2. Builds the React Web App (`npm run build` in root).
    3. Builds the Flutter Admin Web App (`flutter build web` in `/admin`).
    4. Merges both builds (React app at `/`, Flutter app at `/admin/`).
    5. Deploys combined artifact to Firebase Hosting (Project: `bot-lab-21910`).
*   **Critical Dependency Rule:** GitHub Actions strictly uses `package-lock.json` during `npm install`. All new dependencies (e.g., `qrcode.react`) MUST be installed locally using `npm install <package> --save` and the updated `package-lock.json` MUST be committed. If a component uses a package missing from `package-lock.json`, local builds will pass but the CI/CD deployment will fail.
*   **Source Tracking:** Always ensure all newly created React components (`src/*.jsx`) are explicitly staged and tracked in Git. Untracked files will cause `Rollup failed to resolve import` errors in the CI/CD pipeline.
