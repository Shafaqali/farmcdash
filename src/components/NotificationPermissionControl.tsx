import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarm } from "@/lib/farm-data";
import { BackgroundNotices, syncBackgroundNotices } from "@/lib/background-notices";
import { usePhoneAlerts } from "@/components/Notifications";

export function NotificationPermissionControl() {
  const { uid, role, loading } = useFarm();
  const syncPhone = usePhoneAlerts(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backgroundIssue, setBackgroundIssue] = useState("");
  const account = useRef(uid);
  account.current = uid;
  const returning = useRef(false);
  const supported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  const finish = useCallback(async () => {
    if (!uid || account.current !== uid) return;
    if (role === "owner") {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const exact = await LocalNotifications.checkExactNotificationSetting();
      const permission = await BackgroundNotices.ownerPermission();
      if (account.current !== uid) return;
      if (!permission.permission) throw new Error("Allow app notifications and the Farm alerts channel in Android settings.");
      if (await syncPhone(true) === false) throw new Error("Could not schedule reminders. Please try again.");
      if (account.current === uid) setMessage(exact.exact_alarm === "granted" ? "Enabled. Vaccines: 9 AM. Unpaid balances: 10 AM (phone time)." : "Notifications allowed. Enable Alarms & reminders for timely alerts.");
    } else if (role === "customer") {
      await syncBackgroundNotices(uid, role);
      const status = await BackgroundNotices.status();
      if (!status.enabled || !status.permission) throw new Error("Allow app notifications and the Customer updates channel in Android settings.");
      if (account.current === uid) setMessage("Enabled. Background checks may take 15 minutes or longer.");
    }
  }, [uid, role, syncPhone]);
  useEffect(() => {
    setMessage(""); returning.current = false;
  }, [uid, role]);
  useEffect(() => {
  if (!supported) return;
    let disposed = false;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || !returning.current || disposed) return;
      returning.current = false;
      void finish().catch((error: unknown) => { if (!disposed && account.current === uid) setMessage(error instanceof Error ? error.message : "Please try enabling notifications again."); });
    })).then((handle) => { if (disposed) void handle.remove(); else remove = () => void handle.remove(); }).catch(() => {});
    return () => { disposed = true; remove?.(); };
  }, [supported, finish, uid]);
  useEffect(() => {
    setBackgroundIssue("");
    if (!supported || role !== "customer") return;
    let active = true;
    const refresh = async () => {
      try {
        const status = await BackgroundNotices.status();
        if (!active) return;
        setBackgroundIssue(status.result === "server_update_required" ? "Background alerts need the supplied SQL update applied through Lovable." : status.result === "retrying" ? "Background checks are retrying. Check internet access and the farm service." : status.result === "sign_in_required" ? "Sign in again and enable notifications to restore background access." : "");
      } catch { /* Setup button reports registration failures. */ }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [supported, uid, role]);
  if (!supported) return <p className="text-sm text-muted-foreground">Use the bell for updates. Phone reminders are available in the Android app.</p>;
  return <div className="space-y-3">
    <Button className="h-11 w-full rounded-xl" disabled={busy || loading || !uid || (role !== "owner" && role !== "customer")} onClick={async () => {
      setBusy(true); setMessage("");
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const permission = await LocalNotifications.requestPermissions();
        if (account.current !== uid) return;
        const channel = role === "owner" ? await BackgroundNotices.ownerPermission() : await BackgroundNotices.status();
        if (permission.display !== "granted" || !channel.permission) {
          returning.current = true;
          setMessage("Allow notifications in Android settings, then return to the app.");
          await BackgroundNotices.openNotificationSettings();
          return;
        }
        await finish();
        if (role === "owner" && account.current === uid) {
          const exact = await LocalNotifications.checkExactNotificationSetting();
          if (exact.exact_alarm !== "granted") {
            returning.current = true;
            setMessage("Allow Alarms & reminders, then return to the app.");
            await LocalNotifications.changeExactNotificationSetting();
          }
        }
      } catch (error) { if (account.current === uid) setMessage(error instanceof Error ? error.message : "Could not enable notifications. Please try again."); }
      finally { setBusy(false); }
    }}><Bell className="h-4 w-4" />{busy ? "Enabling notifications..." : "Enable notifications"}</Button>
    {message && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{message}</p>}
    {backgroundIssue && <p role="status" className="text-xs text-destructive">{backgroundIssue}</p>}
    <p className="text-xs text-muted-foreground">Android controls delivery. Reopen the app after a force stop.</p>
  </div>;
}
