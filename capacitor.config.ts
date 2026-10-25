import type { CapacitorConfig } from "@capacitor/cli";
// The app runs on a server (sign-in, database), so the Android app loads the published site.
// After publishing, replace APP_URL below with your published address.
const APP_URL = "https://YOUR-APP.lovable.app";
const config: CapacitorConfig = {
  appId: "com.farmcare.app",
  appName: "FarmCare",
  webDir: "public",
  server: { url: APP_URL, cleartext: false },
  android: { allowMixedContent: false },
  backgroundColor: "#f7f6f0",
};
export default config;
