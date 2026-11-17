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
import { createCustomerLogin } from "@/lib/account-login";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [
    { title: "Customers — STAR GOATS FARM" },
    { name: "description", content: "Customer balances, payments and animals in care." },
    { property: "og:title", content: "Customers — STAR GOATS FARM" },
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
  const { customers, animals, isAdmin, reload } = useFarm();
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", address: "", email: "", loginId: "", password: "" });
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const visible = customers.filter((c) => `${c.name} ${c.phone} ${c.address} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle eyebrow={`${customers.length} customers`} title="Customers"
        action={<Button onClick={() => setAdding(true)} className="shrink-0"><Plus />Add</Button>} />
      <div className="relative mb-4"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search customers" placeholder="Search name, phone, email or address" className="h-11 bg-card pl-10" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle>Add customer</DialogTitle><DialogDescription>Customer contact details</DialogDescription>
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (saving) return; setSaving(true); try { await createCustomerLogin(nc); await reload(); toast.success("Customer and login created"); setNc({ name: "", phone: "", address: "", email: "", loginId: "", password: "" }); setAdding(false); } catch (er) { toast.error(er instanceof Error ? er.message : "Unable to save customer"); } finally { setSaving(false); } }}>
          <label className="block space-y-2 text-sm">Name<Input required value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Phone<Input type="tel" required pattern="[+0-9 ()-]{7,20}" autoComplete="tel" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Email<Input type="email" required autoComplete="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Address<Input required autoComplete="street-address" value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Login ID<Input required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autoComplete="off" autoCapitalize="none" value={nc.loginId} onChange={(e) => setNc({ ...nc, loginId: e.target.value })} /></label>
          <label className="block space-y-2 text-sm">Password<Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={nc.password} onChange={(e) => setNc({ ...nc, password: e.target.value })} /></label>
          <Button disabled={saving} className="w-full">{saving ? "Saving…" : "Save customer"}</Button>
        </form>
      </DialogContent></Dialog>
      {customers.length === 0 && !adding && <p className="py-10 text-center text-sm text-muted-foreground">No customers yet. Tap Add to create one.</p>}
      <ul className="space-y-3">
        {visible.map((c, i) => {
          const mine = animals.filter((a) => a.ownerId === c.id);
          return (
            <li key={c.id} className="animate-rise rounded-lg border bg-card p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <Link to="/customers/$id" params={{ id: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary font-semibold text-primary">{c.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{c.name}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address || c.village}</span><span>{mine.length} animals</span></p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                {c.phone && <Button asChild variant="secondary" size="icon"><a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}><Phone /></a></Button>}
              </div>
              {isAdmin && <div className="mt-3"><CustomerPayments customerId={c.id} /></div>}
            </li>
          );
        })}
      </ul>
      {customers.length > 0 && !visible.length && <p className="py-10 text-center text-sm text-muted-foreground">No customers found.</p>}
    </div>
  );
}
