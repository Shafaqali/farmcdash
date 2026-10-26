import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MapPin, PawPrint, Phone } from "lucide-react";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { customerAccount } from "@/lib/customer-account";
import { fmtDate, inr, useFarm } from "@/lib/farm-data";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({ meta: [
    { title: "Customer account — FarmCare" },
    { name: "description", content: "View a customer's animals, individual care charges, payment history and outstanding balance." },
    { property: "og:title", content: "Customer account — FarmCare" },
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
        <PageTitle eyebrow="Customer account" title={customer.name} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {customer.village && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{customer.village}</span>}
          {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-primary"><Phone className="h-4 w-4" />{customer.phone}</a>}
        </div>
      </section>
      <section className="border-y py-4" aria-label="Account balance">
        <p className="text-sm text-muted-foreground">{account.balance < 0 ? "Credit balance" : "Outstanding balance"}</p>
        <p className={`mt-1 break-words text-3xl font-semibold ${account.balance > 0 ? "text-destructive" : "text-primary"}`}>{inr(Math.abs(account.balance))}</p>
        {account.balance === 0 && <p className="mt-1 text-sm text-primary">Settled</p>}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Total care charges</dt><dd className="mt-1 break-words font-semibold">{inr(account.totalCharges)}</dd></div>
          <div><dt className="text-muted-foreground">Payments received</dt><dd className="mt-1 break-words font-semibold">{inr(account.totalPaid)}</dd></div>
        </dl>
      </section>
      <section aria-labelledby="customer-animals">
        <h2 id="customer-animals" className="mb-3 text-lg font-semibold">Animals <span className="text-sm text-muted-foreground">({account.entries.length})</span></h2>
        {!account.entries.length && <p className="py-4 text-sm text-muted-foreground">No animals assigned to this customer.</p>}
        <ul className="space-y-3">
          {account.entries.map(({ animal, charge }) => (
            <li key={animal.id} className="card-soft p-4">
              <Link to="/animals/$id" params={{ id: animal.id }} className="flex items-center gap-3">
                {animal.photoUrl ? <img src={animal.photoUrl} alt={animal.species} className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><PawPrint className="h-6 w-6" /></span>}
                <div className="min-w-0 flex-1"><p className="break-words font-semibold">{animal.id}</p><p className="break-words text-sm text-muted-foreground">{[animal.species, animal.sub, animal.breed].filter(Boolean).join(" · ")}</p></div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">{animal.status} · Arrived {fmtDate(animal.arrival)}{animal.soldDate ? ` · Sold ${fmtDate(animal.soldDate)}` : ""}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <div><dt className="text-muted-foreground">Caring / month</dt><dd className="mt-1 break-words font-semibold">{inr(animal.monthlyCharge)}</dd></div>
                <div><dt className="text-muted-foreground">Care charges to date</dt><dd className="mt-1 break-words font-semibold">{inr(charge)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="customer-payments">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="customer-payments" className="text-lg font-semibold">Payment history</h2><Button asChild variant="link" size="sm"><Link to="/customers">Record payment<ChevronRight /></Link></Button></div>
        {!account.history.length ? <p className="py-4 text-sm text-muted-foreground">No payments recorded.</p> : <ul className="divide-y">{account.history.map((payment) => <li key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-muted-foreground">{fmtDate(payment.date)}</span><span className="break-words font-semibold text-primary">{inr(payment.amount)}</span></li>)}</ul>}
      </section>
    </div>
  );
}