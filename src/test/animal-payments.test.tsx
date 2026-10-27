import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimalPayments } from "@/components/AnimalPayments";

const store = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/lib/farm-data", async (original) => ({ ...await original<typeof import("@/lib/farm-data")>(), useFarm: () => store.value }));
vi.mock("@/components/CustomerPayments", () => ({ CustomerPayments: () => null }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
afterEach(cleanup);

describe("Scanned animal payment privacy", () => {
  it("does not render financial details for another user's scanned animal", () => {
    store.value = { uid: "user-two", animals: [], allAnimals: [{ id: "U01-G0001", userId: "user-one", monthlyCharge: 500 }], customers: [], payments: [] };
    const { container } = render(<AnimalPayments animalId="U01-G0001" />);
    expect(container.childElementCount).toBe(0);
  });
  it("rejects an animal belonging to another user even if accidentally included in the private list", () => {
    store.value = { uid: "user-two", animals: [{ id: "U01-G0001", userId: "user-one", ownerId: "customer-one", monthlyCharge: 500 }], customers: [{ id: "customer-one", name: "Private owner" }], payments: [] };
    render(<AnimalPayments animalId="U01-G0001" />);
    expect(screen.queryByRole("region", { name: "Animal care payments" })).toBeNull();
  });
});