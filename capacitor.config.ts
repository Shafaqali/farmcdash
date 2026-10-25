import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.farmcare.app",
  appName: "FarmCare",
  webDir: "dist/client",
  android: { allowMixedContent: false },
  backgroundColor: "#f7f6f0",
};
export default config;
