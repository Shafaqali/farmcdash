import type { Animal, Payment } from "./farm-data";
import { customerAccount } from "./customer-account";

export function splitBalance(charges: number, collected: number) {
  return { outstanding: Math.max(0, charges - collected), advance: Math.max(0, collected - charges) };
}
/** Never net one customer's advance against another customer's debt. */
export function farmBalance(customerIds: string[], animals: Animal[], payments: Payment[], today?: string) {
  return customerIds.reduce((total, id) => {
    const account = customerAccount(id, animals, payments, today);
    const balance = splitBalance(account.totalCharges, account.totalPaid);
    return { outstanding: total.outstanding + balance.outstanding, advance: total.advance + balance.advance };
  }, { outstanding: 0, advance: 0 });
}