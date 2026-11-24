import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  checkPermissions: vi.fn(), requestPermissions: vi.fn(), createChannel: vi.fn(), getPending: vi.fn(), cancel: vi.fn(),
  getDeliveredNotifications: vi.fn(), removeDeliveredNotifications: vi.fn(), schedule: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: api }));
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  api.getPending.mockResolvedValue({ notifications: [{ id: 1 }, { id: 2 }, { id: 1000 }, { id: 9000 }] });
  api.getDeliveredNotifications.mockResolvedValue({ notifications: [{ id: 1, channelId: "farm" }, { id: 9000, channelId: "other" }] });
  api.checkPermissions.mockResolvedValue({ display: "granted" });
  api.createChannel.mockResolvedValue(undefined);
});
describe("Fresh farm reminders", () => {
  it("schedules vaccine calendar dates at 9 AM and unpaid balances daily at 10 AM", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    await syncPhoneAlerts([{ id: "GOAT-1", species: "Goat", due: "2099-01-02" }], [{ name: "Customer", bal: 500 }]);
    const notices = api.schedule.mock.lastCall?.[0].notifications;
    const dates = notices.filter((n: { schedule: { at?: Date } }) => n.schedule.at).map((n: { schedule: { at: Date } }) => n.schedule.at);
    expect(dates.map((d: Date) => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()])).toEqual([[2099, 0, 1, 9, 0], [2099, 0, 2, 9, 0]]);
    expect(notices.find((n: { id: number }) => n.id === 2).schedule).toEqual({ on: { hour: 10, minute: 0 }, allowWhileIdle: true });
  });
  it("removes completed vaccination alarms while retaining unpaid-customer reminders", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    const due = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const money = [{ name: "Customer", bal: 500 }];
    await syncPhoneAlerts([{ id: "GOAT-1", species: "Goat", due }], money);
    await syncPhoneAlerts([], money);
    expect(api.cancel).toHaveBeenCalledTimes(2);
    expect(api.removeDeliveredNotifications).toHaveBeenCalledTimes(2);
    const latest = api.schedule.mock.lastCall?.[0].notifications;
    expect(latest).toHaveLength(1);
    expect(latest[0].title).toContain("Outstanding payments");
  });
  it("clears old vaccine and payment reminders when farm data is empty, without permission prompts", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    await syncPhoneAlerts([], []);
    expect(api.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 2 }, { id: 1000 }] });
    expect(api.removeDeliveredNotifications).toHaveBeenCalledWith({ notifications: [{ id: 1, channelId: "farm" }] });
    expect(api.requestPermissions).not.toHaveBeenCalled(); expect(api.schedule).not.toHaveBeenCalled();
  });
  it("clears queued owner reminders after sign out instead of leaking them to the next account", async () => {
    const { syncPhoneAlerts, clearPhoneAlerts } = await import("@/lib/local-alerts");
    await Promise.all([syncPhoneAlerts([], [{ name: "Owner", bal: 500 }]), clearPhoneAlerts()]);
    expect(api.schedule).toHaveBeenCalledOnce();
    expect(api.cancel).toHaveBeenCalledTimes(2);
    expect(api.cancel.mock.invocationCallOrder[1]).toBeGreaterThan(api.schedule.mock.invocationCallOrder[0] ?? Infinity);
  });
  it("retries the same reminder after permission was refused", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    api.checkPermissions.mockResolvedValueOnce({ display: "denied" });
    api.requestPermissions.mockResolvedValueOnce({ display: "denied" });
    await syncPhoneAlerts([], [{ name: "Owner", bal: 500 }]);
    await syncPhoneAlerts([], [{ name: "Owner", bal: 500 }]);
    expect(api.schedule).toHaveBeenCalledOnce();
  });
  it("rebuilds lost Android alarms on foreground refresh with unchanged data", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    const money = [{ name: "Owner", bal: 500 }];
    await syncPhoneAlerts([], money);
    await syncPhoneAlerts([], money);
    expect(api.schedule).toHaveBeenCalledOnce();
    await syncPhoneAlerts([], money, true);
    expect(api.schedule).toHaveBeenCalledTimes(2);
  });
  it("rechecks notification permission even when the data signature matches", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    const money = [{ name: "Owner", bal: 500 }];
    await syncPhoneAlerts([], money);
    api.checkPermissions.mockResolvedValueOnce({ display: "denied" });
    api.requestPermissions.mockResolvedValueOnce({ display: "denied" });
    await syncPhoneAlerts([], money);
    await syncPhoneAlerts([], money);
    expect(api.requestPermissions).not.toHaveBeenCalled();
    expect(api.schedule).toHaveBeenCalledTimes(2);
  });
  it("keeps a failed channel setup retryable", async () => {
    const { syncPhoneAlerts } = await import("@/lib/local-alerts");
    api.createChannel.mockRejectedValueOnce(new Error("channel unavailable"));
    await syncPhoneAlerts([], [{ name: "Owner", bal: 500 }]);
    await syncPhoneAlerts([], [{ name: "Owner", bal: 500 }]);
    expect(api.schedule).toHaveBeenCalledOnce();
  });
});
