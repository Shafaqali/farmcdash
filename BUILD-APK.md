# Build the FarmCare Android APK

1. Publish the app in Lovable and copy the published address (e.g. https://farmcare.lovable.app).
2. Put that address in `capacitor.config.ts` (APP_URL).
3. On a computer with Android Studio (JDK 17 + Android SDK 34):
   ```
   npm install
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```
4. APK: `android/app/build/outputs/apk/debug/app-debug.apk`
5. Copy it to your phone, open it, allow "Install unknown apps".

Camera permission for QR scanning is already in `android/app/src/main/AndroidManifest.xml`.
