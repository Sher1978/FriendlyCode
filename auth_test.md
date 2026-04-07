# Authentication & Session Test Suite

This document outlines the steps to verify the REVOO authentication and session management.

## 1. Guest Authentication (Anonymous)
- **Step**: Navigate to the landing page (`/`).
- **Step**: Enter a guest name and optional email.
- **Step**: Click "Get My Reward".
- **Step**: Verify you are redirected to the QR scan page (`/qr`).
- **Expected**: The system should display your name and a 5% discount (as a new guest).

## 2. Returning Guest (Session Persistence)
- **Step**: Close the browser tab or refresh the page while on `/qr`.
- **Step**: Re-open the page using the venue URL (e.g., `/?qr_venue_id=...`).
- **Expected**: The landing page should be bypassed immediately, and you should be taken back to the QR page.

## 3. Logout (State Reset)
- **Step**: On the QR page, click the user profile icon (top left) to open the menu.
- **Step**: Click the **Red Logout Button** at the bottom.
- **Expected**:
    1.  You are redirected to the root landing page (`/`).
    2.  The application state is cleared.
- **Verification**: Try navigating back to a venue URL (e.g., `/?qr_venue_id=...`).
    - **Expected**: You should NOT be bypassed. You should see the landing page and be asked to enter your name again.

## 4. Google Auth (If implemented in /activate)
- **Step**: Go to the login/activation page.
- **Step**: Sign in with a Google account.
- **Step**: Verify the profile menu shows your Google name/email.
- **Step**: Perform a Logout and verify it clears BOTH the Google session and the local guest name.

---
> [!IMPORTANT]
> If the logout still fails to clear the state after these changes, check the Browser's Developer Tools -> Application -> Local Storage. The keys `guestName`, `guestEmail`, and `currentVenueId` should be empty after logout.
