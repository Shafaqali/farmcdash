import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MapPin, PawPrint, Phone } from "lucide-react";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { customerAccount } from "@/lib/customer-account";
import { fmtDate, inr, useFarm } from "@/lib/farm-data";
import { CustomerPayments } from "@/components/CustomerPayments";
import { FarmExport } from "@/components/FarmExport";
import { CustomerAccess } from "@/components/CustomerAccess";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({ meta: [
    { title: "Customer account — STAR GOATS FARM" },
    { name: "description", content: "View a customer's animals, individual care charges, payment history and outstanding balance." },
    { property: "og:title", content: "Customer account — STAR GOATS FARM" },
    { property: "og:description", content: "Customer animals, care charges, payments and outstanding balance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CustomerDetails,
});

function CustomerDetails() {
  const { id } = Route.useParams();
  const { customers, animals, payments, loading } = useFarm();
  const customer = customers.find((entry) => entry.id === id);
  if (loading && !customer) return <p className="py-10 text-center text-muted-foreground">Loading customer…</p>;
  if (!customer) return <div className="space-y-4 py-8"><h1 className="text-2xl font-semibold">Customer unavailable</h1><p className="text-muted-foreground">This customer isn't in your account.</p><Button asChild variant="outline"><Link to="/customers"><ArrowLeft />Customers</Link></Button></div>;
  const account = customerAccount(customer.id, animals, payments);
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3"><Link to="/customers"><ArrowLeft />Customers</Link></Button>
      <section>
        <PageTitle eyebrow="Customer account" title={customer.name} action={<FarmExport scope={{ kind: "customer", id: customer.id }} />} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {customer.village && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{customer.village}</span>}
          {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-primary"><Phone className="h-4 w-4" />{customer.phone}</a>}
        </div>
      </section>
      <CustomerAccess customerId={customer.id} />
      <section className="border-y py-4" aria-label="Account balance">
        <p className="text-sm text-muted-foreground">{account.balance < 0 ? "Credit balance" : "Outstanding balance"}</p>
        <p className={`mt-1 break-words text-3xl font-semibold ${account.balance > 0 ? "text-destructive" : "text-primary"}`}>{inr(Math.abs(account.balance))}</p>
        {account.balance === 0 && account.entries.every((entry) => entry.remaining === 0) && <p className="mt-1 text-sm text-primary">Settled</p>}
        {account.entries.some((entry) => entry.remaining > 0) && <p className="mt-2 text-sm text-destructive">Unpaid care periods: {inr(account.entries.reduce((sum, entry) => sum + entry.remaining, 0))}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Total care charges</dt><dd className="mt-1 break-words font-semibold">{inr(account.totalCharges)}</dd></div>
          <div><dt className="text-muted-foreground">Payments received</dt><dd className="mt-1 break-words font-semibold">{inr(account.totalPaid)}</dd></div>
        </dl>
      </section>
      <section aria-labelledby="next-collection">
        <h2 id="next-collection" className="mb-3 text-lg font-semibold">Next collection</h2>
        {!account.collections.length ? <p className="text-sm text-muted-foreground">No upcoming care charges.</p> : <><p className="mb-2 text-sm">Upcoming total <span className="font-semibold">{inr(account.collections.reduce((sum, item) => sum + item.amount, 0))}</span></p><ul className="divide-y">{account.collections.map((item) => <li key={item.animalId} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.animalId}<span className="ml-2 text-muted-foreground">{fmtDate(item.date)}</span></span><span className="font-semibold">{item.amount ? inr(item.amount) : "Paid in advance"}</span></li>)}</ul></>}
      </section>
      <section aria-labelledby="monthly-received">
        <h2 id="monthly-received" className="mb-3 text-lg font-semibold">Monthly received</h2>
        {!account.monthly.length ? <p className="text-sm text-muted-foreground">No payments received.</p> : <ul className="divide-y">{account.monthly.map(([month, amount]) => <li key={month} className="flex justify-between gap-3 py-3 text-sm"><span>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}</span><span className="font-semibold text-primary">{inr(amount)}</span></li>)}</ul>}
        {account.unassignedPaid > 0 && <p className="mt-3 text-sm text-muted-foreground">Unassigned received: {inr(account.unassignedPaid)} · Included in the customer balance; not marked against an animal.</p>}
      </section>
      <CustomerPayments key={customer.id} customerId={customer.id} />
      <section aria-labelledby="customer-animals">
        <h2 id="customer-animals" className="mb-3 text-lg font-semibold">Animals <span className="text-sm text-muted-foreground">({account.entries.length})</span></h2>
        {!account.entries.length && <p className="py-4 text-sm text-muted-foreground">No animals assigned to this customer.</p>}
        <ul className="space-y-3">
          {account.entries.map(({ animal, charge, paid, remaining, periods }) => (
            <li key={animal.id} className="rounded-lg border bg-card p-4">
              <Link to="/animals/$id" params={{ id: animal.id }} className="flex items-center gap-3">
                {animal.photoUrl ? <img src={animal.photoUrl} alt={animal.species} className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><PawPrint className="h-6 w-6" /></span>}
                <div className="min-w-0 flex-1"><p className="break-all font-semibold">{animal.id}</p><p className="break-words text-sm text-muted-foreground">{[...new Set([animal.species, animal.sub, animal.breed].filter(Boolean))].join(" · ")}</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">{animal.status} · Arrived {fmtDate(animal.arrival)}{animal.soldDate ? ` · Sold ${fmtDate(animal.soldDate)}` : ""}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <div><dt className="text-muted-foreground">Caring / month</dt><dd className="mt-1 break-words font-semibold">{inr(animal.monthlyCharge)}</dd></div>
                <div><dt className="text-muted-foreground">Care charges to date</dt><dd className="mt-1 break-words font-semibold">{inr(charge)}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm"><span>Assigned payments {inr(paid)}</span><span className={remaining > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>{remaining > 0 ? `Unpaid ${inr(remaining)}` : "Paid"}</span></div>
              <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-sm font-medium text-primary">Care periods ({periods.length})</summary><ul className="mt-2 divide-y">{periods.slice().reverse().map((period) => <li key={period.start} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span>{fmtDate(period.start)} · {inr(period.charge)}</span><span className={period.remaining > 0 ? "text-destructive" : "text-primary"}>{period.remaining === 0 ? "Paid" : period.paid > 0 ? `Partial · ${inr(period.remaining)} due` : `Unpaid · ${inr(period.remaining)}`}</span></li>)}</ul></details>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="customer-payments">
        <h2 id="customer-payments" className="mb-3 text-lg font-semibold">Payment history</h2>
        {!account.history.length ? <p className="py-4 text-sm text-muted-foreground">No payments recorded.</p> : <ul className="divide-y">{account.history.map((payment) => <li key={payment.id} className="py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-muted-foreground">{fmtDate(payment.date)}</p><p className="mt-1 text-xs">{payment.animalId ? `${payment.animalId} · Care ${fmtDate(payment.periodStart ?? "")}${(payment.periodStart ?? "") > new Date().toISOString().slice(0, 10) ? " · Advance" : ""}` : "Unassigned payment"}</p></div><span className="break-words font-semibold text-primary">{inr(payment.amount)}</span><CustomerPayments customerId={customer.id} payment={payment} /></div></li>)}</ul>}
      </section>
    </div>
  );
}