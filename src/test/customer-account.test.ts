import { describe, expect, it } from "vitest";
import { customerAccount } from "@/lib/customer-account";
import { isoToday, type Animal, type Payment } from "@/lib/farm-data";

function animal(id: string, ownerId: string, monthlyCharge: number): Animal {
  return { id, userId: "user-one", ownerId, monthlyCharge, arrival: isoToday(),
    categoryId: "goat", subcategoryId: null, species: "Goat", sub: "", breed: "",
    status: "Active", notes: "", photoPath: null, photoUrl: null, vaccineDue: "",
    soldDate: null, soldPrice: null, weights: [], vaccinations: [] };
}

describe("Customer account", () => {
  it("keeps the current month unpaid when a receipt was assigned to next month", () => {
    const goat = { ...animal("U01-G0001", "customer-one", 500), arrival: "2026-10-01" };
    const account = customerAccount("customer-one", [goat], [{ id: "p1", customerId: "customer-one", animalId: goat.id, periodStart: "2026-11-01", amount: 500, date: "2026-10-27" }], "2026-10-27");
    expect(account.entries[0]?.periods[0]?.remaining).toBe(500);
    expect(account.collections[0]?.amount).toBe(0);
  });
  it("moving a receipt to the current month pays that month and restores the next collection", () => {
    const goat = { ...animal("U01-G0001", "customer-one", 500), arrival: "2026-10-01" };
    const payment = { id: "p1", customerId: "customer-one", animalId: goat.id, periodStart: "2026-11-01", amount: 500, date: "2026-10-27" };
    const before = customerAccount("customer-one", [goat], [payment], "2026-10-27");
    const after = customerAccount("customer-one", [goat], [{ ...payment, periodStart: "2026-10-01" }], "2026-10-27");
    expect(before.entries[0]?.remaining).toBe(500);
    expect(after.entries[0]?.remaining).toBe(0);
    expect(after.collections[0]).toEqual({ animalId: goat.id, date: "2026-11-01", amount: 500 });
    expect(after.totalPaid).toBe(500);
    expect(after.history).toHaveLength(1);
  });
  it("keeps old unlinked received money separate and never marks an animal paid", () => {
    const account = customerAccount("customer-one", [animal("U01-G0001", "customer-one", 500)], [{ id: "old", customerId: "customer-one", amount: 500, date: isoToday() }]);
    expect(account.unassignedPaid).toBe(500);
    expect(account.balance).toBe(0);
    expect(account.entries[0]?.periods[0]?.remaining).toBe(500);
    expect(account.entries[0]?.paid).toBe(0);
  });
  it("marks only the chosen animal and care month paid and groups receipts by received month", () => {
    const goat = { ...animal("U01-G0001", "customer-one", 500), arrival: "2026-09-26" };
    const buffalo = { ...animal("U01-B0001", "customer-one", 1200), arrival: "2026-09-26" };
    const account = customerAccount("customer-one", [goat, buffalo], [
      { id: "p1", customerId: "customer-one", amount: 500, date: "2026-10-01", animalId: goat.id, periodStart: "2026-09-26" },
      { id: "p2", customerId: "customer-one", amount: 200, date: "2026-10-26", animalId: goat.id, periodStart: "2026-10-26" },
      { id: "p3", customerId: "customer-one", amount: 50, date: "2026-09-30" },
    ], "2026-10-26");
    expect(account.monthly).toEqual([["2026-10", 700], ["2026-09", 50]]);
    expect(account.entries[0]?.periods.map((period) => period.remaining)).toEqual([0, 300]);
    expect(account.entries[1]?.remaining).toBe(2400);
    expect(account.collections).toEqual([{ animalId: goat.id, date: "2026-11-26", amount: 500 }, { animalId: buffalo.id, date: "2026-11-26", amount: 1200 }]);
    expect(account.balance).toBe(2650);
  });
  it("shows only animals assigned to the selected customer and their individual care charges", () => {
    const account = customerAccount("customer-one", [animal("U01-G0001", "customer-one", 500), animal("U01-B0001", "customer-one", 1200), animal("U01-G0002", "customer-two", 900)], []);
    expect(account.entries.map(({ animal: item, charge }) => [item.id, item.monthlyCharge, charge])).toEqual([["U01-G0001", 500, 500], ["U01-B0001", 1200, 1200]]);
  });

  it("subtracts only the selected customer's payments from their care charges", () => {
    const payments: Payment[] = [{ id: "p1", customerId: "customer-one", amount: 400, date: isoToday() }, { id: "p2", customerId: "customer-two", amount: 8000, date: isoToday() }];
    const account = customerAccount("customer-one", [animal("U01-G0001", "customer-one", 500), animal("U01-B0001", "customer-one", 1200)], payments);
    expect(account.totalCharges).toBe(1700);
    expect(account.totalPaid).toBe(400);
    expect(account.balance).toBe(1300);
    expect(account.history.map((payment) => payment.id)).toEqual(["p1"]);
  });
});