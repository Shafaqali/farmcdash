import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";

export function PhoneReminderControls({ resync }: { resync: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [exactDenied, setExactDenied] = useState(false);
  if (!Capacitor.isNativePlatform()) return null;
  return <div className="space-y-2 rounded-lg border p-3">
    <p className="text-sm font-medium">Phone reminders</p>
    <p className="text-xs text-muted-foreground">Vaccination and outstanding-payment reminders are scheduled even when the app is closed. Allow notifications in your phone settings.</p>
    <Button variant="outline" className="h-auto min-h-10 whitespace-normal" disabled={busy} onClick={async () => {
      setBusy(true); setStatus("");
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== "granted") { setStatus("Notifications are blocked. Allow them in Android app settings."); return; }
        const exact = await LocalNotifications.checkExactNotificationSetting();
        setExactDenied(exact.exact_alarm !== "granted");
        await resync();
        const pending = await LocalNotifications.getPending();
        const count = pending.notifications.filter((n) => n.id === 1 || n.id === 2 || (n.id >= 1000 && n.id <= 1401)).length;
        setStatus(count ? `${count} phone reminder(s) scheduled.${exact.exact_alarm === "granted" ? "" : " Exact alarm permission is off; reminders may arrive late."}` : "No reminders are scheduled. Check due dates and notification permissions.");
      } catch { setStatus("Could not schedule phone reminders. Check permissions and try again."); }
      finally { setBusy(false); }
    }}>{busy ? "Checking…" : "Enable / refresh phone reminders"}</Button>
    {exactDenied && <Button variant="outline" className="h-auto min-h-10 whitespace-normal" onClick={async () => {
      try { const { LocalNotifications } = await import("@capacitor/local-notifications"); await LocalNotifications.changeExactNotificationSetting(); }
      catch { setStatus("Allow Alarms & reminders in Android app settings."); }
    }}>Allow exact-time reminders</Button>}
    {status && <p role="status" className="text-xs">{status}</p>}
  </div>;
}
