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
    expect(api.requestPermissions).toHaveBeenCalledOnce();
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
