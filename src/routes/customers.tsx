import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, MapPin, Plus, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useFarm, inr, chargesFor } from "@/lib/farm-data";
import { CustomerPayments } from "@/components/CustomerPayments";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [
    { title: "Customers — FarmCare" },
    { name: "description", content: "Customer balances, payments and animals in care." },
    { property: "og:title", content: "Customers — FarmCare" },
    { property: "og:description", content: "Customer balances, payments and animals in care." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CustomersLayout,
});

function CustomersLayout() {
  const path = useLocation({ select: (location) => location.pathname });
  return path === "/customers" || path === "/customers/" ? <Customers /> : <Outlet />;
}

function Customers() {
  const { customers, animals, payments, addPayment, addCustomer, isAdmin } = useFarm();
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", village: "" });
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const visible = customers.filter((c) => `${c.name} ${c.phone} ${c.village}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle eyebrow={`${customers.length} customers`} title="Customers"
        action={<Button onClick={() => setAdding(true)} className="shrink-0"><Plus />Add</Button>} />
      <div className="relative mb-4"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search customers" placeholder="Search name, phone or village" className="h-11 bg-card pl-10" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle>Add customer</DialogTitle><DialogDescription>Customer contact details</DialogDescription>
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!nc.name.trim()) { toast.error("Enter name"); return; } setSaving(true); try { await addCustomer({ name: nc.name.trim(), phone: nc.phone.trim(), village: nc.village.trim() }); toast.success("Customer added"); setNc({ name: "", phone: "", village: "" }); setAdding(false); } catch (er) { toast.error(er instanceof Error ? er.message : "Unable to save customer"); } finally { setSaving(false); } }}>
          <label className="block space-y-2 text-sm">Name<Input required value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Phone<Input type="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Village<Input value={nc.village} onChange={(e) => setNc({ ...nc, village: e.target.value })} /></label>
          <Button disabled={saving} className="w-full">{saving ? "Saving…" : "Save customer"}</Button>
        </form>
      </DialogContent></Dialog>
      {customers.length === 0 && !adding && <p className="py-10 text-center text-sm text-muted-foreground">No customers yet. Tap Add to create one.</p>}
      <ul className="space-y-3">
        {visible.map((c, i) => {
          const mine = animals.filter((a) => a.ownerId === c.id);
          const due = mine.reduce((s, a) => s + chargesFor(a), 0);
          const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
          const pct = due ? Math.min(100, Math.round((paid / due) * 100)) : 100;
          return (
            <li key={c.id} className="animate-rise rounded-lg border bg-card p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <Link to="/customers/$id" params={{ id: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary font-semibold text-primary">{c.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{c.name}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.village}</span><span>{mine.length} animals</span></p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                {c.phone && <Button asChild variant="secondary" size="icon"><a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}><Phone /></a></Button>}
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-3 text-sm"><span className="text-muted-foreground">Paid {inr(paid)}</span><span className={due - paid > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>{due - paid > 0 ? `Due ${inr(due - paid)}` : "Settled"}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="bg-glow h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
              {isAdmin && <div className="mt-3"><CustomerPayments customerId={c.id} /></div>}
            </li>
          );
        })}
      </ul>
      {customers.length > 0 && !visible.length && <p className="py-10 text-center text-sm text-muted-foreground">No customers found.</p>}
    </div>
  );
}
