import type { Animal, Category, Customer, Payment } from "@/lib/farm-data";
import { carePeriods } from "@/lib/care-billing";

export type ExportData = { uid: string; animals: Animal[]; customers: Customer[]; payments: Payment[]; categories: Category[] };
export type ExportScope = { kind: "animal" | "customer"; id: string };

export function selectExportData(data: ExportData, scope?: ExportScope): ExportData {
  if (!data.uid) throw new Error("Sign in to export your farm.");
  const owned = data.animals.filter((animal) => animal.userId === data.uid);
  if (!scope) return { ...data, animals: owned };
  if (scope.kind === "animal" && !owned.some((animal) => animal.id === scope.id)) throw new Error("This animal isn't in your account.");
  if (scope.kind === "customer" && !data.customers.some((customer) => customer.id === scope.id)) throw new Error("This customer isn't in your account.");
  const animals = owned.filter((animal) => scope.kind === "animal" ? animal.id === scope.id : animal.ownerId === scope.id);
  const customers = data.customers.filter((customer) => scope.kind === "customer" ? customer.id === scope.id : animals.some((animal) => animal.ownerId === customer.id));
  const payments = data.payments.filter((payment) => scope.kind === "animal" ? payment.animalId === scope.id : payment.customerId === scope.id);
  const categoryIds = new Set(animals.flatMap((animal) => [animal.categoryId, animal.subcategoryId]));
  const categories = data.categories.filter((category) => categoryIds.has(category.id));
  return { uid: data.uid, animals, customers, payments, categories };
}

/** Shared QR records must never enter an account backup. */
export function exportRows(input: ExportData, today = new Date().toISOString().slice(0, 10), scope?: ExportScope) {
  const data = selectExportData(input, scope);
  if (!data.uid) throw new Error("Sign in to export your farm.");
  const animals = data.animals.filter((a) => a.userId === data.uid);
  const customers = data.customers;
  const customerIds = new Set(customers.map((c) => c.id));
  const animalIds = new Set(animals.map((a) => a.id));
  const payments = data.payments.filter((p) => customerIds.has(p.customerId) && (!p.animalId || animalIds.has(p.animalId)));
  return { animals, customers, payments, categories: data.categories,
    periods: animals.flatMap((a) => carePeriods(a, today).map((start) => ({ animalId: a.id, customerId: a.ownerId, start, charge: a.monthlyCharge }))),
    weights: animals.flatMap((a) => a.weights.map((w) => ({ animalId: a.id, ...w }))),
    vaccinations: animals.flatMap((a) => a.vaccinations.map((v) => ({ animalId: a.id, ...v }))),
  };
}

export async function createFarmWorkbook(data: ExportData, scope?: ExportScope) {
  const { default: ExcelJS } = await import("exceljs");
  const rows = exportRows(data, undefined, scope);
  const book = new ExcelJS.Workbook();
  book.creator = "STAR GOATS FARM";
  book.created = new Date();
  book.calcProperties.fullCalcOnLoad = true;
  const addSheet = (name: string, headers: string[], values: (string | number | null | { formula: string; result: number })[][]) => {
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.addRow(headers);
    values.forEach((value) => sheet.addRow(value));
    sheet.columns.forEach((column, i) => { column.width = headers[i]?.includes("Notes") ? 45 : 24; });
    sheet.getRow(1).font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };
    sheet.getRow(1).height = 28;
    sheet.eachRow((row, index) => { if (index > 1) { row.font = { name: "Arial", size: 11 }; row.alignment = { vertical: "top", wrapText: true }; } });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
    return sheet;
  };
  addSheet("Animals", ["Animal ID", "Customer ID", "Species", "Type", "Breed", "Status", "Arrival", "Monthly care (INR)", "Vaccine due", "Sold date", "Sold price (INR)", "Notes", "Photo path"], rows.animals.map((a) => [a.id, a.ownerId, a.species, a.sub, a.breed, a.status, a.arrival, a.monthlyCharge, a.vaccineDue, a.soldDate, a.soldPrice, a.notes, a.photoPath]));
  addSheet("Customers", ["Customer ID", "Name", "Phone", "Village"], rows.customers.map((c) => [c.id, c.name, c.phone, c.village]));
  addSheet("Payments", ["Receipt ID", "Customer ID", "Animal ID", "Care period", "Received on", "Amount (INR)"], rows.payments.map((p) => [p.id, p.customerId, p.animalId ?? "", p.periodStart ?? "", p.date, p.amount]));
  const lastPayment = Math.max(2, rows.payments.length + 1);
  addSheet("Care periods", ["Animal ID", "Customer ID", "Period start", "Charge (INR)", "Received (INR)", "Remaining (INR)"], rows.periods.map((p, i) => {
    const r = i + 2;
    const paid = rows.payments.filter((payment) => payment.animalId === p.animalId && payment.periodStart === p.start).reduce((sum, payment) => sum + payment.amount, 0);
    return [p.animalId, p.customerId, p.start, p.charge,
      { formula: `SUMIFS(Payments!F$2:F$${lastPayment},Payments!C$2:C$${lastPayment},A${r},Payments!D$2:D$${lastPayment},C${r})`, result: paid },
      { formula: `MAX(0,D${r}-E${r})`, result: Math.max(0, p.charge - paid) }];
  }));
  const lastPeriod = Math.max(2, rows.periods.length + 1);
  addSheet("Customer balances", ["Customer ID", "Name", "Care charges (INR)", "Received (INR)", scope?.kind === "animal" ? "Selected animal balance (INR)" : "Balance (INR)", "Unpaid periods (INR)"], rows.customers.map((c, i) => {
    const r = i + 2;
    const periods = rows.periods.filter((p) => p.customerId === c.id);
    const charge = periods.reduce((sum, p) => sum + p.charge, 0);
    const paid = rows.payments.filter((p) => p.customerId === c.id).reduce((sum, p) => sum + p.amount, 0);
    const remaining = periods.reduce((sum, p) => sum + Math.max(0, p.charge - rows.payments.filter((payment) => payment.animalId === p.animalId && payment.periodStart === p.start).reduce((total, payment) => total + payment.amount, 0)), 0);
    return [c.id, c.name,
      { formula: `SUMIF('Care periods'!B$2:B$${lastPeriod},A${r},'Care periods'!D$2:D$${lastPeriod})`, result: charge },
      { formula: `SUMIF(Payments!B$2:B$${lastPayment},A${r},Payments!F$2:F$${lastPayment})`, result: paid },
      { formula: `C${r}-D${r}`, result: charge - paid },
      { formula: `SUMIF('Care periods'!B$2:B$${lastPeriod},A${r},'Care periods'!F$2:F$${lastPeriod})`, result: remaining }];
  }));
  addSheet("Weights", ["Animal ID", "Record ID", "Date", "Weight (kg)"], rows.weights.map((w) => [w.animalId, w.id, w.date, w.kg]));
  addSheet("Vaccinations", ["Animal ID", "Record ID", "Vaccine", "Given on", "Next due"], rows.vaccinations.map((v) => [v.animalId, v.id, v.name, v.date, v.nextDue]));
  addSheet("Categories", ["Category ID", "Name", "Parent ID", "Code"], rows.categories.map((c) => [c.id, c.name, c.parentId, c.code]));
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}