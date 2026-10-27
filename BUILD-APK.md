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

Use the same signing key for subsequent updates. Version 1.5 was built with a new debug key, so it cannot install over older APKs signed with the previous key: uninstall the old app first, then install and sign in again. Cloud records are retained; local sign-in and scheduled alerts are reset. Open the new app and allow notifications to reschedule alerts.

Verified: Android compilation, APK signature, bundled monthly customer page, and signed-in web payment save/reload. Physical-device launch and background notification delivery have not been tested in this environment.

Camera permission for QR scanning is already in `android/app/src/main/AndroidManifest.xml`.
