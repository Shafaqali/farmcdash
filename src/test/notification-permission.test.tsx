import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificationPermissionControl } from "@/components/NotificationPermissionControl";

const mocks = vi.hoisted(() => ({
  role: "owner", sync: vi.fn(), request: vi.fn(), exact: vi.fn(), change: vi.fn(),
  permission: vi.fn(), settings: vi.fn(), background: vi.fn(), status: vi.fn(),
  resume: undefined as undefined | ((state: { isActive: boolean }) => void),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(async (_event, listener) => { mocks.resume = listener; return { remove: vi.fn() }; }) } }));
vi.mock("@/lib/farm-data", () => ({ useFarm: () => ({ uid: "account", role: mocks.role, loading: false }) }));
vi.mock("@/components/Notifications", () => ({ usePhoneAlerts: () => mocks.sync }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { requestPermissions: mocks.request, checkExactNotificationSetting: mocks.exact, changeExactNotificationSetting: mocks.change } }));
vi.mock("@/lib/background-notices", () => ({ syncBackgroundNotices: mocks.background, BackgroundNotices: { ownerPermission: mocks.permission, openNotificationSettings: mocks.settings, status: mocks.status } }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.role = "owner";
  mocks.request.mockResolvedValue({ display: "granted" });
  mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
  mocks.permission.mockResolvedValue({ permission: true });
  mocks.status.mockResolvedValue({ permission: true, enabled: true });
  mocks.sync.mockResolvedValue(true);
});
afterEach(cleanup);
it("uses one button to enable owner reminders at the advertised hours", async () => {
  render(<NotificationPermissionControl />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(mocks.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Enable notifications" }));
  await screen.findByText(/Vaccines: 9 AM/);
  expect(mocks.sync).toHaveBeenCalledWith(true);
  expect(mocks.background).not.toHaveBeenCalled();
});
it("opens Android settings when denied and resumes setup after returning", async () => {
  mocks.request.mockResolvedValue({ display: "denied" });
  render(<NotificationPermissionControl />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(mocks.settings).toHaveBeenCalledOnce());
  expect(mocks.sync).not.toHaveBeenCalled();
  mocks.resume?.({ isActive: true });
  await screen.findByText(/Enabled. Vaccines/);
});
it("opens exact alarm settings using the same button", async () => {
  mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
  render(<NotificationPermissionControl />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
  expect(screen.getAllByRole("button")).toHaveLength(1);
});
it("reports scheduling errors without claiming reminders are enabled", async () => {
  mocks.sync.mockResolvedValue(false);
  render(<NotificationPermissionControl />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Could not schedule reminders/);
});
it("activates customer background checks without owner alarms", async () => {
  mocks.role = "customer";
  render(<NotificationPermissionControl />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/15 minutes or longer/);
  expect(mocks.background).toHaveBeenCalledWith("account", "customer");
  expect(mocks.sync).not.toHaveBeenCalled();
  expect(mocks.change).not.toHaveBeenCalled();
});
