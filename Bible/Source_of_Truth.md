# SOURCE OF TRUTH: PROJECT "FRIENDLY CODE"
**Version:** 3.0 (ZERO FRICTION & B2B REBOOT)
**Status:** APPROVED FOR IMPLEMENTATION

## 1. PROJECT OVERVIEW
"Friendly Code" is a **Global Loyalty Platform (SaaS)** connecting Guests with HoReCa venues via a unified "Time-Decay" reward system.
*   **Core Value:** "Visit often, pay less."
*   **Strategic Pivot:** "Zero Friction" onboarding for Guests and "Retention > Acquisition" focus for Business Owners.

## 2. B2B LANDING PAGE STRATEGY (BUSINESS OWNERS)
**Concept:** "Retention is cheaper than Acquisition."
**Tone of Voice:** Friendly, energetic, honest, B2B-casual (no corporate jargon).

### Key Value Propositions:
*   **The Problem:** Advertising is a casino (you pay for a *chance*).
*   **The Solution:** Pay only for results (retention). Keeping an old client is 7x cheaper than finding a new one.
*   **The Mechanics:** **Time-Decay Reward** (High reward for frequent visits, low reward for rare visits).
*   **The "No-Risk" Guarantee:** The system is purely performance-based.
*   **The Simplicity:** "Set it and forget it" tools for owners.

## 3. B2C WEB APPLICATION FLOW ("ZERO FRICTION" MODEL)
**Core Change:** Remove functionality requiring app download or OTP registration for the first reward.
**Technology:** Progressive Web App (PWA) / Mobile Web with LocalStorage/Cookies for persistence.

### User Journey A: First-Time Visitor (Cold)
1.  **Scan QR:** User scans the table QR code.
2.  **Landing Page:**
    *   **Hero:** "Your reward TODAY is **5%**." (Immediate gratification).
    *   **Hook:** "Want **20%**? Come back tomorrow!" (Explain Time-Decay: 20% tomorrow, 15% in 3 days, 5% in a week).
3.  **Data Capture (Input Form):**
    *   **Fields:** Name, Contact (Smart Input: Switcher for WhatsApp Number or Email).
    *   **Consent (Crucial):** Checkbox `[ ] I agree to receive secret offers from this venue (max 1/week).`
    *   **Action:** Button `[Get Reward]`.
4.  **Verification Screen (Data Integrity):**
    *   **Display:** Show the entered Name and Contact.
    *   **Actions:** Button `[Edit]` (Go back) or Button `[Confirm & Activate]` (Proceed).
    *   *Note:* No SMS OTP verification required at this stage. Trust the user to reduce friction.

### User Journey B: Returning Visitor (Warm)
1.  **Scan QR:** System detects User ID via Browser Cookies / LocalStorage.
2.  **Auto-Login:** Skip Landing & Data Capture.
3.  **Activation Screen:**
    *   **Display:** "Welcome back, [Name]!"
    *   **Dynamic Offer:** Show the calculated reward based on the time elapsed since the last visit (e.g., "Your Reward Today: **15%**").
    *   **Action:** Large Button `[🚀 ACTIVATE REWARD]`.

### User Journey C: Reward Activation (The "Moment of Truth")
1.  **Trigger:** User clicks `[ACTIVATE REWARD]`.
2.  **System Action:**
    *   **Backend:** Records the transaction attempt.
    *   **Notification:** Sends an immediate notification to the Staff (via the **Business App Push** or **Email**). *Content: "Table X (Alex) is redeeming 15%."*
3.  **User UI Feedback:**
    *   Redirect to **Thank You / Success Screen**.
    *   Show a visual timer (e.g., "Active for 5 mins") or a Green Checkmark to show the waiter.
4.  **Retention Loop (Upsell):**
    *   **Hook:** "Want to find other places with these rewards?"
    *   **CTA:** Soft-sell links to download the full Mobile App (App Store / Google Play).

## 4. MARKETING & RETENTION MODULE
**Goal:** Allow businesses to reactivate their customer base without spamming.

### Client Side (Web/App)
*   **Opt-In:** The checkbox during the First Visit flow (`marketing_consent = true`).
*   **Opt-Out:** Unsubscribe link in every email/message.

### Business Dashboard (Owner UI)
*   **Feature:** "Broadcast Message".
*   **Function:** Send a text/image blast to all users who visited this specific venue and opted in.
*   **Constraints (Hard Logic):**
    *   **Frequency Cap:** Max **1 broadcast per 7 days** per venue. (Prevent spam).
    *   **Audience Filter:** All / Active (Last 30 days) / Lost (No visit > 30 days).

### Admin Dashboard (Super Admin)
*   **Global Controls:** Ability to ban a venue from sending broadcasts.
*   **Stats:** View open rates and "Return Rate" (users who visited within 3 days of a broadcast).

## 5. BUSINESS LOGIC (CORE)
### A. The "Time-Decay" Model
*   Venues configure up to **5 Tiers** of rewards based on hours since the last visit.
*   Example: 0-24h (20%), 24-48h (15%), etc.

### B. The "Secure Handshake" (Security)
*   Typically initiated by the Guest via the Web App (Journey C).
*   Staff validates via their Validator App.

## 6. DATABASE SCHEMA UPDATES
### Users Table
*   `contact_info` (String, Unique Index scope per venue or global depending on architecture).
*   `contact_type` (Enum: 'whatsapp', 'email').
*   `marketing_consent` (Boolean).
*   `last_marketing_received_at` (Timestamp).

### Visits Table
*   Tracks every scan and activation.

## 7. DESIGN & UX (THE "STITCH" SYSTEM)
### A. Visual Identity
*   **Aesthetic:** "Light & Slim" (Clean, Premium, Airy).
*   **Palette:**
    *   **Backgrounds:** White (`#FFFFFF`) & Soft Gray (`#F0F3F4`).
    *   **Typography:** `Plus Jakarta Sans`. Dark Blue-Grey (`#111518`) for headings, Soft Slate (`#637C88`) for body.
*   **Components:** Rounded corners (r12-r24), Flat elevations, Horizontal list items.

### B. Tone of Voice
*   **Personality:** Friendly, Enthusiastic, Warm, Emoji-rich.
*   **Key Phrases:**
    *   "Welcome!" instead of "Identify Yourself".
    *   "YAY! REWARD UNLOCKED! 🎉" instead of "Status Activated".
    *   "Stay safe, stay happy! 💛".

## 8. IMPLEMENTATION PRIORITY
1.  **Frontend:** B2C Web Flow (Zero Friction).
2.  **Backend:** Staff Notification Logic.
3.  **Frontend:** B2B Landing Page Copy & Design.
4.  **Backend:** Marketing Broadcast Module.
