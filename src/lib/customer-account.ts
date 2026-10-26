import { chargesFor, type Animal, type Payment } from "@/lib/farm-data";

/** Use only the signed-in user's animals and payments from the farm store. */
export function customerAccount(customerId: string, animals: Animal[], payments: Payment[]) {
  const entries = animals.filter((animal) => animal.ownerId === customerId)
    .map((animal) => ({ animal, charge: chargesFor(animal) }));
  const history = payments.filter((payment) => payment.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalCharges = entries.reduce((total, entry) => total + entry.charge, 0);
  const totalPaid = history.reduce((total, payment) => total + payment.amount, 0);
  return { entries, history, totalCharges, totalPaid, balance: totalCharges - totalPaid };
}