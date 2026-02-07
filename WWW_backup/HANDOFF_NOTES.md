# Handoff Notes: Friendly Code Web Mockups

## 📦 Delivered Features (Web)
These are new, standalone screen implementations located in `lib/features/web/presentation/pages/`.
- **`b2c_home_screen.dart`**: Guest Landing (Home) with custom gauge visualization and "Time-Decay" logic.
- **`lead_capture_screen.dart`**: Zero-friction name/contact form.
- **`thank_you_screen.dart`**: Success screen with live countdown timer.
- **`b2b_landing_screen.dart`**: Responsive sales landing page (Mobile/Desktop layout).
- **`web_preview_catalog.dart`**: A utility screen to preview all mockups.

## ⚠️ Modified Core Files (Review Carefully)
The following files were modified to support the new web features or fix build errors. **Do not overwrite blindly.**

### 1. `lib/core/theme/colors.dart`
- **Change**: Added new "Friendly" palette (`brandOrange`, `brandBrown`, `backgroundCream`).
- **Critical**: I *restored* the legacy color definitions (`deepSeaBlue`, `lime`, `backgroundDark`) to prevent breaking the existing mobile app. Ensure these remain during merge.

### 2. `lib/core/models/venue_model.dart`
- **Change**: Added `latitude` and `longitude` fields to the class, constructor, `toMap`, and `fromMap`.
- **Reason**: Fix build errors in `guest_venue_profile_screen.dart`.

### 3. `lib/features/guest/presentation/screens/landing_screen.dart`
- **Change**: Fixed a syntax error (missing closing brace/parenthesis in `build` method).

### 4. `lib/main.dart`
- **Change**: Changed `home:` to `const WebPreviewCatalog()`.
- **Action**: You must revert this to `const DispatcherScreen()` before deploying the mobile app.

## 📂 Backup
A full copy of the new web screens and the updated `colors.dart` is located in:
`c:\Sher_AI_Studio\projects\FriendlyCode\WWW_backup\`
