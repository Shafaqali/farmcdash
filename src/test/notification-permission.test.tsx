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
  mocks.request.mockImplementation(async () => { mocks.permission.mockResolvedValue({ permission: true, sound: true }); return { display: "granted" }; });
  mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
  mocks.permission.mockResolvedValue({ permission: false, sound: true });
  mocks.status.mockResolvedValue({ permission: true, enabled: false, sound: true });
  mocks.background.mockImplementation(async () => { mocks.status.mockResolvedValue({ permission: true, enabled: true, sound: true }); });
  mocks.sync.mockResolvedValue(true);
});
afterEach(cleanup);
it("enables reminders and replaces the one button with verified enabled status", async () => {
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await screen.findByRole("button", { name: "Notifications enabled" });
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(mocks.sync).toHaveBeenCalledWith(true);
});
it("restores enabled status when Settings is reopened without requesting permission again", async () => {
  mocks.permission.mockResolvedValue({ permission: true, sound: true });
  const view = render(<NotificationPermissionControl />);
  await screen.findByRole("button", { name: "Notifications enabled" });
  view.unmount();
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Notifications enabled" }));
  await waitFor(() => expect(mocks.settings).toHaveBeenCalledOnce());
  expect(mocks.request).not.toHaveBeenCalled();
});
it("opens Android settings when denied and completes after returning", async () => {
  mocks.request.mockResolvedValue({ display: "denied" });
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await waitFor(() => expect(mocks.settings).toHaveBeenCalledOnce());
  expect(mocks.sync).not.toHaveBeenCalled();
  mocks.permission.mockResolvedValue({ permission: true, sound: true });
  mocks.resume?.({ isActive: true });
  await screen.findByRole("button", { name: "Notifications enabled" });
});
it("opens exact alarm settings using the same button", async () => {
  mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce());
  expect(screen.queryByRole("button", { name: "Notifications enabled" })).not.toBeInTheDocument();
});
it("keeps failed scheduling retryable without showing enabled", async () => {
  mocks.sync.mockResolvedValue(false);
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await screen.findByText(/Could not schedule reminders/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Enable notifications" })).not.toBeDisabled());
});
it("activates customer background checks without owner alarms", async () => {
  mocks.role = "customer";
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await screen.findByRole("button", { name: "Notifications enabled" });
  expect(mocks.background).toHaveBeenCalledWith("account", "customer");
  expect(mocks.sync).not.toHaveBeenCalled();
});
it("reflects a permission revoked in Android settings on foreground return", async () => {
  mocks.permission.mockResolvedValue({ permission: true, sound: true });
  render(<NotificationPermissionControl />);
  await screen.findByRole("button", { name: "Notifications enabled" });
  mocks.permission.mockResolvedValue({ permission: false });
  mocks.resume?.({ isActive: true });
  await screen.findByRole("button", { name: "Enable notifications" });
});
it("shows silent channel status without pretending to enable sound", async () => {
  mocks.permission.mockResolvedValue({ permission: true, sound: false });
  render(<NotificationPermissionControl />);
  await screen.findByText(/Sound is off in Android settings/);
});

it("does not show enabled when the background worker reports missing server setup", async () => {
  mocks.role = "customer";
  mocks.status.mockResolvedValue({ permission: true, enabled: true, result: "server_update_required" });
  mocks.background.mockResolvedValue(undefined);
  render(<NotificationPermissionControl />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable notifications" }));
  await screen.findByText(/Apply the supplied SQL update/);
  expect(screen.queryByRole("button", { name: "Notifications enabled" })).not.toBeInTheDocument();
});

it("identifies restricted background delivery and shows the last check",async()=>{
 mocks.role="customer";mocks.status.mockResolvedValue({permission:true,enabled:true,backgroundRestricted:true,lastCheck:1730000000000,result:"ok"});
 render(<NotificationPermissionControl/>);
 await screen.findByText(/Android has restricted background activity/);
 expect(screen.getByText(/Last background check:/)).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Open app battery settings"})).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Notifications enabled"})).not.toBeInTheDocument();
});
