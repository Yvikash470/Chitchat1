# Chit Chat — Expo SDK 51

This project retains the existing welcome/authentication UI and the Chats, Status, Calls, and Contacts tabs. It adds Firebase-backed one-to-one and group conversations, real-time message listeners, and chat photo/video attachments stored in Firebase Storage.

## Important behavior

- Email/password authentication uses Firebase Authentication.
- After sign-in, a minimal user directory record is synced to `users/{uid}` so registered users can find one another by email.
- Private chats use deterministic conversation IDs and contain the two authenticated participant UIDs.
- Groups are created with the creator and the registered members entered by email.
- Messages live at `conversations/{conversationId}/messages/{messageId}` and use Firestore `onSnapshot()` for real-time delivery.
- Chat media uploads to `chatMedia/{conversationId}/{uid}/{fileName}`. Only members can read those files. Status media remains under `statuses/{uid}/{fileName}`.
- The Calls tab is call-history UI only; this project does not implement live voice/video calls.
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

Use Node.js 20 and run from this project directory:

```bash
npm install
npx expo-doctor
npx expo start
```

Test on a real Android phone. Verify registration, login, private chat between two accounts, group chat with at least two other accounts, image upload, video upload, and that a non-member cannot read another conversation. No APK has been built or tested as part of preparing this source ZIP.

## Build an APK from GitHub Actions

The included `.github/workflows/android-apk.yml` uses Expo Application Services (EAS) to build an APK and upload it as a GitHub Actions artifact.

1. Upload the *contents* of this `Chitchat1-fixed` folder to the root of your GitHub repository (so `package.json`, `App.js`, `app.json`, `eas.json`, `firestore.rules`, `storage.rules`, and `.github/` are at the repository root). Do not upload an extra nested `Chitchat1-fixed/` folder.
2. Sign in at https://expo.dev and ensure the EAS project in `app.json` belongs to your Expo account. If the `owner` or `extra.eas.projectId` values do not belong to your account, run `npx eas-cli init` in the project and update `app.json` with your own project details.
3. Create an Expo access token in your Expo account settings.
4. In GitHub, open **Repository → Settings → Secrets and variables → Actions → New repository secret**. Name it `EXPO_TOKEN` and paste the token as its value.
5. Open **Actions → Build Chit Chat Android APK → Run workflow**. You can also trigger it by pushing to `main` or `master`.
6. Wait for the workflow to finish. Open its run, scroll to **Artifacts**, and download `ChitChat-Android-APK`.
7. Install the APK on your phone and test it. If the build fails, open the failed step and use its logs to identify the issue.

## Notes

- `eas.json` is configured for an APK using the `preview` profile.
- The GitHub workflow builds on EAS cloud infrastructure; it requires a valid `EXPO_TOKEN` and an EAS project you can access.
- The app has not been verified on a physical device in this environment. Expo SDK 51 is an older SDK; if Expo doctor reports compatibility issues, address those before distributing the app.
