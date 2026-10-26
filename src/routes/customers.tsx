import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, MapPin, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useFarm, inr, chargesFor } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState<string | null>(null);
  const [amt, setAmt] = useState("");
  return (
    <div>
      <PageTitle eyebrow={`${customers.length} customers`} title="Customers"
        action={<Button onClick={() => setAdding((v) => !v)} className="bg-glow rounded-full shadow-float"><Plus />Add</Button>} />
      {adding && (
        <form className="card-soft mb-3 space-y-2 p-4" onSubmit={(e) => { e.preventDefault(); if (!nc.name.trim()) { toast.error("Enter name"); return; } addCustomer({ name: nc.name.trim(), phone: nc.phone.trim(), village: nc.village.trim() }).then(() => { toast.success("Customer added"); setNc({ name: "", phone: "", village: "" }); setAdding(false); }, (er: Error) => toast.error(er.message)); }}>
          <input autoFocus value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Name" className="w-full rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
          <input type="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} placeholder="Phone" className="w-full rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
          <input value={nc.village} onChange={(e) => setNc({ ...nc, village: e.target.value })} placeholder="Village" className="w-full rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
          <Button className="w-full">Save customer</Button>
        </form>
      )}
      {customers.length === 0 && !adding && <p className="py-10 text-center text-sm text-muted-foreground">No customers yet. Tap Add to create one.</p>}
      <ul className="space-y-3">
        {customers.map((c, i) => {
          const mine = animals.filter((a) => a.ownerId === c.id);
          const due = mine.reduce((s, a) => s + chargesFor(a), 0);
          const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
          const pct = due ? Math.min(100, Math.round((paid / due) * 100)) : 100;
          return (
            <li key={c.id} className="card-soft animate-rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <Link to="/customers/$id" params={{ id: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="bg-glow grid h-11 w-11 shrink-0 place-items-center rounded-full font-semibold text-primary-foreground">{c.name.split(" ").map((w) => w[0]).join("")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{c.name}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.village}</span><span>{mine.length} animals</span></p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                <a href={`tel:${c.phone}`} aria-label="Call" className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary"><Phone className="h-4 w-4" /></a>
              </div>
              <div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">Paid {inr(paid)}</span><span className={due - paid > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>{due - paid > 0 ? `Due ${inr(due - paid)}` : "Settled"}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="bg-glow h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
              {open === c.id ? (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!Number(amt)) return; addPayment({ customerId: c.id, amount: Number(amt), date: new Date().toISOString().slice(0, 10) }).then(() => toast.success(`${inr(Number(amt))} recorded`), (er: Error) => toast.error(er.message)); setAmt(""); setOpen(null); }}>
                  <input autoFocus type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount ₹" className="flex-1 rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
                  <Button>Save</Button>
                </form>
              ) : (
                isAdmin && <Button variant="link" onClick={() => setOpen(c.id)} className="mt-3 px-0"><Plus />Record payment</Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
