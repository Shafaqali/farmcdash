import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** True when running inside the installed Android app. */
export const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Public web address used for email links (the phone app's own origin is not reachable from email). */
export const PUBLIC_URL = "https://farmcdash.lovable.app";
export const authRedirectUrl = () => (isNativeApp() ? PUBLIC_URL : window.location.origin);

/** Android back button, status bar colours, and an offline banner. Renders nothing on the web. */
export function NativeBridge() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const upd = () => setOffline(!navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    if (!isNativeApp()) return () => { window.removeEventListener("online", upd); window.removeEventListener("offline", upd); };
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#f7f6f0" });
      } catch { /* status bar not available */ }
      const h = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && window.location.pathname !== "/") window.history.back();
        else void App.exitApp();
      });
      remove = () => void h.remove();
    })();
    return () => { remove?.(); window.removeEventListener("online", upd); window.removeEventListener("offline", upd); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-destructive py-1.5 text-center text-xs font-semibold text-destructive-foreground">
      No internet connection — changes can't be saved
    </div>
  );
}
