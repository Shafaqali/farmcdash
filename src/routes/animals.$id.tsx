import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Syringe, Scale, CalendarDays, IndianRupee, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, inr, chargesFor, TODAY, fmtDate, monShort, uploadAnimalPhoto, isoToday, STATUSES, type Animal, type Status } from "@/lib/farm-data";
import { AnimalPhotoPicker } from "@/components/AnimalPhotoPicker";
import { AnimalQR } from "@/components/AnimalQR";
import { AnimalPayments } from "@/components/AnimalPayments";
import { FarmExport } from "@/components/FarmExport";
import { CustomerAnimalPayments } from "@/components/CustomerAnimalPayments";
import { AnimalHealth } from "@/components/AnimalHealth";
import { canManageAnimal } from "@/lib/account-access";
import { loadCustomerPortal } from "@/lib/customer-portal";
import { field, F } from "@/components/form";
import { Button } from "@/components/ui/button";
import { DeleteConfirmation } from "@/components/DeleteConfirmation";
import { AnimalGrowthPhotos } from "@/components/AnimalGrowthPhotos";
import { AnimalQuickSummary } from "@/components/AnimalQuickSummary";
import type { HealthRecord } from "@/lib/animal-health-summary";

export const Route = createFileRoute("/animals/$id")({
  head: ({ params }) => ({ meta: [
    { title: `${params.id} — STAR GOATS FARM` },
    { name: "description", content: `Care record, weight trend and QR tag for animal ${params.id}.` },
    { property: "og:title", content: `${params.id} — STAR GOATS FARM` },
    { property: "og:description", content: `Care record for animal ${params.id}.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { allAnimals, customers, uid, loading, role } = useFarm();
  const [remote, setRemote] = useState<Animal | null>(null);
  const [pending, setPending] = useState(true);
  const [linkedName, setLinkedName] = useState("");
  const healthScope = `${uid}:${id}`;
  const [health, setHealth] = useState<{ scope: string; record: HealthRecord | null | undefined }>({scope: "", record: undefined});
  const onLatestHealth = useCallback((record: HealthRecord | null | undefined) => setHealth({scope: healthScope, record}), [healthScope]);
  const own = allAnimals.find((x) => x.id.toLowerCase() === id.toLowerCase());
  const a = own ?? remote;
  useEffect(() => { let active = true; setRemote(null); setPending(true); setLinkedName(""); void (async () => {
    try {
      if (role === "customer") {
        const portal = await loadCustomerPortal(uid ?? undefined);
        const linked = portal.animals.find((x) => x.id.toLowerCase() === id.toLowerCase());
        if (linked) { if (active) { setRemote(linked); setLinkedName(portal.customers.find((c) => c.id === linked.ownerId)?.name ?? ""); } return; }
      }
      if (!own) { const { data, error } = await supabase.rpc("shared_animal", { _animal_id: id }); if (error) throw error; if (active) setRemote(data as unknown as Animal | null); }
    } finally { if (active) setPending(false); }
  })().catch(() => { if (active) setPending(false); }); return () => { active = false; }; }, [id, uid, role, own]);
  const [info, setInfo] = useState<{ animalId: string; registered_by: string | null; user_code: string | null; owner_name: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    setInfo(null);
    if (!a) return;
    const animalId = a.id;
    void supabase.rpc("animal_owner_info", { _animal_id: animalId }).then(({ data }) => { if (active) setInfo(data?.[0] ? { ...data[0], animalId } : null); });
    return () => { active = false; };
  }, [a?.id, uid]);
  if (!a) return <div className="py-20 text-center"><p className="text-muted-foreground">{loading || pending ? "Loading…" : `No animal with ID ${id}`}</p><Link to={role === "customer" ? "/my-animals" : "/animals"} className="mt-4 inline-block font-semibold text-primary">Back to animals</Link></div>;
  const owner = customers.find((c) => c.id === a.ownerId);
  const mine = canManageAnimal(role, uid, a.userId);
  const overdue = a.vaccineDue !== "" && Date.parse(a.vaccineDue) < TODAY;
  const label = `${a.species}${a.sub ? " · " + a.sub : ""}`;
  const visibleInfo = info?.animalId === a.id ? info : null;
  const ownerName = linkedName || owner?.name || visibleInfo?.owner_name || "Personal farm animal";
  const regBy = visibleInfo?.registered_by ? `${visibleInfo.registered_by}${visibleInfo.user_code ? ` (${visibleInfo.user_code})` : ""}` : "—";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to={role === "customer" ? "/my-animals" : "/animals"} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />{role === "customer" ? "My animals" : "Animals"}</Link>{mine && <FarmExport scope={{ kind: "animal", id: a.id }} />}</div>
      <AnimalGrowthPhotos key={`${uid}:${a.id}`} animalId={a.id} revision={a.photoPath} fallbackUrl={a.photoUrl} allowed={mine || (role === "customer" && !!linkedName)} />
      <section className="bg-hero animate-rise flex items-center gap-4 rounded-3xl p-5 text-primary-foreground shadow-float">
        <AnimalQR id={a.id} label={label} />
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold break-all">{a.id}</p>
          <p className="opacity-85">{label}</p>
          {a.breed && a.breed !== a.sub && <p className="text-sm opacity-75">{a.breed}</p>}
          <p className="mt-1 text-sm opacity-75">Owner: {ownerName}</p>
          <p className="text-sm opacity-75">Registered by: {regBy}</p>
          <span className="mt-2 inline-block rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-semibold">{a.status}{a.status === "Sold" && a.soldDate ? ` · ${fmtDate(a.soldDate)}` : ""}</span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        {[
          { i: CalendarDays, l: "Caring started", v: fmtDate(a.arrival) },
          { i: IndianRupee, l: a.status === "Sold" ? "Sold for" : "Charges so far", v: !mine ? "—" : a.status === "Sold" && a.soldPrice != null ? inr(a.soldPrice) : inr(chargesFor(a)) },
          { i: Scale, l: "Latest weight", v: a.weights.at(-1) ? `${a.weights.at(-1)?.kg} kg` : "—" },
          { i: Syringe, l: overdue ? "Vaccine overdue" : "Next vaccine", v: fmtDate(a.vaccineDue), bad: overdue },
        ].map((s, i) => (
          <div key={s.l} className="card-soft animate-rise p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <s.i className={`h-5 w-5 ${s.bad ? "text-destructive" : "text-primary"}`} />
            <p className="mt-2 font-semibold">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      {mine ? <AnimalPayments animalId={a.id} /> : <CustomerAnimalPayments animalId={a.id} />}
      <AnimalHealth key={`${uid}:${a.id}`} animalId={a.id} editable={mine} onLatestChange={onLatestHealth} />
      {a.notes && <p className="card-soft p-4 text-sm text-muted-foreground">{a.notes}</p>}
      {a.weights.length > 1 && (
        <section className="card-soft animate-rise p-4">
          <h2 className="mb-2 text-lg font-bold">Weight trend</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <AreaChart data={a.weights} margin={{ left: -20, right: 6 }}>
                <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tickFormatter={(d) => monShort(d) ?? ""} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} formatter={(v) => `${String(v)} kg`} />
                <Area type="monotone" dataKey="kg" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#w)" dot={{ r: 3, fill: "var(--chart-1)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      <section className="card-soft animate-rise p-4">
        <h2 className="mb-2 text-lg font-bold">Vaccination history</h2>
        {a.vaccinations.length ? (
          <ul className="divide-y text-sm">{a.vaccinations.map((v) => <li key={v.id} className="flex justify-between py-2"><span className="font-medium">{v.name}</span><span className="text-muted-foreground">{fmtDate(v.date)}</span></li>)}</ul>
        ) : <p className="text-sm text-muted-foreground">No vaccines recorded yet.</p>}
      </section>
      {mine ? <AdminPanel key={a.id} a={a} /> : <p className="text-center text-xs text-muted-foreground">Only the person who registered this animal can edit it.</p>}
      <AnimalQuickSummary animal={a} ownerName={ownerName} registeredBy={regBy} health={health.scope === healthScope ? health.record : undefined} privateAccess={mine || (role === "customer" && !!linkedName)} />
    </div>
  );
}

const tabs = ["Weight", "Vaccine", "Status", "Details", "Photo"] as const;

function AdminPanel({ a }: { a: Animal }) {
  const { reload, customers, categories } = useFarm();
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Weight");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [deleting, setDeleting] = useState<{ title: string; action: () => Promise<void> } | null>(null);
  const [kg, setKg] = useState(""); const [wDate, setWDate] = useState(isoToday());
  const [vName, setVName] = useState(""); const [vDate, setVDate] = useState(isoToday()); const [vNext, setVNext] = useState("");
  const [status, setStatus] = useState<Status>(a.status); const [soldDate, setSoldDate] = useState(a.soldDate ?? isoToday()); const [soldPrice, setSoldPrice] = useState(a.soldPrice?.toString() ?? "");
  const [d, setD] = useState({ categoryId: a.categoryId, subcategoryId: a.subcategoryId ?? "", breed: a.breed, ownerId: a.ownerId, monthlyCharge: String(a.monthlyCharge), arrival: a.arrival, notes: a.notes, vaccineDue: a.vaccineDue });
  useEffect(() => { setD(previous => ({ ...previous, vaccineDue: a.vaccineDue })); }, [a.vaccineDue]);

  const run = async (fn: () => Promise<unknown>, msg: string, propagate = false) => {
    setBusy(true);
    try { await fn(); await reload(); toast.success(msg); }
    catch (err) { if (propagate) throw err; toast.error(err instanceof Error ? err.message : "Update failed"); }
    finally { setBusy(false); }
  };
  const chk = <T,>(r: { error: unknown } & T) => { if (r.error) throw new Error(typeof r.error === "object" && "message" in r.error ? String(r.error.message) : "Update failed"); return r; };
  const btn = <button disabled={busy} className="bg-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-primary-foreground shadow-float disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>;
  const tops = categories.filter((c) => !c.parentId);
  const subs = categories.filter((c) => c.parentId === d.categoryId);

  return (
    <section className="card-soft animate-rise space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" />Update record</h2>
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t}</button>)}
      </div>

      {tab === "Weight" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!Number(kg)) { toast.error("Enter weight"); return; } void run(async () => { chk(await supabase.from("weights").insert({ animal_id: a.id, kg: Number(kg), date: wDate })); setKg(""); }, "Weight added"); }}>
        <div className="grid grid-cols-2 gap-3"><F label="Weight (kg)"><input type="number" step="0.1" className={field} value={kg} onChange={(e) => setKg(e.target.value)} /></F><F label="Date"><input type="date" className={field} value={wDate} onChange={(e) => setWDate(e.target.value)} /></F></div>
        {btn}
        {a.weights.length > 0 && <ul className="divide-y text-sm">{[...a.weights].reverse().map((w) => <li key={w.id} className="flex items-center justify-between py-2"><span>{fmtDate(w.date)}</span><span className="flex items-center gap-3 font-medium">{w.kg} kg<Button type="button" variant="ghost" size="icon" aria-label="Delete weight" title="Delete weight" disabled={busy} onClick={() => setDeleting({ title: "Delete weight record?", action: () => run(async () => chk(await supabase.from("weights").delete().eq("id", w.id)), "Removed", true) })}><Trash2 className="h-4 w-4 text-destructive" /></Button></span></li>)}</ul>}
      </form>}

      {tab === "Vaccine" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!vName.trim()) { toast.error("Enter vaccine name"); return; } void run(async () => {
        chk(await supabase.rpc("record_owned_vaccination", { _animal_id: a.id, _name: vName.trim(), _date: vDate, ...(vNext ? { _next_due: vNext } : {}), ...(a.vaccineDue ? { _previous_due: a.vaccineDue } : {}) }));
        setVName(""); setVNext("");
      }, "Vaccine recorded"); }}>
        <p className="rounded-xl bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">Saving completes the current vaccination reminder, even when given early. Enter the next due date to schedule the next reminder, or leave it empty to clear the schedule.</p>
        <F label="Vaccine name"><input className={field} value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. FMD, PPR, HS" /></F>
        <div className="grid grid-cols-2 gap-3"><F label="Given on"><input type="date" required max={isoToday()} className={field} value={vDate} onChange={(e) => setVDate(e.target.value)} /></F><F label="Next due"><input type="date" min={vDate} className={field} value={vNext} onChange={(e) => setVNext(e.target.value)} /></F></div>
        {btn}
      </form>}

      {tab === "Status" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => chk(await supabase.from("animals").update({ status, sold_date: status === "Sold" ? soldDate : null, sold_price: status === "Sold" && soldPrice ? Number(soldPrice) : null }).eq("id", a.id)), `Marked ${status}`); }}>
        <div className="grid grid-cols-2 gap-2">{STATUSES.map((s) => <button type="button" key={s} onClick={() => setStatus(s)} className={`rounded-2xl border py-3 text-sm font-semibold ${status === s ? "border-primary bg-secondary text-primary" : "text-muted-foreground"}`}>{s}</button>)}</div>
        {status === "Sold" && <div className="grid grid-cols-2 gap-3"><F label="Sold on"><input type="date" className={field} value={soldDate} onChange={(e) => setSoldDate(e.target.value)} /></F><F label="Sale price (₹)"><input type="number" className={field} value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} /></F></div>}
        {btn}
      </form>}

      {tab === "Details" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => chk(await supabase.from("animals").update({ category_id: d.categoryId, subcategory_id: d.subcategoryId || null, breed: d.breed, owner_id: d.ownerId || null, arrival: d.arrival, monthly_charge: d.ownerId ? Number(d.monthlyCharge) || 0 : 0, notes: d.notes, vaccine_due: d.vaccineDue || null }).eq("id", a.id)), "Details saved"); }}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Category"><select className={field} value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value, subcategoryId: "" })}>{tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Sub-category"><select className={field} value={d.subcategoryId} onChange={(e) => setD({ ...d, subcategoryId: e.target.value })}><option value="">—</option>{subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        </div>
        <F label="Breed / details"><input className={field} value={d.breed} onChange={(e) => setD({ ...d, breed: e.target.value })} /></F>
        <F label="Owner"><select className={field} value={d.ownerId} onChange={(e) => setD({ ...d, ownerId: e.target.value })}><option value="">Personal farm animal</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3">
          {d.ownerId && <F label="Monthly charge (₹)"><input type="number" className={field} value={d.monthlyCharge} onChange={(e) => setD({ ...d, monthlyCharge: e.target.value })} /></F>}
          <F label="Next vaccine"><input type="date" className={field} value={d.vaccineDue} onChange={(e) => setD({ ...d, vaccineDue: e.target.value })} /></F>
        </div>
        <F label="Caring started on"><input type="date" required className={field} value={d.arrival} onChange={(e) => setD({ ...d, arrival: e.target.value })} /></F>
        <F label="Notes"><textarea rows={3} className={field} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></F>
        {btn}
        <Button type="button" variant="outline" disabled={busy} onClick={() => setDeleting({ title: `Delete ${a.id}?`, action: () => run(async () => { chk(await supabase.rpc("delete_owned_animal", { _animal_id: a.id })); await nav({ to: "/animals" }); }, "Animal deleted", true) })} className="w-full border-destructive/30 text-destructive"><Trash2 className="h-4 w-4" />Delete animal</Button>
      </form>}

      {tab === "Photo" && <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Upload a photo each month to compare growth. Earlier photos are kept.</p>
        <AnimalPhotoPicker key={a.id} value={photo} onChange={setPhoto} disabled={busy} onProcessingChange={setPhotoProcessing} />
        <Button type="button" className="w-full" disabled={busy || photoProcessing || !photo} onClick={() => {
          if (!photo || busy || photoProcessing) return;
          void run(async () => { const path = await uploadAnimalPhoto(a.id, photo); chk(await supabase.from("animals").update({ photo_url: path }).eq("id", a.id)); setPhoto(null); }, "Photo updated");
        }}>{busy ? "Uploading photo..." : "Upload photo"}</Button>
      </div>}
      <DeleteConfirmation open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} title={deleting?.title ?? "Delete record?"} description="This record will be permanently removed. This cannot be undone." onConfirm={async () => { if (deleting) await deleting.action(); }} />
    </section>
  );
}
