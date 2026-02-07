# TECHNICAL SPECIFICATIONS (v2.1)
**Scope:** Global Platform (SaaS)
**Framework:** Flutter (Unified Codebase)

## 1. TECHNOLOGY STACK
* **Client App:** Flutter Mobile (iOS/Android) + Web PWA.
* **Business App:** Flutter Mobile (iOS/Android).
* **Admin Panel:** Flutter Web (Desktop optimized).
* **Backend:** Firebase (Auth, Firestore, Cloud Functions).
* **Maps:** Google Maps Flutter plugin.

## 2. INTERFACE A: CLIENT APP (GUEST)
**Target:** Mass User. Needs to be simple, fast, visual.

### Screen A1: Discovery Map (Home)
* **Layout:**
    * **Header:** "Browse" Title + Top-Right Profile Icon.
    * **Search:** Inline rounded input (`#F0F3F4`) with "Search resorts" placeholder.
    * **Body:** Vertical scrollable list of "Popular Resorts" (Horizontal Cards: Image + Title + Description).
    * **Toggle:** Map View / List View.
    * **Bottom Nav:** Fixed (Home, Browse, Track, Profile).
* **Element:** **Global Scan Button** (Floating or integrated in Nav).

### Screen A2: Venue Profile (Loyalty View)
* **Context:** User has valid Guest Token (Post-Connect).
* **Header:** Friendly Greeting ("Hey, great to have you back! ☀️").
* **Perk Reminder:** Container showing all 5 Tiers with emoji bullet points (🔥, ✨, 🌿, ☕️).
* **Action:** "GET DISCOUNT" Button -> Navigates to Validator Code/Animation.
* **Footer:** Warm closing message ("Until next time...").

### Screen A3: User Profile
* **Header:** User Avatar, Name.
* **Stats:** "Total Savings", "Total Visits".
* **My Places:** List of connected venues.
* **Settings:**
    * Push Notifications (On/Off).
    * Theme (Light/Dark/System).
    * Language.

## 3. INTERFACE B: BUSINESS APP (VENUE)
**Target:** Owner & Waiter. Needs to be functional and data-heavy.

### Screen B1: Validator (Waiter Mode)
* **Header:** "Pending Scans".
* **Body:** Real-time list of guests who just scanned the QR.
    * Card: Guest Name | Current Discount % | Avatar.
    * Actions: [REJECT] (Red) | [CONFIRM VISIT] (Green).
* **Logic:** Auto-refresh via Firestore Stream.

### Screen B2: Venue Settings (Owner Mode)
* **General Info Tab:**
    * Input: Venue Name.
    * Input: Description (TextArea).
    * Input: Working Hours (Start/End picker).
    * Input: Contact Email.
    * Input: Social Links (Insta, Maps).
    * Upload: Cover Photo.
* **Discount Rules Tab:**
    * **Dynamic List (Max 5 items):**
    * Row: [Time Window (Hours)] -> [Discount %].
    * Example: `0-24h` -> `20%`. `24-72h` -> `10%`.

### Screen B3: Analytics Dashboard
* **KPI Row:** Total Activations (Visits) | Active Users (Unique).
* **Chart 1: Retention Rate:** Average return time (e.g., "Average guest returns in 3.5 days").
* **Chart 2: Discount Distribution:** Pie chart (How many used 20% vs 10% vs 5%).

## 4. INTERFACE C: SUPER ADMIN PANEL (SHER)
**Target:** Platform Management. Web Desktop view.

### Screen C1: Master Dashboard
* **Global KPI:** Total Venues, Total Guests, System Load.
* **Venues Table:**
    * Columns: ID | Name | Owner Email | Status (Active/Frozen) | Payment Status (Paid/Unpaid).
    * **Action:** Toggle Status (Activate/Deactivate).
    * **Action:** "Mark as Paid" (Manual Subscription control).

### Screen C2: Venue Detail View
* **Read-Only View:** See exactly what the Venue Owner sees (Stats, Rules, Info).
* **Admin Logs:** History of status changes for this venue.

## 5. DATABASE SCHEMA ADDITIONS
**Collection: `venues`**
* `tiers`: Array `[{ maxHours: 24, percent: 20 }, ...]` (Max 5).
* `subscription`: `{ plan: "pro", isPaid: boolean, expiryDate: Timestamp }`.
* `stats`: `{ avgReturnHours: number, totalCheckins: number }`.

**Collection: `app_config`**
* `globalSettings`: `{ maxTiersAllowed: 5, maintenanceMode: boolean }`.

## 6. BUSINESS NOTIFICATIONS (TELEGRAM)
**Target:** Venue Staff & Owners (Alternative to App Interface).

### Feature: Group Integration
*   **Logic:** Venue Owner creates a Telegram Group.
*   **Setup:** Owner adds Platform Bot and sends command `/register_venue <VENUE_ID>`.
*   **Storage:** `telegramGroupId` stored in `venues` document.

### Feature: Live Notifications
*   **Trigger:** Guest creates a Scan (Check-In).
*   **Message:** Bot sends "New Guest Details" + "Current Discount" to the linked Group.
*   **Interaction:** Message contains **Inline Button** [✅ Confirm].
*   **Action:** Staff clicks Confirm -> Cloud Function updates Scan status in DB -> Database updates analytics.
