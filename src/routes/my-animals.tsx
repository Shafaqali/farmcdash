import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, RefreshCw, LogOut, Link2, PawPrint, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, fmtDate, inr } from "@/lib/farm-data";
import { connectCustomer, loadCustomerPortal, pendingCustomerInvitation, type PortalData } from "@/lib/customer-portal";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { customerAccount } from "@/lib/customer-account";
import logo from "@/assets/farmcare-header-logo.png.asset.json";

export const Route = createFileRoute("/my-animals")({
  head: () => ({ meta: [{ title: "My animals — FarmCare" }, { name: "description", content: "Private customer animal, vaccine and payment records." }, { property: "og:title", content: "My animals — FarmCare" }, { property: "og:description", content: "View your linked animal care records securely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CustomerPortal,
});
export function CustomerPortal() {
  const { uid, session } = useFarm();
  const [data, setData] = useState<PortalData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const request = useRef(0);
  const refresh = async (connect = false) => {
    const current = ++request.current;
    setBusy(true); setError(""); setConnected(false);
    try { if (connect) { await connectCustomer(code); if (current === request.current) { setCode(""); setConnectOpen(false); setConnected(true); } } const result = await loadCustomerPortal(); if (current === request.current) setData(result); }
    catch (e) { if (current === request.current) setError(e instanceof Error ? e.message : "Unable to load customer records."); }
    finally { if (current === request.current) setBusy(false); }
  };
  useEffect(() => { setData(null); void refresh(); return () => { request.current++; }; }, [uid]);
  useEffect(() => {
    const invitation = pendingCustomerInvitation();
    if (invitation) { setCode(invitation.code); setConnectOpen(true); }
  }, []);
  return <div className="mx-auto min-h-svh max-w-2xl px-5 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b py-4"><img src={logo.url} alt="FarmCare" className="h-14 w-52 max-w-full object-contain object-left" /><div className="flex gap-1"><Button asChild variant="ghost" size="icon" title="Scan animal QR" aria-label="Scan animal QR"><Link to="/scan"><ScanLine /></Link></Button><Button variant="ghost" size="icon" title="Refresh records" aria-label="Refresh records" disabled={busy} onClick={() => void refresh()}><RefreshCw /></Button><Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={() => { setData(null); void supabase.auth.signOut(); }}><LogOut /></Button></div></header>
    <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Customer account</p><h1 className="mt-1 text-3xl font-semibold">My animals</h1></div><Button onClick={() => { setError(""); setConnectOpen(true); }}><Link2 />Connect animals</Button></div>
    <p className="mt-3 break-all text-sm text-muted-foreground">{session?.user.email}</p>
    {connected && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-5 w-5" />Your customer account is connected.</p>}
    {error && !connectOpen && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {busy && <p className="py-6 text-muted-foreground">Loading…</p>}
    {data && !data.customers.length && <section className="mt-8 border-y py-8 text-center"><PawPrint className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">No farm connected</h2><Button className="mt-5" variant="outline" onClick={() => setConnectOpen(true)}><Link2 />Connect my animals</Button></section>}
    {data?.customers.map((c) => { const account = customerAccount(c.id, data.animals, data.payments); return <section key={c.id} className="mt-6 space-y-4 border-b pb-6"><h2 className="text-xl font-semibold">{c.name}</h2><dl className="grid grid-cols-2 gap-3 border-y py-4 text-sm"><div><dt>Payments received</dt><dd className="mt-1 font-semibold text-primary">{inr(account.totalPaid)}</dd></div><div><dt>Balance</dt><dd className="mt-1 font-semibold">{inr(account.balance)}</dd></div></dl>
      {!account.entries.length && <p className="text-sm text-muted-foreground">No animals assigned to this customer yet.</p>}
      {account.entries.map(({ animal, periods, remaining, nextDate }) => <article key={animal.id} className="rounded-lg border bg-card p-4"><Link to="/animals/$id" params={{ id: animal.id }} className="break-all text-lg font-semibold text-primary">{animal.id}</Link><p className="text-sm text-muted-foreground">{animal.species} · {animal.breed} · {animal.status}</p><p className="mt-3 text-sm">Vaccine due: {fmtDate(animal.vaccineDue)}</p><p className="text-sm">Monthly care: {inr(animal.monthlyCharge)} · Unpaid: {inr(remaining)}</p>{nextDate && <p className="text-sm">Next collection: {fmtDate(nextDate)}</p>}<details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Care months</summary><ul className="divide-y">{periods.slice().reverse().map((p) => <li key={p.start} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.start)}</span><span>{p.remaining ? `${inr(p.remaining)} due` : "Paid"}</span></li>)}</ul></details><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Weight & vaccines</summary>{animal.weights.map((w) => <p key={w.id} className="mt-2 text-sm">{fmtDate(w.date)} · {w.kg} kg</p>)}{animal.vaccinations.map((v) => <p key={v.id} className="mt-2 text-sm">{v.name} · {fmtDate(v.date)} · Next {fmtDate(v.nextDue ?? "")}</p>)}</details></article>)}
      <h3 className="font-semibold">Payment history</h3>{account.history.map((p) => <p key={p.id} className="border-b py-2 text-sm">{fmtDate(p.date)} · {inr(p.amount)} · {p.animalId ?? "Unassigned"}{p.periodStart ? ` · Care ${fmtDate(p.periodStart)}` : ""}</p>)}
    </section>; })}
    <Dialog open={connectOpen} onOpenChange={(open) => { if (!busy) { setConnectOpen(open); setError(""); } }}><DialogContent><DialogTitle>Connect my animals</DialogTitle><DialogDescription>Accept your farm's invitation using the same email it was issued to. Only your assigned animals and payments will be linked.</DialogDescription><p className="break-all text-sm">Signed in as <strong>{session?.user.email}</strong></p><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!busy) void refresh(true); }}><label htmlFor="connection-code" className="block text-sm font-medium">Connection code from your farm</label><Input id="connection-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required disabled={busy} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={busy || !code.trim()}><Link2 />{busy ? "Connecting…" : "Connect my animals"}</Button></form></DialogContent></Dialog>
  </div>;
}