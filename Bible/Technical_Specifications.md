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

## 4. BUSINESS LOGIC: TIME-DECAY 2.0 (CALENDAR DAYS)
*   **Timezone Enforcement:** All visit dates are calculated and matched strictly against the venue's configured timezone (e.g., `Asia/Dubai`). The primary identifier is a structured DateString (`YYYY-MM-DD`).
*   **Single Daily Visit:** If a guest scans the QR code multiple times within the same *calendar day* (based on the venue timezone), only the first scan is recorded. Subsequent scans update the UI but do not alter the database timestamp.
*   **Active Streak (VIP):** `vipWindowDays` (default 1 Day). Maintains a 20% discount if visited strictly on consecutive calendar days.
*   **Decay Stages (Configurable via Admin):**
    *   Stage 1: `tier1DecayDays` -> 15%
    *   Stage 2: `tier2DecayDays` -> 10%
    *   Stage 3: Base -> 5%
*   **Debug & Verification:** 
    * 5x Taps on the Guest Name in the QR page opens the Debug Overlay showing the last 5 exact visit dates.
    * Staff receives an instant Email/Telegram notification upon successful activation validation.

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
