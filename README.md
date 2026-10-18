# Chit Chat — patched Expo SDK 51 source

## Files changed
- `App.js`: fixes the missing default export, moves screen components to module scope so they are not recreated on every render, adds `NavigationContainer` and `SafeAreaProvider`, and handles contact/Firebase errors.
- `package.json`: uses the Expo SDK 51 contacts package version and adds the SDK-compatible Expo icon package; removes the unused `react-native-vector-icons` package.
- `app.json`: configures the Expo Contacts permission prompt and removes a favicon reference to an asset that was not included in the supplied source archive.
- `eas.json`: retained from the supplied project.

## Apply from an Android phone
1. Extract this ZIP.
2. In your GitHub repository, replace `App.js`, `package.json`, and `app.json` with the versions from this folder. Keep `eas.json`.
3. Commit the files to the branch your Expo/EAS project builds.
4. In Expo/EAS, start a new Android APK build from that commit. Install the new APK; an old APK will not contain the fixes.

## Important
- This source was reviewed and patched, but an actual EAS build/device run could not be performed in this environment.
- Chat messages use the Firebase project configured in `App.js`. Firestore must be enabled and its security rules must be configured safely for your intended users. This code does not add user authentication; do not make your database publicly writable just to make sending work.
- Contact access is optional. If denied, the app should remain open and show a helpful message.
- If the APK still crashes, share the new EAS build log and, if possible, AndroidRuntime/ReactNativeJS crash output.
