import { chargesFor, type Animal, type Payment } from "@/lib/farm-data";
import { carePeriods, nextCareDate } from "@/lib/care-billing";

/** Use only the signed-in user's animals and payments from the farm store. */
export function customerAccount(customerId: string, animals: Animal[], payments: Payment[], today = new Date().toISOString().slice(0, 10)) {
  const ownPayments = payments.filter((payment) => payment.customerId === customerId);
  const entries = animals.filter((animal) => animal.ownerId === customerId)
    .map((animal) => {
      const periods = carePeriods(animal, today).map((start) => {
        const paid = ownPayments.filter((payment) => payment.animalId === animal.id && payment.periodStart === start).reduce((sum, payment) => sum + payment.amount, 0);
        return { start, charge: animal.monthlyCharge, paid, remaining: Math.max(0, animal.monthlyCharge - paid) };
      });
      const paid = ownPayments.filter((payment) => payment.animalId === animal.id).reduce((sum, payment) => sum + payment.amount, 0);
      return { animal, charge: chargesFor(animal, 0, Date.parse(today)), periods, paid, remaining: periods.reduce((sum, period) => sum + period.remaining, 0), nextDate: nextCareDate(animal, today) };
    });
  const history = [...ownPayments]
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalCharges = entries.reduce((total, entry) => total + entry.charge, 0);
  const totalPaid = history.reduce((total, payment) => total + payment.amount, 0);
  const unassignedPaid = history.filter((payment) => !payment.animalId).reduce((sum, payment) => sum + payment.amount, 0);
  const monthly = new Map<string, number>();
  history.forEach((payment) => { const month = payment.date.slice(0, 7); monthly.set(month, (monthly.get(month) ?? 0) + payment.amount); });
  const collections = entries.filter((entry) => entry.nextDate).map((entry) => ({ animalId: entry.animal.id, date: entry.nextDate ?? "", amount: Math.max(0, entry.animal.monthlyCharge - history.filter((payment) => payment.animalId === entry.animal.id && payment.periodStart === entry.nextDate).reduce((sum, payment) => sum + payment.amount, 0)) }));
  return { entries, history, totalCharges, totalPaid, balance: totalCharges - totalPaid, unassignedPaid,
    monthly: [...monthly].sort(([a], [b]) => b.localeCompare(a)), collections };
}