import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronRight, MapPin, Phone, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { customerAccount } from "@/lib/customer-account";
import { fmtDate, inr, useFarm } from "@/lib/farm-data";
import { CustomerPayments } from "@/components/CustomerPayments";
import { FarmExport } from "@/components/FarmExport";
import { CustomerAccess } from "@/components/CustomerAccess";
import { DeleteConfirmation } from "@/components/DeleteConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimalPhoto } from "@/components/AnimalPhoto";

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
  const { customers, animals, payments, loading, reload, isAdmin } = useFarm();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
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
          {(customer.address || customer.village) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{(customer.address || customer.village)}</span>}
          {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-primary"><Phone className="h-4 w-4" />{customer.phone}</a>}
        </div>
      </section>
      {customer.email && <p className="break-all text-sm text-muted-foreground">{customer.email}</p>}
      <CustomerAccess customerId={customer.id} />
      {isAdmin && <><Button variant="outline" className="text-destructive" onClick={() => setDeleting(true)}><Trash2 />Delete customer</Button><DeleteConfirmation open={deleting} onOpenChange={setDeleting} title={`Delete ${customer.name}?`} description="This deletes this customer's payments and farm access. Their animals become personal animals with zero care charges; health and growth histories stay. The customer's login account remains." onConfirm={async () => { const { error } = await supabase.rpc("delete_owned_customer", { _customer_id: customer.id }); if (error) throw new Error(error.message); await reload(); toast.success("Customer deleted; animals kept as personal"); await navigate({ to: "/customers", replace: true }); }} /></>}
      <CustomerPayments key={customer.id} customerId={customer.id} />
      <section aria-labelledby="customer-animals">
        <h2 id="customer-animals" className="mb-3 text-lg font-semibold">Animals <span className="text-sm text-muted-foreground">({account.entries.length})</span></h2>
        {!account.entries.length && <p className="py-4 text-sm text-muted-foreground">No animals assigned to this customer.</p>}
        <ul className="space-y-3">
          {account.entries.map(({ animal, charge, paid, remaining, periods }) => (
            <li key={animal.id} className="rounded-lg border bg-card p-4">
              <Link to="/animals/$id" params={{ id: animal.id }} className="flex items-center gap-3">
                <AnimalPhoto src={animal.photoUrl} animalId={animal.id} zoom={false} className="h-16 w-16 shrink-0 rounded-xl" />
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
