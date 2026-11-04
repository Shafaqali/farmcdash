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
  const account = customerAccount(animal.ownerId, data.animals, data.payments);
  const entry = account.entries.find((e) => e.animal.id === animalId);
  if (!entry) return null;
  return <section aria-label="Customer care payments" className="space-y-3 border-y py-4"><h2 className="text-lg font-semibold">Care payments</h2><p className="text-sm">Monthly care {inr(animal.monthlyCharge)} · Unpaid {inr(entry.remaining)}</p><ul className="divide-y">{entry.periods.slice().reverse().map((p) => <li key={p.start} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.start)}</span><span className={p.remaining ? "text-destructive" : "text-primary"}>{p.remaining ? `${inr(p.remaining)} due` : "Paid"}</span></li>)}</ul><h3 className="font-semibold">Payment history</h3>{account.history.filter((p) => p.animalId === animalId).map((p) => <p key={p.id} className="text-sm">{fmtDate(p.date)} · {inr(p.amount)} · Care {fmtDate(p.periodStart ?? "")}</p>)}</section>;
}