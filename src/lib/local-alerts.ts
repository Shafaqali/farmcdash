import { notificationPresentation } from "@/lib/notification-presentation";
import { Capacitor } from "@capacitor/core";

type VaccineItem = { id: string; species: string; due: string };
type MoneyItem = { name: string; bal: number };

const at = (dateStr: string, hour: number, offsetDays = 0) => {
  const [year = NaN, month = NaN, day = NaN] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day + offsetDays, hour, 0, 0, 0);
};

let lastSig = "";
let queue: Promise<unknown> = Promise.resolve();

async function clearFarmNotifications() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const pending = await LocalNotifications.getPending();
  const farm = pending.notifications.filter((n) => n.id === 1 || n.id === 2 || (n.id >= 1000 && n.id <= 1401));
  if (farm.length) await LocalNotifications.cancel({ notifications: farm.map(({ id }) => ({ id })) });
  const delivered = await LocalNotifications.getDeliveredNotifications();
  const notices = delivered.notifications.filter((n) => n.id === 1 || n.id === 2 || (n.id >= 1000 && n.id <= 1401));
  if (notices.length) await LocalNotifications.removeDeliveredNotifications({ notifications: notices });
}

export function clearPhoneAlerts() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  queue = queue.then(async () => { await clearFarmNotifications(); lastSig = ""; }).catch((e) => { console.warn("phone alerts failed", e); });
  return queue;
}

/** Schedules phone notifications that fire even when the app is closed (Android only). */
export function syncPhoneAlerts(vaccines: VaccineItem[], money: MoneyItem[], force = false) {
  const task = queue.catch(() => {}).then(() => schedulePhoneAlerts(vaccines, money, force));
  queue = task;
  return task;
}

async function schedulePhoneAlerts(vaccines: VaccineItem[], money: MoneyItem[], force: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  const sig = JSON.stringify([new Date().toDateString(), vaccines, money]);
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (!vaccines.length && !money.length) {
      await clearFarmNotifications();
      lastSig = sig;
      return;
    }
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") { lastSig = ""; return false; }
    // Android can remove alarms when exact-alarm permission is changed. Never
    // trust a previous JS signature after returning from Settings/background.
    if (sig === lastSig && !force) return true;
    await LocalNotifications.createChannel({ id: "farm", name: "Farm alerts", importance: 5, vibration: true });
    await clearFarmNotifications();

    const now = Date.now();
    const list: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
    let id = 1000;
    const overdue: string[] = [];
    for (const v of vaccines) {
      const before = at(v.due, 9, -1);
      const day = at(v.due, 9);
      if (before.getTime() > now) list.push({ id: id++, channelId: "farm", title: "Vaccination due tomorrow", body: `${v.id} (${v.species}) needs a vaccination tomorrow`, schedule: { at: before, allowWhileIdle: true } });
      if (day.getTime() > now) list.push({ id: id++, channelId: "farm", title: "Vaccination due today", body: `${v.id} (${v.species}) needs a vaccination today`, schedule: { at: day, allowWhileIdle: true } });
      else overdue.push(v.id);
      if (id > 1400) break;
    }
    if (overdue.length) {
      list.push({ id: 1, channelId: "farm", title: "Pending vaccinations", body: `${overdue.length} animal(s) need vaccination: ${overdue.slice(0, 5).join(", ")}`, schedule: { on: { hour: 9, minute: 0 }, allowWhileIdle: true } });
    }
    if (money.length) {
      const total = money.reduce((s, m) => s + m.bal, 0);
      list.push({ id: 2, channelId: "farm", title: "Outstanding payments", body: `${money.length} customer(s) owe a total of ₹${total.toLocaleString("en-IN")} — ${money.slice(0, 3).map((m) => m.name).join(", ")}`, schedule: { on: { hour: 10, minute: 0 }, allowWhileIdle: true } });
    }
    if (list.length) await LocalNotifications.schedule({ notifications: list.map(notice => ({ ...notice, title: `${notificationPresentation(notice.title).emoji} ${notice.title}`, smallIcon: "ic_stat_farm", largeIcon: "farm_notice_logo" })) });
    lastSig = sig;
    return true;
  } catch (e) {
    lastSig = "";
    console.warn("phone alerts failed", e);
    return false;
  }
}
