import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export type BackgroundNoticeStatus = { enabled: boolean; permission: boolean; sound?: boolean; backgroundRestricted?: boolean; lastCheck: number; result: string };
interface BackgroundNoticesPlugin {
  bindAccount(options: { uid: string }): Promise<void>;
  prepare(options: { uid: string }): Promise<{ device: string; secret: string }>;
  activate(options: { device: string; url: string; key: string }): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<BackgroundNoticeStatus>;
  checkNow(): Promise<void>;
  openBackgroundSettings(): Promise<void>;
  playForegroundNotice(options: { uid: string }): Promise<void>;
  openNotificationSettings(): Promise<void>;
  ownerPermission(): Promise<{ permission: boolean; sound?: boolean }>;
}
export const BackgroundNotices = registerPlugin<BackgroundNoticesPlugin>("BackgroundNotices");
const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
let revision = 0;
let queue: Promise<void> = Promise.resolve();

/** Serialized lifecycle changes prevent a delayed registration activating an old account. */
export function syncBackgroundNotices(uid: string | null, role: string | null) {
  if (!isAndroid()) return Promise.resolve();
  const current = ++revision;
  const task = queue.catch(() => {}).then(async () => {
    if (current !== revision) return;
    await BackgroundNotices.bindAccount({ uid: uid ?? "" });
    if (current !== revision) return;
    if (!uid || role === "owner") { await BackgroundNotices.stop(); return; }
    if (role !== "customer") return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") throw new Error("Allow notifications in Android app settings.");
    if (current !== revision) return;
    const credential = await BackgroundNotices.prepare({ uid });
    if (current !== revision) { await BackgroundNotices.stop(); return; }
    const { data, error: identityError } = await supabase.auth.getUser();
    if (identityError || data.user?.id !== uid) {
      await BackgroundNotices.stop();
      throw new Error("Sign in again to enable background alerts.");
    }
    if (current !== revision) return;
    const { error } = await supabase.rpc("register_background_device", { _device: credential.device, _secret: credential.secret });
    if (error) throw new Error("Could not enable background alerts. Check your connection and ensure the farm service is up to date.");
    if (current !== revision) { await BackgroundNotices.stop(); return; }
    const { error: serviceError } = await supabase.rpc("poll_customer_notifications_v2", { _device: credential.device, _secret: credential.secret, _include_routine: false });
    if (current !== revision) { await BackgroundNotices.stop(); return; }
    if (serviceError) {
      if (serviceError.code === "PGRST202" || serviceError.code === "28000") await BackgroundNotices.stop();
      throw new Error(serviceError.code === "PGRST202" ? "Apply the supplied SQL update through Lovable to enable background alerts." : "Background service could not be verified. Check your connection and sign in again if needed.");
    }
    const url = import.meta.env['VITE_SUPABASE_URL'];
    const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error("Background service configuration missing.");
    await BackgroundNotices.activate({ device: credential.device, url, key });
    if (current !== revision) await BackgroundNotices.stop();
  });
  queue = task;
  return task;
}

export async function stopBackgroundNotices() {
  ++revision;
  if (isAndroid()) await BackgroundNotices.stop();
}

export async function signOutFarmAccount() {
  await stopBackgroundNotices();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
