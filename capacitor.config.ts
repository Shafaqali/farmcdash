import type { CapacitorConfig } from "@capacitor/cli";
// The app's screens are bundled inside the APK (built with vite.android.config.ts into dist/client).
// It talks directly to the FarmCare backend over the internet for sign-in and data.
const config: CapacitorConfig = {
  appId: "com.farmcare.app",
  appName: "FarmCare",
  webDir: "dist/client",
  android: { allowMixedContent: false },
  backgroundColor: "#f7f6f0",
  plugins: { StatusBar: { overlaysWebView: false, style: "LIGHT", backgroundColor: "#f7f6f0" } },
};
export default config;
