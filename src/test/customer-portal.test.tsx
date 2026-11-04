import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "@/lib/farm-data";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/farm-data", async (original) => ({ ...await original<typeof import("@/lib/farm-data")>(), useFarm: () => ({ uid: "viewer" }) }));
import { loadCustomerPortal } from "@/lib/customer-portal";
import { CustomerAnimalPayments } from "@/components/CustomerAnimalPayments";
const animal = { id: "U01-G0001", userId: "farmer", ownerId: "linked-customer", arrival: "2026-11-01", monthlyCharge: 1000, status: "Active", weights: [], vaccinations: [] } as unknown as Animal;
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("Customer financial access", () => {
  it("requests the authenticated portal without trusting a client customer identifier", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [], customers: [], payments: [] }, error: null });
    await loadCustomerPortal();
    expect(mocks.rpc).toHaveBeenCalledWith("customer_portal");
  });
  it("does not show another animal's finances when portal access is absent", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [], customers: [], payments: [] }, error: null });
    render(<CustomerAnimalPayments animalId="U01-G0001" />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Customer care payments" })).toBeNull();
  });
  it("shows linked animal payment balance without any payment editor", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [animal], customers: [{ id: "linked-customer", name: "Customer", phone: "", village: "" }], payments: [{ id: "receipt", customerId: "linked-customer", animalId: "U01-G0001", periodStart: "2026-11-01", date: "2026-11-01", amount: 400 }] }, error: null });
    render(<CustomerAnimalPayments animalId="U01-G0001" />);
    expect(await screen.findByText("₹600 due")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});