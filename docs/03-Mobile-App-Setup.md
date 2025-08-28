# Mobile App (Expo React Native)

Prereqs:
- Node.js 18+
- Android Studio installed on Windows (emulator) or a physical Android device
- WSL: run Metro in WSL; device/emulator runs on Windows

Install deps:
- `cd apps/glucosnap`
- `npm install`

Configure:
- Update `app.json` → `extra.apiBaseUrl` to your deployed API URL
- Update `app.json` → `extra.googleClientId` to your Google OAuth client ID
- For Android/iOS specific client IDs, use `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` env vars if needed

Android Google Sign-In notes:
- Create an Android OAuth Client in Google Cloud with your package name (`com.eldor.glucosnap`) and the SHA-1 of the signing key you use for the build you run.
- For debug builds (`npx expo run:android`), the app is signed with the Android debug keystore. Create a separate Android OAuth client using that debug SHA-1.
- For release/EAS builds, use the release keystore SHA-1 (from Play Console or your keystore).
- Expo Go uses the Web client ID and the Expo proxy redirect; native builds use the Android client ID and your app scheme (`glucosnap://redirect`).

Run (Android first):
- Start Metro: `npm start`
- Press `a` for Android or run `npx expo run:android`
- On WSL: ensure ADB over TCP is reachable or use physical device (Expo Go)

Usage:
- Sign in with Google
- Take a photo or pick one
- Tap Analyze to upload and get carb estimation
