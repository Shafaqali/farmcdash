import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useFarm } from "@/lib/farm-data";
import { BackgroundNotices, syncBackgroundNotices, type BackgroundNoticeStatus } from "@/lib/background-notices";
import { Button } from "@/components/ui/button";

export function BackgroundNoticeControls() {
  const { uid, role } = useFarm();
  const [status, setStatus] = useState<BackgroundNoticeStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  useEffect(() => {
    if (!supported) return;
    let active = true;
    const refresh = () => BackgroundNotices.status().then((value) => { if (active) setStatus(value); }).catch(() => { if (active) setError("Background status is unavailable."); });
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [supported, uid]);
  if (!supported) return null;
  return <div className="space-y-2 rounded-lg border p-3">
    <p className="text-sm font-semibold">Alerts when the app is closed</p>
    <p className="text-xs text-muted-foreground">Background checks provide health, vaccination, growth and outstanding-payment updates. Android checks may take 15 minutes or longer. Internet access and notification permission are required.</p>
    <p className="text-xs" role="status">{status?.enabled ? "Background checking enabled" : "Background checking not enabled"}{status?.lastCheck ? ` · Last check: ${new Date(status.lastCheck).toLocaleString("en-IN")}` : ""}</p>
    {status?.result === "retrying" && <p className="text-xs">The connection or service is unavailable. Checks will retry automatically.</p>}
    {status?.result === "sign_in_required" && <p className="text-xs">Background access has expired. Sign in and enable alerts again.</p>}
    {status && !status.permission && <p className="text-xs">Allow notifications in Android app settings.</p>}
    <Button variant="outline" disabled={busy} className="h-auto min-h-10 whitespace-normal" onClick={async () => {
      setBusy(true); setError("");
      try { await syncBackgroundNotices(uid, role); setStatus(await BackgroundNotices.status()); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not enable background checking."); }
      finally { setBusy(false); }
    }}>{busy ? "Enabling…" : "Enable / check background alerts"}</Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Allow background activity in battery settings. After force-stopping the app, open it again to resume checks.</p>
  </div>;
}
