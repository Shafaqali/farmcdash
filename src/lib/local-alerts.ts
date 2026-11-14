import { Capacitor } from "@capacitor/core";

type VaccineItem = { id: string; species: string; due: string };
type MoneyItem = { name: string; bal: number };

const at = (dateStr: string, hour: number, offsetDays = 0) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

let lastSig = "";
let queue = Promise.resolve();

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
export function syncPhoneAlerts(vaccines: VaccineItem[], money: MoneyItem[]) {
  queue = queue.then(() => schedulePhoneAlerts(vaccines, money));
  return queue;
}

async function schedulePhoneAlerts(vaccines: VaccineItem[], money: MoneyItem[]) {
  if (!Capacitor.isNativePlatform()) return;
  const sig = JSON.stringify([vaccines, money]);
  if (sig === lastSig) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (!vaccines.length && !money.length) {
      await clearFarmNotifications();
      lastSig = sig;
      return;
    }
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const r = await LocalNotifications.requestPermissions();
      if (r.display !== "granted") return;
    }
    await LocalNotifications.createChannel({ id: "farm", name: "Farm alerts", importance: 5, vibration: true }).catch(() => {});
    await clearFarmNotifications();

    const now = Date.now();
    const list: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
    let id = 1000;
    const overdue: string[] = [];
    for (const v of vaccines) {
      const before = at(v.due, 9, -1);
      const day = at(v.due, 9);
      if (before.getTime() > now) list.push({ id: id++, channelId: "farm", title: "Kal vaccine due hai", body: `${v.id} (${v.species}) ko kal vaccine dena hai`, schedule: { at: before, allowWhileIdle: true } });
      if (day.getTime() > now) list.push({ id: id++, channelId: "farm", title: "Aaj vaccine dena hai", body: `${v.id} (${v.species}) ka vaccine aaj due hai`, schedule: { at: day, allowWhileIdle: true } });
      else overdue.push(v.id);
      if (id > 1400) break;
    }
    if (overdue.length) {
      list.push({ id: 1, channelId: "farm", title: "Vaccine baki hai", body: `${overdue.length} animal ka vaccine late hai: ${overdue.slice(0, 5).join(", ")}`, schedule: { on: { hour: 9, minute: 0 }, allowWhileIdle: true } });
    }
    if (money.length) {
      const total = money.reduce((s, m) => s + m.bal, 0);
      list.push({ id: 2, channelId: "farm", title: "Paisa baki hai", body: `${money.length} customer ka kul ₹${total.toLocaleString("en-IN")} baki hai — ${money.slice(0, 3).map((m) => m.name).join(", ")}`, schedule: { on: { hour: 10, minute: 0 }, allowWhileIdle: true } });
    }
    if (list.length) await LocalNotifications.schedule({ notifications: list });
    lastSig = sig;
  } catch (e) {
    console.warn("phone alerts failed", e);
  }
}
