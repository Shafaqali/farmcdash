import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ScanLine, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, fmtDate, inr } from "@/lib/farm-data";
import { loadCustomerPortal, type PortalData } from "@/lib/customer-portal";
import { customerAccount } from "@/lib/customer-account";
import logo from "@/assets/farmcare-header-logo.png.asset.json";

export const Route = createFileRoute("/my-animals")({
  head: () => ({ meta: [{ title: "My animals — FarmCare" }, { name: "description", content: "Private customer animal, vaccine and payment records." }, { property: "og:title", content: "My animals — FarmCare" }, { property: "og:description", content: "View your linked animal care records securely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CustomerPortal,
});
function CustomerPortal() {
  const { uid } = useFarm();
  const [data, setData] = useState<PortalData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const refresh = async (connect = false) => {
    const current = ++request.current;
    setBusy(true); setError(""); setData(null);
    try { if (connect) { const r = await supabase.rpc("connect_customer", { _code: code }); if (r.error) throw r.error; if (current === request.current) setCode(""); } const result = await loadCustomerPortal(); if (current === request.current) setData(result); }
    catch (e) { if (current === request.current) setError(e instanceof Error ? e.message : "Unable to load customer records."); }
    finally { if (current === request.current) setBusy(false); }
  };
  useEffect(() => { setData(null); void refresh(); return () => { request.current++; }; }, [uid]);
  return <div className="mx-auto min-h-svh max-w-2xl px-5 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b py-4"><img src={logo.url} alt="FarmCare" className="h-14 w-52 object-contain object-left" /><div className="flex gap-1"><Button asChild variant="ghost" size="icon" title="Scan animal QR"><Link to="/scan"><ScanLine /></Link></Button><Button variant="ghost" size="icon" title="Refresh records" disabled={busy} onClick={() => void refresh()}><RefreshCw /></Button><Button variant="ghost" size="icon" title="Sign out" onClick={() => { setData(null); void supabase.auth.signOut(); }}><LogOut /></Button></div></header>
    <h1 className="mt-6 text-3xl font-semibold">My animals</h1>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {busy && <p className="py-6 text-muted-foreground">Loading…</p>}
    {data?.customers.map((c) => { const account = customerAccount(c.id, data.animals, data.payments); return <section key={c.id} className="mt-6 space-y-4 border-b pb-6"><h2 className="text-xl font-semibold">{c.name}</h2><dl className="grid grid-cols-2 gap-3 border-y py-4 text-sm"><div><dt>Payments received</dt><dd className="mt-1 font-semibold text-primary">{inr(account.totalPaid)}</dd></div><div><dt>Balance</dt><dd className="mt-1 font-semibold">{inr(account.balance)}</dd></div></dl>
      {account.entries.map(({ animal, periods, remaining, nextDate }) => <article key={animal.id} className="rounded-lg border bg-card p-4"><Link to="/animals/$id" params={{ id: animal.id }} className="break-all text-lg font-semibold text-primary">{animal.id}</Link><p className="text-sm text-muted-foreground">{animal.species} · {animal.breed} · {animal.status}</p><p className="mt-3 text-sm">Vaccine due: {fmtDate(animal.vaccineDue)}</p><p className="text-sm">Monthly care: {inr(animal.monthlyCharge)} · Unpaid: {inr(remaining)}</p>{nextDate && <p className="text-sm">Next collection: {fmtDate(nextDate)}</p>}<details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Care months</summary><ul className="divide-y">{periods.slice().reverse().map((p) => <li key={p.start} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.start)}</span><span>{p.remaining ? `${inr(p.remaining)} due` : "Paid"}</span></li>)}</ul></details><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Weight & vaccines</summary>{animal.weights.map((w) => <p key={w.id} className="mt-2 text-sm">{fmtDate(w.date)} · {w.kg} kg</p>)}{animal.vaccinations.map((v) => <p key={v.id} className="mt-2 text-sm">{v.name} · {fmtDate(v.date)} · Next {fmtDate(v.nextDue ?? "")}</p>)}</details></article>)}
      <h3 className="font-semibold">Payment history</h3>{account.history.map((p) => <p key={p.id} className="border-b py-2 text-sm">{fmtDate(p.date)} · {inr(p.amount)} · {p.animalId ?? "Unassigned"}{p.periodStart ? ` · Care ${fmtDate(p.periodStart)}` : ""}</p>)}
    </section>; })}
    <form className="mt-6 space-y-3 border-t pt-5" onSubmit={(e) => { e.preventDefault(); void refresh(true); }}><label htmlFor="connection-code" className="text-sm font-medium">Connection code from your farm</label><Input id="connection-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" required /><Button disabled={busy || !code.trim()}>Connect my animals</Button></form>
  </div>;
}