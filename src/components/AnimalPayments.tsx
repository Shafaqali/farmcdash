import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CustomerPayments } from "@/components/CustomerPayments";
import { customerAccount } from "@/lib/customer-account";
import { fmtDate, inr, useFarm } from "@/lib/farm-data";

/** Financial details never use the shared QR animal collection. */
export function AnimalPayments({ animalId }: { animalId: string }) {
  const { uid, animals, customers, payments } = useFarm();
  const animal = animals.find((item) => item.id === animalId && item.userId === uid);
  if (!animal) return null;
  const customer = customers.find((item) => item.id === animal.ownerId);
  if (!customer) return <section className="border-y py-4"><h2 className="text-lg font-semibold">Care payments</h2><p className="mt-2 text-sm text-muted-foreground">No customer assigned.</p></section>;
  const account = customerAccount(customer.id, animals, payments);
  const entry = account.entries.find((item) => item.animal.id === animal.id);
  if (!entry) return null;
  const current = entry.periods.at(-1);
  const outstanding = entry.periods.filter((item) => item.remaining > 0);
  const history = account.history.filter((item) => item.animalId === animal.id);
  const status = (paid: number, remaining: number) => remaining === 0 ? "Paid" : paid > 0 ? `Partial · ${inr(remaining)} due` : `Unpaid · ${inr(remaining)}`;
  return <section className="space-y-4 border-y py-4" aria-label="Animal care payments">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Care payments</h2><Button asChild size="sm" variant="outline"><Link to="/customers/$id" params={{ id: customer.id }}>{customer.name}</Link></Button></div>
    <p className="text-sm">Monthly care <span className="font-semibold">{inr(animal.monthlyCharge)}</span></p>
    {current ? <div><p className="text-sm text-muted-foreground">{animal.status === "Active" ? "Current care period" : "Last care period"} · {fmtDate(current.start)}</p><p className={`mt-1 font-semibold ${current.remaining > 0 ? "text-destructive" : "text-primary"}`}>{status(current.paid, current.remaining)}</p><p className="mt-1 text-sm text-muted-foreground">Received {inr(current.paid)} / {inr(current.charge)}</p></div> : <p className="text-sm text-muted-foreground">Care has not started.</p>}
    <div><h3 className="font-semibold">Outstanding months · {inr(entry.remaining)}</h3>{!outstanding.length ? <p className="mt-2 text-sm text-primary">All due care periods paid</p> : <ul className="mt-2 divide-y">{outstanding.slice().reverse().map((period) => <li key={period.start} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(period.start)}</span><span className="text-destructive">{status(period.paid, period.remaining)}</span></li>)}</ul>}</div>
    <CustomerPayments key={animal.id} customerId={customer.id} defaultAnimalId={animal.id} />
    <div><h3 className="font-semibold">Payment history</h3>{!history.length ? <p className="mt-2 text-sm text-muted-foreground">No payments assigned to this animal.</p> : <ul className="divide-y">{history.map((payment) => <li key={payment.id} className="py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-primary">{inr(payment.amount)}</p><p className="text-muted-foreground">Received {fmtDate(payment.date)}</p><p>Care {fmtDate(payment.periodStart ?? "")}{(payment.periodStart ?? "") > new Date().toISOString().slice(0, 10) ? " · Advance" : ""}</p></div><CustomerPayments customerId={customer.id} payment={payment} /></div></li>)}</ul>}</div>
  </section>;
}