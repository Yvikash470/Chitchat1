# Chit Chat — Expo SDK 51

## Included in this update
- Welcome/onboarding screen.
- Email/password registration and login using Firebase Authentication.
- Google sign-in integration scaffold using Expo AuthSession and Firebase credentials.
- Authentication state gate and logout.
- Existing contacts screen and Firestore chat screen retained.

## Required setup before testing
1. Run `npm install` in the project directory.
2. In Firebase Console for the configured project, open **Authentication → Sign-in method** and enable **Email/Password**.
3. For Google login, enable **Google** in Firebase Authentication and create OAuth client IDs in Google Cloud Console. Replace the three `YOUR_GOOGLE_*_CLIENT_ID` placeholders in `App.js` with the real Web, Android and iOS client IDs as appropriate. Google sign-in is intentionally guarded until those credentials are configured; placeholder IDs cannot authenticate.
4. Confirm Firestore is enabled and configure security rules so only authorized users can read/write the intended messages. Do not make the database publicly writable.
5. Run `npx expo-doctor`, then `npx expo start`. Test on a real Android device and build a fresh APK with EAS.

## Reliability notes
- Form validation and Firebase errors are handled with user-facing messages.
- Contact permission remains optional.
- No source change can guarantee zero crashes on every device/configuration. This source has not been built or run on a physical device in this environment. Verify the Expo doctor output and EAS build logs before distributing.
- The Google OAuth client IDs must be supplied by the app owner; they cannot safely be fabricated.
