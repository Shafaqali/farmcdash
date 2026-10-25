import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Syringe, Scale, CalendarDays, IndianRupee, Camera, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, inr, chargesFor, TODAY, fmtDate, monShort, uploadAnimalPhoto, isoToday, STATUSES, type Animal, type Status } from "@/lib/farm-data";
import { AnimalQR } from "@/components/AnimalQR";
import { field, F } from "@/components/form";

export const Route = createFileRoute("/animals/$id")({
  head: ({ params }) => ({ meta: [
    { title: `${params.id} — FarmCare` },
    { name: "description", content: `Care record, weight trend and QR tag for animal ${params.id}.` },
    { property: "og:title", content: `${params.id} — FarmCare` },
    { property: "og:description", content: `Care record for animal ${params.id}.` },
  ] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { allAnimals, customers, uid, loading } = useFarm();
  const a = allAnimals.find((x) => x.id.toLowerCase() === id.toLowerCase());
  const [info, setInfo] = useState<{ registered_by: string | null; user_code: string | null; owner_name: string | null } | null>(null);
  useEffect(() => {
    if (!a) return;
    void supabase.rpc("animal_owner_info", { _animal_id: a.id }).then(({ data }) => setInfo(data?.[0] ?? null));
  }, [a?.id]);
  if (!a) return <div className="py-20 text-center"><p className="text-muted-foreground">{loading ? "Loading…" : `No animal with ID ${id}`}</p><Link to="/animals" className="mt-4 inline-block font-semibold text-primary">Back to animals</Link></div>;
  const owner = customers.find((c) => c.id === a.ownerId);
  const mine = a.userId === uid;
  const overdue = a.vaccineDue !== "" && Date.parse(a.vaccineDue) < TODAY;
  const label = `${a.species}${a.sub ? " · " + a.sub : ""}`;
  const ownerName = owner?.name ?? info?.owner_name ?? "—";
  const regBy = info?.registered_by ? `${info.registered_by}${info.user_code ? ` (${info.user_code})` : ""}` : "—";
  return (
    <div className="space-y-4">
      <Link to="/animals" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Animals</Link>
      {a.photoUrl && <img src={a.photoUrl} alt={`Animal ${a.id}`} className="animate-rise aspect-[4/3] w-full rounded-3xl object-cover shadow-float" />}
      <section className="bg-hero animate-rise flex items-center gap-4 rounded-3xl p-5 text-primary-foreground shadow-float">
        <AnimalQR id={a.id} label={label} />
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold break-all">{a.id}</p>
          <p className="opacity-85">{label}</p>
          {a.breed && a.breed !== a.sub && <p className="text-sm opacity-75">{a.breed}</p>}
          <p className="mt-1 text-sm opacity-75">Owner: {ownerName}</p>
          <p className="text-sm opacity-75">Registered by: {regBy}</p>
          <span className="mt-2 inline-block rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-semibold">{a.status}{a.status === "Sold" && a.soldDate ? ` · ${fmtDate(a.soldDate)}` : ""}</span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        {[
          { i: CalendarDays, l: "Arrived", v: fmtDate(a.arrival) },
          { i: IndianRupee, l: a.status === "Sold" ? "Sold for" : "Charges so far", v: !mine ? "—" : a.status === "Sold" && a.soldPrice != null ? inr(a.soldPrice) : inr(chargesFor(a)) },
          { i: Scale, l: "Latest weight", v: a.weights.length ? `${a.weights.at(-1)!.kg} kg` : "—" },
          { i: Syringe, l: overdue ? "Vaccine overdue" : "Next vaccine", v: fmtDate(a.vaccineDue), bad: overdue },
        ].map((s, i) => (
          <div key={s.l} className="card-soft animate-rise p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <s.i className={`h-5 w-5 ${s.bad ? "text-destructive" : "text-primary"}`} />
            <p className="mt-2 font-semibold">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      {a.notes && <p className="card-soft p-4 text-sm text-muted-foreground">{a.notes}</p>}
      {a.weights.length > 1 && (
        <section className="card-soft animate-rise p-4">
          <h2 className="mb-2 text-lg font-semibold">Weight trend</h2>
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
        <h2 className="mb-2 text-lg font-semibold">Vaccination history</h2>
        {a.vaccinations.length ? (
          <ul className="divide-y text-sm">{a.vaccinations.map((v) => <li key={v.id} className="flex justify-between py-2"><span className="font-medium">{v.name}</span><span className="text-muted-foreground">{fmtDate(v.date)}</span></li>)}</ul>
        ) : <p className="text-sm text-muted-foreground">No vaccines recorded yet.</p>}
      </section>
      {mine ? <AdminPanel a={a} /> : <p className="text-center text-xs text-muted-foreground">Only the person who registered this animal can edit it.</p>}
    </div>
  );
}

const tabs = ["Weight", "Vaccine", "Status", "Details", "Photo"] as const;

function AdminPanel({ a }: { a: Animal }) {
  const { reload, customers, categories } = useFarm();
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Weight");
  const [busy, setBusy] = useState(false);
  const [kg, setKg] = useState(""); const [wDate, setWDate] = useState(isoToday());
  const [vName, setVName] = useState(""); const [vDate, setVDate] = useState(isoToday()); const [vNext, setVNext] = useState("");
  const [status, setStatus] = useState<Status>(a.status); const [soldDate, setSoldDate] = useState(a.soldDate ?? isoToday()); const [soldPrice, setSoldPrice] = useState(a.soldPrice?.toString() ?? "");
  const [d, setD] = useState({ categoryId: a.categoryId, subcategoryId: a.subcategoryId ?? "", breed: a.breed, ownerId: a.ownerId, monthlyCharge: String(a.monthlyCharge), notes: a.notes, vaccineDue: a.vaccineDue });

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); await reload(); toast.success(msg); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Update failed"); }
    finally { setBusy(false); }
  };
  const chk = <T,>(r: { error: unknown } & T) => { if (r.error) throw r.error; return r; };
  const btn = <button disabled={busy} className="bg-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-primary-foreground shadow-float disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>;
  const tops = categories.filter((c) => !c.parentId);
  const subs = categories.filter((c) => c.parentId === d.categoryId);

  return (
    <section className="card-soft animate-rise space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />Update record</h2>
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t}</button>)}
      </div>

      {tab === "Weight" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!Number(kg)) { toast.error("Enter weight"); return; } void run(async () => { chk(await supabase.from("weights").insert({ animal_id: a.id, kg: Number(kg), date: wDate })); setKg(""); }, "Weight added"); }}>
        <div className="grid grid-cols-2 gap-3"><F label="Weight (kg)"><input type="number" step="0.1" className={field} value={kg} onChange={(e) => setKg(e.target.value)} /></F><F label="Date"><input type="date" className={field} value={wDate} onChange={(e) => setWDate(e.target.value)} /></F></div>
        {btn}
        {a.weights.length > 0 && <ul className="divide-y text-sm">{[...a.weights].reverse().map((w) => <li key={w.id} className="flex items-center justify-between py-2"><span>{fmtDate(w.date)}</span><span className="flex items-center gap-3 font-medium">{w.kg} kg<button type="button" aria-label="Delete" onClick={() => void run(async () => chk(await supabase.from("weights").delete().eq("id", w.id)), "Removed")}><Trash2 className="h-4 w-4 text-destructive" /></button></span></li>)}</ul>}
      </form>}

      {tab === "Vaccine" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!vName.trim()) { toast.error("Enter vaccine name"); return; } void run(async () => {
        chk(await supabase.from("vaccinations").insert({ animal_id: a.id, name: vName.trim(), date: vDate, next_due: vNext || null }));
        if (vNext) chk(await supabase.from("animals").update({ vaccine_due: vNext }).eq("id", a.id));
        setVName(""); setVNext("");
      }, "Vaccine recorded"); }}>
        <F label="Vaccine name"><input className={field} value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. FMD, PPR, HS" /></F>
        <div className="grid grid-cols-2 gap-3"><F label="Given on"><input type="date" className={field} value={vDate} onChange={(e) => setVDate(e.target.value)} /></F><F label="Next due"><input type="date" className={field} value={vNext} onChange={(e) => setVNext(e.target.value)} /></F></div>
        {btn}
      </form>}

      {tab === "Status" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => chk(await supabase.from("animals").update({ status, sold_date: status === "Sold" ? soldDate : null, sold_price: status === "Sold" && soldPrice ? Number(soldPrice) : null }).eq("id", a.id)), `Marked ${status}`); }}>
        <div className="grid grid-cols-2 gap-2">{STATUSES.map((s) => <button type="button" key={s} onClick={() => setStatus(s)} className={`rounded-2xl border py-3 text-sm font-semibold ${status === s ? "border-primary bg-secondary text-primary" : "text-muted-foreground"}`}>{s}</button>)}</div>
        {status === "Sold" && <div className="grid grid-cols-2 gap-3"><F label="Sold on"><input type="date" className={field} value={soldDate} onChange={(e) => setSoldDate(e.target.value)} /></F><F label="Sale price (₹)"><input type="number" className={field} value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} /></F></div>}
        {btn}
      </form>}

      {tab === "Details" && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => chk(await supabase.from("animals").update({ category_id: d.categoryId, subcategory_id: d.subcategoryId || null, breed: d.breed, owner_id: d.ownerId || null, monthly_charge: Number(d.monthlyCharge) || 0, notes: d.notes, vaccine_due: d.vaccineDue || null }).eq("id", a.id)), "Details saved"); }}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Category"><select className={field} value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value, subcategoryId: "" })}>{tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Sub-category"><select className={field} value={d.subcategoryId} onChange={(e) => setD({ ...d, subcategoryId: e.target.value })}><option value="">—</option>{subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        </div>
        <F label="Breed / details"><input className={field} value={d.breed} onChange={(e) => setD({ ...d, breed: e.target.value })} /></F>
        <F label="Owner"><select className={field} value={d.ownerId} onChange={(e) => setD({ ...d, ownerId: e.target.value })}><option value="">— No owner —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Monthly charge (₹)"><input type="number" className={field} value={d.monthlyCharge} onChange={(e) => setD({ ...d, monthlyCharge: e.target.value })} /></F>
          <F label="Next vaccine"><input type="date" className={field} value={d.vaccineDue} onChange={(e) => setD({ ...d, vaccineDue: e.target.value })} /></F>
        </div>
        <F label="Notes"><textarea rows={3} className={field} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></F>
        {btn}
        <button type="button" disabled={busy} onClick={() => { if (!confirm(`Delete ${a.id} permanently?`)) return; void run(async () => { chk(await supabase.from("animals").delete().eq("id", a.id)); nav({ to: "/animals" }); }, "Animal deleted"); }} className="w-full rounded-2xl border border-destructive/30 py-3 text-sm font-semibold text-destructive">Delete animal</button>
      </form>}

      {tab === "Photo" && <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Camera className="h-8 w-8 text-primary" />}
        <span className="font-semibold">{a.photoUrl ? "Replace photo" : "Add photo"}</span>
        <span className="text-xs text-muted-foreground">Take a picture or choose from gallery</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; void run(async () => { const path = await uploadAnimalPhoto(a.id, file); chk(await supabase.from("animals").update({ photo_url: path }).eq("id", a.id)); }, "Photo updated"); }} />
      </label>}
    </section>
  );
}
