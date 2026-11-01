import type { Animal, Category, Customer, Payment } from "@/lib/farm-data";
import { carePeriods } from "@/lib/care-billing";

export type ExportData = { uid: string; animals: Animal[]; customers: Customer[]; payments: Payment[]; categories: Category[] };

/** Shared QR records must never enter an account backup. */
export function exportRows(data: ExportData, today = new Date().toISOString().slice(0, 10)) {
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

export async function createFarmWorkbook(data: ExportData) {
  const { default: ExcelJS } = await import("exceljs");
  const rows = exportRows(data);
  const book = new ExcelJS.Workbook();
  book.creator = "FarmCare";
  book.created = new Date();
  book.calcProperties.fullCalcOnLoad = true;
  const addSheet = (name: string, headers: string[], values: (string | number | null | { formula: string })[][]) => {
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
    return [p.animalId, p.customerId, p.start, p.charge,
      { formula: `SUMIFS(Payments!F$2:F$${lastPayment},Payments!C$2:C$${lastPayment},A${r},Payments!D$2:D$${lastPayment},C${r})` },
      { formula: `MAX(0,D${r}-E${r})` }];
  }));
  const lastPeriod = Math.max(2, rows.periods.length + 1);
  addSheet("Customer balances", ["Customer ID", "Name", "Care charges (INR)", "Received (INR)", "Balance (INR)", "Unpaid periods (INR)"], rows.customers.map((c, i) => {
    const r = i + 2;
    return [c.id, c.name,
      { formula: `SUMIF('Care periods'!B$2:B$${lastPeriod},A${r},'Care periods'!D$2:D$${lastPeriod})` },
      { formula: `SUMIF(Payments!B$2:B$${lastPayment},A${r},Payments!F$2:F$${lastPayment})` },
      { formula: `C${r}-D${r}` },
      { formula: `SUMIF('Care periods'!B$2:B$${lastPeriod},A${r},'Care periods'!F$2:F$${lastPeriod})` }];
  }));
  addSheet("Weights", ["Animal ID", "Record ID", "Date", "Weight (kg)"], rows.weights.map((w) => [w.animalId, w.id, w.date, w.kg]));
  addSheet("Vaccinations", ["Animal ID", "Record ID", "Vaccine", "Given on", "Next due"], rows.vaccinations.map((v) => [v.animalId, v.id, v.name, v.date, v.nextDue]));
  addSheet("Categories", ["Category ID", "Name", "Parent ID", "Code"], rows.categories.map((c) => [c.id, c.name, c.parentId, c.code]));
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}