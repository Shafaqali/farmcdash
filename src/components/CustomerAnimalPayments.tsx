import { useEffect, useState } from "react";
import { useFarm, fmtDate, inr } from "@/lib/farm-data";
import { loadCustomerPortal, type PortalData } from "@/lib/customer-portal";
import { customerAccount } from "@/lib/customer-account";

export function CustomerAnimalPayments({ animalId }: { animalId: string }) {
  const { uid } = useFarm();
  const [data, setData] = useState<PortalData | null>(null);
  useEffect(() => { let active = true; setData(null); void loadCustomerPortal().then((d) => { if (active) setData(d); }).catch(() => {}); return () => { active = false; }; }, [uid, animalId]);
  const animal = data?.animals.find((a) => a.id === animalId);
  if (!animal || !data) return null;
  const periods = data.paymentStatuses?.filter((p) => p.animalId === animalId) ?? [];
  return <section aria-label="Customer care payments" className="space-y-3 border-y py-4"><h2 className="text-lg font-semibold">Care payments</h2>{!periods.length && <p className="text-sm text-muted-foreground">No care payments due.</p>}<ul className="divide-y">{periods.slice().reverse().map((p) => <li key={p.periodStart} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.periodStart)}</span><span className={p.status === "Paid" ? "text-primary" : "text-destructive"}>{p.status}</span></li>)}</ul></section>;
}
