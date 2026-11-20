import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "@/lib/farm-data";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signPhotos: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, storage: { from: () => ({ createSignedUrls: mocks.signPhotos }) } } }));
vi.mock("@/lib/farm-data", async (original) => ({ ...await original<typeof import("@/lib/farm-data")>(), useFarm: () => ({ uid: "viewer" }) }));
import { connectCustomer, customerInvitationUrl, loadCustomerPortal, pendingCustomerInvitation } from "@/lib/customer-portal";
import { CustomerAnimalPayments } from "@/components/CustomerAnimalPayments";
const animal = { id: "U01-G0001", userId: "farmer", ownerId: "linked-customer", arrival: "2026-11-01", monthlyCharge: 1000, status: "Active", weights: [], vaccinations: [] } as unknown as Animal;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-04T00:00:00Z")); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); window.sessionStorage.clear(); window.history.replaceState(null, "", "/"); });
describe("Customer financial access", () => {
  it("keeps an invitation code out of request URLs and retains it until connection", async () => {
    const code = "a".repeat(64);
    const url = new URL(customerInvitationUrl("https://farmcdash.lovable.app", code, "customer@example.com"));
    expect(url.pathname).toBe("/my-animals");
    expect(url.search).toBe("");
    window.history.replaceState(null, "", `/my-animals${url.hash}`);
    expect(pendingCustomerInvitation()).toEqual({ code, email: "customer@example.com" });
    expect(window.location.hash).toBe("");
    mocks.rpc.mockResolvedValue({ error: null });
    await connectCustomer(` ${code} `);
    expect(mocks.rpc).toHaveBeenCalledWith("connect_customer", { _code: code });
    expect(pendingCustomerInvitation()).toBeNull();
  });
  it("keeps the invitation available after a rejected connection", async () => {
    const code = "b".repeat(64);
    window.history.replaceState(null, "", `/my-animals#code=${code}&email=customer%40example.com`);
    pendingCustomerInvitation();
    mocks.rpc.mockResolvedValue({ error: { message: "Invalid or expired code for this account" } });
    await expect(connectCustomer(code)).rejects.toThrow("different email");
    expect(pendingCustomerInvitation()?.code).toBe(code);
  });
  it("requests the authenticated portal without trusting a client customer identifier", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [], customers: [], payments: [] }, error: null });
    await loadCustomerPortal();
    expect(mocks.rpc).toHaveBeenCalledWith("customer_portal");
  });
  it("signs only photo paths belonging to animals returned by the private portal", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { animals: [animal], customers: [], payments: [] }, error: null }).mockResolvedValueOnce({ data: [
      { animal_id: animal.id, photo_path: `${animal.id}/photo.jpg` },
      { animal_id: "foreign", photo_path: "foreign/private.jpg" },
      { animal_id: animal.id, photo_path: "foreign/wrong-folder.jpg" },
    ], error: null });
    mocks.signPhotos.mockResolvedValue({ data: [{ path: `${animal.id}/photo.jpg`, signedUrl: "https://photos.example/short-lived" }], error: null });
    const result = await loadCustomerPortal();
    expect(mocks.signPhotos).toHaveBeenCalledWith([`${animal.id}/photo.jpg`], 600);
    expect(result.animals[0]?.photoUrl).toBe("https://photos.example/short-lived");
    expect(result.payments).toEqual([]);
  });
  it("keeps care records available with a clear warning when photo access fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { animals: [animal], customers: [], payments: [] }, error: null }).mockResolvedValueOnce({ error: { message: "photo RPC unavailable" } });
    const result = await loadCustomerPortal();
    expect(result.animals).toEqual([animal]);
    expect(result.photoWarning).toContain("temporarily unavailable");
    expect(mocks.signPhotos).not.toHaveBeenCalled();
  });
  it("does not show another animal's finances when portal access is absent", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [], customers: [], payments: [] }, error: null });
    render(<CustomerAnimalPayments animalId="U01-G0001" />);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Customer care payments" })).toBeNull();
  });
  it("uses server animal-period statuses without exposing receipt amounts", async () => {
    mocks.rpc.mockResolvedValue({ data: { animals: [animal], customers: [{ id: "linked-customer", name: "Customer", phone: "", village: "" }], payments: [], paymentStatuses: [{ animalId: "U01-G0001", periodStart: "2026-11-01", status: "Payment due" }] }, error: null });
    render(<CustomerAnimalPayments animalId="U01-G0001" />);
    expect(await screen.findByText("Payment due")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
