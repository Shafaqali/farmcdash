import { Capacitor } from "@capacitor/core";
import { BackgroundNotices } from "@/lib/background-notices";

/** Native playback observes channel mute, notification volume and DND. */
export async function playCustomerNoticeSound(uid: string) {
  if (document.visibilityState !== "visible") return;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    try { await BackgroundNotices.playForegroundNotice({ uid }); } catch { /* A toast still shows if audio is unavailable. */ }
  }
}
