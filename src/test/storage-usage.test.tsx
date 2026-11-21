import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatBytes } from "@/lib/storage-usage";
const mocks = vi.hoisted(() => ({ account: { uid: "owner-a", role: "owner" }, rpc: vi.fn() }));
vi.mock("@/lib/farm-data", () => ({ useFarm: () => mocks.account }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
import { StorageUsageSettings } from "@/components/StorageUsageSettings";
const usage = (photo_bytes: number) => ({ data: { photo_bytes, photo_count: 2, record_bytes: 512, record_count: 10, unknown_photo_sizes: 0, checked_at: "2026-11-21T10:00:00Z", breakdown: [] }, error: null });
describe("farm storage usage", () => {
  it("formats empty, large and unavailable byte counts", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(-1)).toBe("Unavailable");
  });
  it("keeps slow results from a previous owner out of the current account", async () => {
    mocks.account = { uid: "owner-a", role: "owner" };
    let resolveOld: ((value: ReturnType<typeof usage>) => void) | undefined;
    mocks.rpc.mockReset().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(usage(2097152));
    const view = render(<StorageUsageSettings />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    mocks.account = { uid: "owner-b", role: "owner" };
    view.rerender(<StorageUsageSettings />);
    expect(await screen.findByText("2 MB")).toBeInTheDocument();
    await act(async () => { if (!resolveOld) throw new Error("Missing pending request"); resolveOld(usage(9437184)); });
    expect(screen.getByText("2 MB")).toBeInTheDocument();
    expect(screen.queryByText("9 MB")).not.toBeInTheDocument();
    expect(screen.getByText("Cloud plan capacity: unavailable in the app")).toBeInTheDocument();
  });
  it("does not query farm usage for customer accounts", () => {
    mocks.account = { uid: "customer", role: "customer" };
    mocks.rpc.mockReset();
    render(<StorageUsageSettings />);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Storage usage" })).not.toBeInTheDocument();
  });
});
