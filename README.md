# Chit Chat — Expo SDK 51

This project retains the welcome/authentication UI and the Chats, Status, Calls, and Contacts tabs. It includes Firebase-backed one-to-one and group conversations, real-time message listeners, chat photo/video attachments, a custom Chit Chat app icon, message deletion, status deletion, per-user chat hiding, and foreground incoming-message pop-ups.

## Important behavior

- Email/password authentication uses Firebase Authentication.
- After sign-in, a minimal user directory record is synced to `users/{uid}` so registered users can find one another by email.
- Private chats use deterministic conversation IDs and contain the two authenticated participant UIDs.
- Groups are created with the creator and the registered members entered by email.
- Messages live at `conversations/{conversationId}/messages/{messageId}` and use Firestore `onSnapshot()` for real-time delivery. Long-press your own message to delete it for all conversation members. Incoming messages trigger an in-app pop-up while Chit Chat is open.
- Chat media uploads to `chatMedia/{conversationId}/{uid}/{fileName}`. Only members can read those files. Status media remains under `statuses/{uid}/{fileName}`.
- The Status tab lets you delete your own statuses. The Chats tab has a Delete for me control that hides a conversation only from your list; it does not delete other members’ copies. The Link device menu explains how to sign in on another phone with the same Firebase account; QR-based companion pairing is not implemented. Background/lock-screen push notifications still require Expo push notification credentials and a trusted server trigger. The Calls tab is call-history UI only; this project does not implement live voice/video calls.
- Google login still needs real OAuth client IDs; email/password login is the supported ready-to-configure flow.

## Firebase setup (required before testing)

The app is configured for the Firebase project ID `chitchat-app-107ba`. Confirm that you own/control this project before using it. The Firebase client configuration in `App.js` is not a server secret, but you should apply appropriate API-key restrictions in Google Cloud when practical.

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.
2. Open **Firestore Database** and create a database if it does not exist.
3. Open **Storage** and finish creating the default bucket if it does not exist. The app uses the bucket configured in `App.js`.
4. In the Firebase Console Rules editors, publish the contents of `firestore.rules` under Firestore Database → Rules and `storage.rules` under Storage → Rules.
5. Register two test accounts using different email addresses. Each user must sign in at least once so their `users/{uid}` directory record is created. Then use Chats → New chat with the other registered user's email, or Create group with registered member email addresses.
6. Do not replace these rules with public read/write rules. User profile documents are readable to signed-in users to support email-based discovery, so only keep public directory fields (`uid`, `email`, `displayName`, timestamps) in those documents.

The rules are a baseline tailored to this app's data model. Test them in the Firebase Rules Playground or Emulator before production. Firestore/Storage rules are enforced by Firebase, not by hiding UI controls.

## Local checks

Use Node.js 22 (required by the current EAS CLI) and run from this project directory:

```bash
npm install
npx expo-doctor
npx expo start
```

Test on a real Android phone. Verify registration, login, private chat between two accounts, group chat with at least two other accounts, image upload, video upload, and that a non-member cannot read another conversation. The source changes have not been verified on a physical device. No APK build is guaranteed until GitHub Actions finishes successfully and the app is tested.

## Build an APK from GitHub Actions

The included `.github/workflows/android-apk.yml` uses Expo Application Services (EAS) to build an APK and upload it as a GitHub Actions artifact. The workflow uses Node.js 22 for the current EAS CLI and intentionally does not enable npm caching because this source package does not include a lockfile.

1. Upload the *contents* of the extracted updated ZIP to the root of your GitHub repository (so `package.json`, `App.js`, `app.json`, `eas.json`, `firestore.rules`, `storage.rules`, and `.github/` are at the repository root). Do not upload an extra nested `Chitchat1-fixed/` folder.
2. Sign in at https://expo.dev and ensure the EAS project in `app.json` belongs to your Expo account. If the `owner` or `extra.eas.projectId` values do not belong to your account, run `npx eas-cli init` in the project and update `app.json` with your own project details.
3. Create an Expo access token in your Expo account settings. The GitHub Actions workflow requires a repository Actions secret named `EXPO_TOKEN`; without it, the remote EAS build cannot authenticate.
4. In GitHub, open **Repository → Settings → Secrets and variables → Actions → New repository secret**. Name it `EXPO_TOKEN` and paste the token as its value.
5. Open **Actions → Build Chit Chat Android APK → Run workflow**. You can also trigger it by pushing to `main` or `master`.
6. Wait for the workflow to finish. Open its run, scroll to **Artifacts**, and download `ChitChat-Android-APK`.
7. Install the APK on your phone and test it. If the build fails, open the failed step and use its logs to identify the issue.

## Notes

- `eas.json` is configured for an APK using the `preview` profile.
- The GitHub workflow builds on EAS cloud infrastructure; it requires a valid `EXPO_TOKEN` and an EAS project you can access.
- The app has not been verified on a physical device in this environment. Expo SDK 51 is an older SDK; if Expo doctor reports compatibility issues, address those before distributing the app.
