# Build the FarmCare APK
Needs: Node/Bun, JDK 17, Android SDK 34 (Android Studio installs these).
1. bun install
2. bun run build            # makes dist/client (app files)
3. bunx cap sync android    # copies them into android/
4. cd android && ./gradlew assembleDebug
APK: android/app/build/outputs/apk/debug/app-debug.apk
Or open the android/ folder in Android Studio > Build > Build APK.
