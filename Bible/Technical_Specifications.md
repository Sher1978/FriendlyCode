# TECHNICAL SPECIFICATIONS (v3.1)
**Scope:** Global Platform (SaaS)
**Framework:** Hybrid (React + Flutter)

## 1. TECHNOLOGY STACK
* **Guest Flow (B2C):** React (Vite) Web PWA. Optimized for mobile browser speed and low-friction entry.
* **Admin/Owner Panels:** Flutter Web (Desktop/Tablet optimized).
* **Backend:** Firebase (Auth, Firestore, Cloud Functions).
* **Email:** Resend API (Triggered via Cloud Functions).
* **Telegram:** Bot integration for venue staff notifications.

*   **REACT (Vite/React)**:
    *   **Scope**: Marketing Landing Pages & Guest QR Funnel.
    *   **Primary Files**: `src/NewQRPage.jsx` (Production), `src/TestQRPage.jsx` (Demo), `src/UnifiedActivation.jsx`, `src/PngBattery.jsx`.
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
*   **Colors:** Neon Blue (Deep Sea), Neon Green (iOS 26), Neon Orange.

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

## 4. BUSINESS LOGIC: TIME-DECAY 2.0
*   **Active Streak:** 24h window to maintain 20%. 
*   **Calendar Day Logic:** Status expires at midnight of the day *after* the last visit.
*   **Decay Stages:**
    *   15% (Stage 1 Decay)
    *   10% (Stage 2 Decay)
    *   5% (Base/Reset)
*   **Verification:** Staff receives instant Email/Telegram/Browser notification upon guest activation.

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
