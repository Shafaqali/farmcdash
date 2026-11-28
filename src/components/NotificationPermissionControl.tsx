import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarm } from "@/lib/farm-data";
import { BackgroundNotices, syncBackgroundNotices } from "@/lib/background-notices";
import { usePhoneAlerts } from "@/components/Notifications";

export function NotificationPermissionControl() {
  const { uid, role, loading } = useFarm();
  const syncPhone = usePhoneAlerts(false);
  const [readiness, setReadiness] = useState({ uid: "", ready: false, sound: true, checked: false });
  const readRevision = useRef(0);
  const setupFailure = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backgroundIssue, setBackgroundIssue] = useState("");
  const [lastCheck, setLastCheck] = useState(0);
  const [backgroundRestricted, setBackgroundRestricted] = useState(false);
  const account = useRef(uid);
  account.current = uid;
  const returning = useRef(false);
  const supported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  const refreshStatus = useCallback(async () => {
    const revision = ++readRevision.current;
    if (!supported || !uid) return;
    try {
      let ready = false, sound = true;
      if (role === "owner") {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const [permission, exact] = await Promise.all([BackgroundNotices.ownerPermission(), LocalNotifications.checkExactNotificationSetting()]);
        ready = permission.permission && exact.exact_alarm === "granted";
        sound = permission.sound !== false;
      } else if (role === "customer") {
        const status = await BackgroundNotices.status();
        ready = status.enabled && status.permission && !status.backgroundRestricted && status.result !== "sign_in_required" && status.result !== "server_update_required";
        sound = status.sound !== false;
      }
      if (account.current === uid && revision === readRevision.current) setReadiness({ uid, ready: ready && setupFailure.current !== uid, sound, checked: true });
    } catch {
      if (account.current === uid && revision === readRevision.current) setReadiness({ uid, ready: false, sound: true, checked: true });
    }
  }, [supported, uid, role]);
  const ready = readiness.uid === uid && readiness.ready;
  const checking = readiness.uid !== uid || !readiness.checked;
  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 60000);
    return () => { ++readRevision.current; window.clearInterval(timer); };
  }, [refreshStatus]);
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
      if (status.backgroundRestricted) throw new Error("Allow unrestricted background battery use in Android app settings, then try again.");
      if (status.result === "server_update_required") throw new Error("Apply the supplied SQL update through Lovable to enable background alerts.");
      if (status.result === "sign_in_required") throw new Error("Sign in again to restore background alerts.");
      if (account.current === uid) setMessage("Enabled. Background checks may take 15 minutes or longer.");
    }
  }, [uid, role, syncPhone]);
  useEffect(() => {
    setMessage(""); returning.current = false; setupFailure.current = null;
  }, [uid, role]);
  useEffect(() => {
  if (!supported) return;
    let disposed = false;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || disposed) return;
      if (!returning.current) { void refreshStatus(); return; }
      returning.current = false;
      void finish().catch((error: unknown) => { if (!disposed && account.current === uid) setMessage(error instanceof Error ? error.message : "Please try enabling notifications again."); }).finally(() => { if (!disposed) void refreshStatus(); });
    })).then((handle) => { if (disposed) void handle.remove(); else remove = () => void handle.remove(); }).catch(() => {});
    return () => { disposed = true; remove?.(); };
  }, [supported, finish, uid, refreshStatus]);
  useEffect(() => {
    setBackgroundIssue(""); setLastCheck(0); setBackgroundRestricted(false);
    if (!supported || role !== "customer") return;
    let active = true;
    const refresh = async () => {
      try {
        const status = await BackgroundNotices.status();
        if (!active) return;
        setLastCheck(status.lastCheck || 0); setBackgroundRestricted(status.backgroundRestricted === true);
        setBackgroundIssue(status.result === "server_update_required" ? "Background alerts need the supplied SQL update applied through Lovable." : status.result === "retrying" ? "Background checks are retrying. Check internet access and the farm service." : status.result === "sign_in_required" ? "Sign in again and enable notifications to restore background access." : "");
      } catch { /* Setup button reports registration failures. */ }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [supported, uid, role]);
  if (!supported) return <p className="text-sm text-muted-foreground">Use the bell for updates. Phone reminders are available in the Android app.</p>;
  return <div className="space-y-3">
    <Button className="h-11 w-full rounded-xl" variant={ready ? "outline" : "default"} disabled={busy || checking || loading || !uid || (role !== "owner" && role !== "customer")} onClick={async () => {
      if (ready) {
        returning.current = false;
        try { await BackgroundNotices.openNotificationSettings(); } catch { setMessage("Open Android app settings to change notification sound."); }
        return;
      }
      setupFailure.current = null;
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
      } catch (error) { if (account.current === uid) { setupFailure.current = uid; setMessage(error instanceof Error ? error.message : "Could not enable notifications. Please try again."); } }
      finally { await refreshStatus(); setBusy(false); }
    }}><BellRing className="h-4 w-4" />{checking ? "Checking notifications..." : busy ? "Enabling notifications..." : ready ? "Notifications enabled" : "Enable notifications"}</Button>
    {ready && <p className="text-xs text-muted-foreground">{readiness.sound ? "Notification tone enabled. Tap above to manage notifications." : "Sound is off in Android settings. Tap above to turn it on."}</p>}
    {message && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{message}</p>}
    {supported && role === "customer" && <p className="text-xs text-muted-foreground">{lastCheck ? `Last background check: ${new Date(lastCheck).toLocaleString("en-IN")}` : "Waiting for the first background check."}</p>}
    {backgroundRestricted && <div className="space-y-2 rounded-lg border border-destructive/20 p-3"><p className="text-xs text-destructive">Android has restricted background activity. In app settings, open Battery and allow unrestricted background use.</p><Button size="sm" variant="outline" onClick={() => void BackgroundNotices.openBackgroundSettings().catch(() => setMessage("Open Android app settings, then Battery, and allow background use."))}>Open app battery settings</Button></div>}
    {backgroundIssue && <p role="status" className="text-xs text-destructive">{backgroundIssue}</p>}
    <p className="text-xs text-muted-foreground">Android controls delivery. Reopen the app after a force stop.</p>
  </div>;
}
