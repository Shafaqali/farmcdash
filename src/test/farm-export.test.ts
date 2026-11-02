import { describe, expect, it } from "vitest";
import { exportRows, createFarmWorkbook } from "@/lib/farm-export";
import type { Animal } from "@/lib/farm-data";

const animal = { id: "U03-G0001", userId: "owner", ownerId: "customer", species: "Goat", sub: "Barbari", breed: "Barbari", categoryId: "goat", subcategoryId: null, arrival: "2026-10-01", monthlyCharge: 3000, status: "Active", vaccineDue: "2026-11-01", notes: "", photoPath: null, photoUrl: null, soldDate: null, soldPrice: null, weights: [{ id: "w1", date: "2026-10-01", kg: 25 }], vaccinations: [{ id: "v1", name: "Vaccine", date: "2026-10-01", nextDue: "2026-11-01" }] } satisfies Animal;
const data = { uid: "owner", animals: [animal, { ...animal, id: "U02-G0001", userId: "other" }], customers: [{ id: "customer", name: "Mohd", phone: "", village: "Mumbra" }], payments: [{ id: "p1", customerId: "customer", animalId: animal.id, periodStart: "2026-10-01", amount: 3000, date: "2026-10-01" }, { id: "foreign", customerId: "other-customer", amount: 999, date: "2026-10-01" }], categories: [] };
describe("Private Excel export", () => {
  it("exports only registered-owner animals and current-customer receipts", () => {
    const rows = exportRows(data, "2026-10-15");
    expect(rows.animals.map((a) => a.id)).toEqual(["U03-G0001"]);
    expect(rows.payments.map((p) => p.id)).toEqual(["p1"]);
    expect(rows.weights.map((w) => w.animalId)).toEqual(["U03-G0001"]);
    expect(rows.vaccinations.map((v) => v.animalId)).toEqual(["U03-G0001"]);
  });
  it("refuses an export without a signed-in user", () => {
    expect(() => exportRows({ ...data, uid: "" })).toThrow();
  });
  it("generates a real workbook with eight sheets and numeric payments", async () => {
    const blob = await createFarmWorkbook(data);
    const { default: ExcelJS } = await import("exceljs");
    const bytes = await new Promise<ArrayBuffer>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.readAsArrayBuffer(blob); });
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes);
    expect(book.worksheets).toHaveLength(8);
    expect(book.getWorksheet("Animals")?.getCell("A2").value).toBe("U03-G0001");
    expect(book.getWorksheet("Payments")?.getCell("F2").value).toBe(3000);
    expect(book.getWorksheet("Customer balances")?.getCell("E2").value).toMatchObject({ formula: "C2-D2" });
  });
});