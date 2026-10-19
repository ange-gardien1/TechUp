# Google sign-in for Android, iOS, and web

Google sign-in is available on the login and registration screens in the Android/iOS app and browser. A verified Google account can sign in to an existing customer account or create a new customer account. Google sign-in cannot create or access technician, manager, or admin accounts.

The app verifies Google ID tokens on the server before issuing a TechUp session. Google client IDs are identifiers, not secrets. Never put a Google client secret or the server's `GOOGLE_WEB_CLIENT_ID` in source control.

## Google Cloud configuration

1. Create or select a Google Cloud project and configure the OAuth consent screen.
2. Create an **Android OAuth client** for package `com.techup.app`. Register the SHA-1 fingerprints for each certificate used to build/install the app (debug and release/EAS as appropriate).
3. Create an **iOS OAuth client** for bundle identifier `com.techup.app`.
4. Create a **Web application OAuth client**. Add the browser origins where the app runs (for example, `http://localhost:8081` for local development and your deployed app origin). The server uses this client ID as the accepted audience for Google ID tokens.
5. Copy the Web and iOS client IDs to the local app environment and server environment:

   ```dotenv
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
   GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   ```

   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `GOOGLE_WEB_CLIENT_ID` must be the same Web client ID. This Web client ID is also used by browser sign-in. Configure the `EXPO_PUBLIC_` values in the app's `.env` or `.env.local` file, and configure `GOOGLE_WEB_CLIENT_ID` in the backend environment; do not commit real project credentials.

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
- The backend rejects Google sign-in when `GOOGLE_WEB_CLIENT_ID` is not configured.
