## 1. Firebase CLI Setup
Ensure you have the Firebase CLI installed and logged in:
```bash
npm install -g firebase-tools
firebase login
```

> [!NOTE]
> Project Region: **asia-south1** (Mumbai) is configured in functions.

## 2. Initialize Project
If you haven't linked the local code to your Firebase project:
```bash
firebase use --add YOUR_PROJECT_ID
```

## 3. Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 4. Build & Deploy Web (Super Admin + Guest Web + React Landing)
This project uses a hybrid architecture. You MUST use the combined build script to merge the React landing page and the Flutter admin panel:

```bash
# 1. Ensure dependencies are installed in both root and admin
npm install
cd admin
flutter pub get
cd ..

# 2. Run the unified build script
node scripts/build-all.js

# 3. Deploy the resulting 'dist' folder
firebase deploy --only hosting
```

## 5. Security Rules
Copy the following into your Firebase Console (Firestore Rules):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /venues/{venueId} {
      allow read: if true;
      allow write: if false; // Only via Admin or Owner checks (future)
    }
    match /scans/{scanId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 6. Android Release (APKs)
```bash
flutter build apk --release
```
The APK will be at `build/app/outputs/flutter-apk/app-release.apk`.
