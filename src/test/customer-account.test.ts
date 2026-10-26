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