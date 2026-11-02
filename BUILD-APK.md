# Build the FarmCare Android APK

Screens are bundled locally inside the APK; no published website URL is required. Sign-in and farm data require internet.

1. On a computer with Android Studio (JDK 17 + Android SDK 34):
   ```
   bun install
   bun run build:android
   cd android && ./gradlew assembleDebug
   ```
2. APK: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Copy it to your phone, open it, allow "Install unknown apps".

Use the same signing key for subsequent updates. Version 1.7 (version code 7) adds the goat farm logo as the Android app icon, login screen and header mark plus favicon, the SCHEDULE_EXACT_ALARM permission for on-time alerts, and alert re-sync whenever the app returns to the foreground. Its debug certificate differs from version 1.5 because the previous key was unavailable: uninstall the old app first, then install and sign in again. Cloud records are retained; local sign-in and scheduled alerts are reset. Open the new app and allow notifications to reschedule alerts.

Verified for version 1.7: Android compilation, APK signature, package/version, local assets and latest payment code, plus 13 billing/privacy/routing tests. The prior signed-in web flow verified payment correction and reload. Physical-device launch and background notification delivery have not been tested in this environment.

Camera permission for QR scanning is already in `android/app/src/main/AndroidManifest.xml`.

## Version 1.9

Includes the updated login/sign-up design and original branding images bundled at their local paths so the Android logo does not depend on a hosted asset route. APK delivered as `FarmCare_v9.apk` (version code 9).

Verified Android compilation, APK signing/package/version, both packaged logos, 16 auth/billing/privacy/routing tests, and the locally bundled login screen on a phone-sized browser with no page errors. Physical-device launch, background notification delivery and successful real-account signup/confirmation/login remain unverified.

The signing certificate differs from v8 because its key is unavailable in this sandbox. Uninstall the older app before installing v9. Cloud records remain; sign in again and allow notifications to restore local reminders.

## Version 1.10

Includes current-account Excel download, improved notification/payment dialogs, and updated animal and customer pages. Delivered as `FarmCare_v10.apk`, version code 10.

Verified Android compilation, APK signature/package/version, both bundled original logos, packaged Excel and notification features, 19 focused tests, and phone-sized bundled login with no page errors. Physical Android launch, native Excel save/share and background notification delivery remain unverified.

The certificate differs from v9 because the prior signing key is unavailable. Uninstall the older app before installing v10; cloud records remain. Sign in again and allow notifications to restore reminders.
