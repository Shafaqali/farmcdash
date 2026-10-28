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
