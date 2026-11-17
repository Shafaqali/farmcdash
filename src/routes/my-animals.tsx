import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, PawPrint, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFarm, fmtDate } from "@/lib/farm-data";
import { loadCustomerPortal, type PortalData } from "@/lib/customer-portal";


export const Route = createFileRoute("/my-animals")({
  head: () => ({ meta: [{ title: "My animals — STAR GOATS FARM" }, { name: "description", content: "Private customer animal, vaccine and payment records." }, { property: "og:title", content: "My animals — STAR GOATS FARM" }, { property: "og:description", content: "View your linked animal care records securely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CustomerPortal,
});
export function CustomerPortal() {
  const { uid, userName } = useFarm();
  const [data, setData] = useState<PortalData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const refresh = async () => {
    const current = ++request.current;
    setBusy(true); setError("");
    try { const result = await loadCustomerPortal(); if (current === request.current) setData(result); }
    catch (e) { if (current === request.current) setError(e instanceof Error ? e.message : "Unable to load customer records."); }
    finally { if (current === request.current) setBusy(false); }
  };
  useEffect(() => { setData(null); void refresh(); return () => { request.current++; }; }, [uid]);
  return <div className="space-y-4">
    <div className="flex justify-end"><Button variant="ghost" size="icon" title="Refresh records" aria-label="Refresh records" disabled={busy} onClick={() => void refresh()}><RefreshCw /></Button></div>
    <div className="mt-6"><h1 className="text-3xl font-semibold">My animals</h1><p className="mt-2 text-sm text-muted-foreground">{userName}</p></div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {busy && <p className="py-6 text-muted-foreground">Loading…</p>}
    {data && !data.animals.length && <section className="mt-8 border-y py-8 text-center"><PawPrint className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">No animals assigned yet</h2></section>}
    {data?.customers.map((c) => <section key={c.id} className="mt-6 space-y-4 border-b pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{c.name}</h2>{c.farmPhone && <Button asChild variant="outline"><a href={`tel:${c.farmPhone}`}><Phone />Call {c.farmName || "farm owner"}</a></Button>}</div>
      {data.animals.filter((a) => a.ownerId === c.id).map((animal) => { const periods = data.paymentStatuses?.filter((p) => p.animalId === animal.id) ?? []; return <article key={animal.id} className="rounded-lg border bg-card p-4"><Link to="/animals/$id" params={{ id: animal.id }} className="break-all text-lg font-semibold text-primary">{animal.id}</Link><p className="text-sm text-muted-foreground">{animal.species} · {animal.breed} · {animal.status}</p><p className="mt-3 text-sm">Caring started: {fmtDate(animal.arrival)}</p><p className="text-sm">Vaccine due: {fmtDate(animal.vaccineDue)}</p><p className={periods.some((p) => p.status !== "Paid") ? "mt-3 font-medium text-destructive" : "mt-3 font-medium text-primary"}>{periods.some((p) => p.status !== "Paid") ? "Payment due" : "Paid / no payment due"}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Care months</summary><ul className="divide-y">{periods.slice().reverse().map((p) => <li key={p.periodStart} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fmtDate(p.periodStart)}</span><span>{p.status}</span></li>)}</ul></details></article>; })}
    </section>)}
  </div>;
}
