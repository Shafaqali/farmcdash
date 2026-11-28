import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CustomerNotifications } from "@/components/CustomerNotifications";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), remove: vi.fn(), sound: vi.fn(), onChange: undefined as undefined | (() => void) }));
vi.mock("@/lib/farm-data", () => ({ useFarm: () => ({ uid: "customer-a" }) }));
vi.mock("@/lib/notice-sound", () => ({ playCustomerNoticeSound: mocks.sound }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@capacitor/app", () => ({ App: { addListener: async () => ({ remove: vi.fn() }) } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ order: () => ({ limit: mocks.fetch }) }) }),
  channel: () => { const channel = { on: (_event: string, _filter: unknown, listener: () => void) => { mocks.onChange = listener; return channel; }, subscribe: () => channel }; return channel; },
  removeChannel: mocks.remove,
} }));
beforeEach(() => { vi.clearAllMocks(); mocks.fetch.mockResolvedValue({ data: [], error: null }); });
afterEach(cleanup);
it("refreshes on a database event, alerts once for new records and removes its subscription", async () => {
  const event = vi.fn(); window.addEventListener("farm-customer-update", event);
  const view = render(<CustomerNotifications />);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  await act(async () => {});
  mocks.fetch.mockResolvedValue({ data: [{ id: "new", title: "Health update", kind: "animal", created_at: "2026-11-27T10:00:00Z", animal_id: "GOAT-1", read_at: null }], error: null });
  await act(async () => mocks.onChange?.());
  await waitFor(() => expect(mocks.sound).toHaveBeenCalledOnce());
  expect(mocks.sound).toHaveBeenCalledWith("customer-a");
  expect(event.mock.calls[0]?.[0].detail.uid).toBe("customer-a");
  await act(async () => mocks.onChange?.());
  expect(mocks.sound).toHaveBeenCalledOnce();
  view.unmount(); expect(mocks.remove).toHaveBeenCalledOnce();
  window.removeEventListener("farm-customer-update", event);
});
it("queues a database change arriving during the initial request instead of losing it", async () => {
  let finish!: (value: unknown) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<CustomerNotifications />);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  act(() => mocks.onChange?.());
  await act(async () => finish({ data: [], error: null }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
});
