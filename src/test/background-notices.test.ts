import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  native: { bindAccount: vi.fn(), prepare: vi.fn(), activate: vi.fn(), stop: vi.fn() },
  getUser: vi.fn(), rpc: vi.fn(), requestPermissions: vi.fn(), platform: "android", nativePlatform: true,
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.nativePlatform, getPlatform: () => mocks.platform },
  registerPlugin: () => mocks.native,
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { requestPermissions: mocks.requestPermissions } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } }));
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  mocks.nativePlatform = true; mocks.platform = "android";
  vi.stubEnv("VITE_SUPABASE_URL", "https://farm.example.com");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key");
  mocks.requestPermissions.mockResolvedValue({ display: "granted" });
  mocks.native.prepare.mockResolvedValue({ device: "device-a", secret: "secret-a" });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "customer-a" } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});
describe("Android background notice account lifecycle", () => {
  it("registers only the verified customer and passes no Auth tokens to native storage", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    await syncBackgroundNotices("customer-a", "customer");
    expect(mocks.rpc).toHaveBeenCalledWith("register_background_device", { _device: "device-a", _secret: "secret-a" });
    expect(mocks.native.activate).toHaveBeenCalledWith({ device: "device-a", url: "https://farm.example.com", key: "public-key" });
  });
  it("clears customer work for owner and signed-out accounts", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    await syncBackgroundNotices("owner", "owner");
    await syncBackgroundNotices(null, null);
    expect(mocks.native.stop).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("never activates when the backend registration fails, and permits retry", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    mocks.rpc.mockResolvedValueOnce({ error: { message: "unavailable" } });
    await expect(syncBackgroundNotices("customer-a", "customer")).rejects.toThrow();
    expect(mocks.native.activate).not.toHaveBeenCalled();
    await syncBackgroundNotices("customer-a", "customer");
    expect(mocks.native.activate).toHaveBeenCalledOnce();
  });
  it("does not register an account whose server-verified identity changed", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    await expect(syncBackgroundNotices("customer-a", "customer")).rejects.toThrow("Sign in again");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.native.activate).not.toHaveBeenCalled();
  });
  it("stops immediately at sign-out and invalidates a registration still in flight", async () => {
    const { syncBackgroundNotices, stopBackgroundNotices } = await import("@/lib/background-notices");
    let finish!: (value: { error: null }) => void;
    mocks.rpc.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const pending = syncBackgroundNotices("customer-a", "customer");
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    await stopBackgroundNotices();
    expect(mocks.native.stop).toHaveBeenCalledOnce();
    finish({ error: null }); await pending;
    expect(mocks.native.activate).not.toHaveBeenCalled();
  });
  it("does not register without notification permission", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    mocks.requestPermissions.mockResolvedValue({ display: "denied" });
    await expect(syncBackgroundNotices("customer-a", "customer")).rejects.toThrow("Allow notifications");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("leaves website behavior unchanged", async () => {
    const { syncBackgroundNotices } = await import("@/lib/background-notices");
    mocks.nativePlatform = false;
    await syncBackgroundNotices("customer-a", "customer");
    expect(mocks.native.bindAccount).not.toHaveBeenCalled();
  });
});
