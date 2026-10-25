import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { useFarm, inr, chargesFor } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [
    { title: "Customers — FarmCare" },
    { name: "description", content: "Customer balances, payments and animals in care." },
    { property: "og:title", content: "Customers — FarmCare" },
    { property: "og:description", content: "Customer balances, payments and animals in care." },
  ] }),
  component: Customers,
});

function Customers() {
  const { customers, animals, payments, addPayment, isAdmin } = useFarm();
  const [open, setOpen] = useState<string | null>(null);
  const [amt, setAmt] = useState("");
  return (
    <div>
      <PageTitle eyebrow={`${customers.length} customers`} title="Customers" />
      <ul className="space-y-3">
        {customers.map((c, i) => {
          const mine = animals.filter((a) => a.ownerId === c.id);
          const due = mine.reduce((s, a) => s + chargesFor(a), 0);
          const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
          const pct = due ? Math.min(100, Math.round((paid / due) * 100)) : 100;
          return (
            <li key={c.id} className="card-soft animate-rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className="bg-glow grid h-11 w-11 place-items-center rounded-full font-semibold text-primary-foreground">{c.name.split(" ").map((w) => w[0]).join("")}</span>
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.village}</span><span>{mine.length} animals</span></p>
                </div>
                <a href={`tel:${c.phone}`} aria-label="Call" className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary"><Phone className="h-4 w-4" /></a>
              </div>
              <div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">Paid {inr(paid)}</span><span className={due - paid > 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>{due - paid > 0 ? `Due ${inr(due - paid)}` : "Settled"}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="bg-glow h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
              {open === c.id ? (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!Number(amt)) return; addPayment({ customerId: c.id, amount: Number(amt), date: new Date().toISOString().slice(0, 10) }).then(() => toast.success(`${inr(Number(amt))} recorded`), (er: Error) => toast.error(er.message)); setAmt(""); setOpen(null); }}>
                  <input autoFocus type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount ₹" className="flex-1 rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
                  <button className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Save</button>
                </form>
              ) : (
                isAdmin && <button onClick={() => setOpen(c.id)} className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Record payment</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
