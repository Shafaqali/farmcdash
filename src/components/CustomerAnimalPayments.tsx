import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { fmtDate } from "@/lib/farm-data";
import { useCustomerPortal } from "@/lib/use-customer-portal";

export function CustomerAnimalPayments({ animalId }: { animalId: string }) {
  const { data } = useCustomerPortal();
  const animal = data?.animals.find((a) => a.id === animalId);
  if (!animal || !data) return null;
  const periods = data.paymentStatuses?.filter((p) => p.animalId === animalId) ?? [];
  return <section aria-label="Customer care payments" className="space-y-3 border-y py-4"><h2 className="text-lg font-semibold">Care payments</h2>{!periods.length && <p className="text-sm text-muted-foreground">No care payments due.</p>}<ul className="divide-y">{periods.slice().reverse().map((p) => <li key={p.periodStart} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.periodStart)}</span><PaymentStatusBadge status={p.status} /></li>)}</ul></section>;
}
