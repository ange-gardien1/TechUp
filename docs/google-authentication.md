# Google sign-in for Android, iOS, and web

Google sign-in is available on the login and registration screens in the Android/iOS app and browser. A verified Google account can sign in to an existing customer account or create a new customer account. Google sign-in cannot create or access technician, manager, or admin accounts.

The app verifies Google ID tokens on the server before issuing a TechUp session. Google client IDs are identifiers, not secrets. Never put a Google client secret in source control or expose it to the browser.

## Google Cloud configuration

1. Create or select a Google Cloud project and configure the OAuth consent screen.
2. Create an **Android OAuth client** for package `com.techup.app`. Register the SHA-1 fingerprints for each certificate used to build/install the app (debug and release/EAS as appropriate).
3. Create an **iOS OAuth client** for bundle identifier `com.techup.app`.
4. Create a **Web application OAuth client**. For browser sign-in, add these **Authorized JavaScript origins**:

   ```text
   https://techup.rw
   https://tech-up-gamma.vercel.app
   http://localhost:8081
   ```

   Browser sign-in uses Google's Identity Services ID-token flow; it does not use redirect URIs or an `/auth/google/callback` route. The client secret is not used by this flow. The server verifies ID tokens using the Web client ID as the accepted audience.
5. Set the Web client ID in the server environment as `GOOGLE_CLIENT_ID`. For Android/iOS app builds, copy the Web and iOS client IDs to the local app environment:

   ```dotenv
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
   ```

   The browser retrieves the public client ID from `GET /auth/google/config`, so it does not need a build-time client ID variable. The server also accepts the existing `GOOGLE_WEB_CLIENT_ID` name for compatibility. Keep `GOOGLE_CLIENT_SECRET` server-side; this ID-token flow does not need it.

6. In `app.json`, replace `REPLACE_WITH_IOS_CLIENT_ID` in the Google Sign-In plugin's `iosUrlScheme` with the reversed iOS client ID, for example `com.googleusercontent.apps.1234567890-abcdef`.
7. Rebuild the native app after changing OAuth settings:

   ```sh
   npx expo run:android
   npx expo run:ios
   ```

   Native Google Sign-In uses native code and cannot run in Expo Go. Use a development build for local testing and rebuild after changing native configuration. The app uses Expo SDK 57's recommended `react-native-nitro-google-signin` package on Android/iOS. Browser sign-in uses Google's Identity Services JavaScript client.

## Account behavior

- New Google identities create verified customer accounts without a password.
- Existing accounts are matched only after the backend validates Google's signed ID token and confirms the email address is verified.
- Existing non-customer accounts cannot use customer Google sign-in.
- The backend rejects Google sign-in when `GOOGLE_CLIENT_ID` (or the legacy `GOOGLE_WEB_CLIENT_ID`) is not configured.
