import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { field, F } from "@/components/form";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, uploadAnimalPhoto, isoToday, STATUSES, type Status } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/animals/new")({
  head: () => ({ meta: [
    { title: "Register animal — FarmCare" },
    { name: "description", content: "Add a new animal with category, photo and auto QR tag." },
    { property: "og:title", content: "Register animal — FarmCare" },
    { property: "og:description", content: "Add a new animal to your farm records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NewAnimal,
});


function NewAnimal() {
  const { customers, categories, isAdmin, reload } = useFarm();
  const nav = useNavigate();
  const tops = categories.filter((c) => !c.parentId);
  const [f, setF] = useState({ categoryId: "", subcategoryId: "", breed: "", ownerId: "", arrival: isoToday(), monthlyCharge: "", status: "Active" as Status, weight: "", vaccineDue: "", notes: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const catId = f.categoryId || tops[0]?.id || "";
  const subs = categories.filter((c) => c.parentId === catId);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  if (!isAdmin) return <p className="py-20 text-center text-muted-foreground">Only an admin can register animals.</p>;

  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!catId) { toast.error("Add a category first"); return; }
      setBusy(true);
      try {
        const sub = categories.find((c) => c.id === f.subcategoryId);
        const { data, error } = await supabase.from("animals").insert({
          id: "", category_id: catId, subcategory_id: f.subcategoryId || null, breed: f.breed.trim() || sub?.name || "",
          owner_id: f.ownerId || null, arrival: f.arrival, monthly_charge: Number(f.monthlyCharge) || 0, status: f.status,
          vaccine_due: f.vaccineDue || null, notes: f.notes, sold_date: f.status === "Sold" ? isoToday() : null,
        }).select("id").single();
        if (error) throw error;
        const id = data.id;
        if (f.weight) await supabase.from("weights").insert({ animal_id: id, date: f.arrival, kg: Number(f.weight) });
        if (photo) { const path = await uploadAnimalPhoto(id, photo); await supabase.from("animals").update({ photo_url: path }).eq("id", id); }
        await reload();
        toast.success(`${id} registered — QR code ready`);
        nav({ to: "/animals/$id", params: { id } });
      } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
      finally { setBusy(false); }
    }}>
      <Link to="/animals" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Animals</Link>
      <PageTitle title="Register animal" />
      <section className="card-soft animate-rise space-y-4 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          {photo ? <img src={URL.createObjectURL(photo)} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-secondary text-primary"><Camera className="h-6 w-6" /></span>}
          <span className="text-sm font-semibold text-primary">{photo ? "Change photo" : "Add animal photo"}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <F label="Category">
          <div className="flex flex-wrap gap-2">
            {tops.map((s) => (
              <button type="button" key={s.id} onClick={() => setF({ ...f, categoryId: s.id, subcategoryId: "" })} className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${catId === s.id ? "border-primary bg-secondary text-primary" : "text-muted-foreground"}`}>{s.name}</button>
            ))}
            <Link to="/categories" className="rounded-2xl border border-dashed px-4 py-2.5 text-sm text-muted-foreground">+ Manage</Link>
          </div>
        </F>
        {subs.length > 0 && <F label="Sub-category"><select className={field} value={f.subcategoryId} onChange={set("subcategoryId")}><option value="">— Choose —</option>{subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>}
        <F label="Breed / details"><input className={field} value={f.breed} onChange={set("breed")} placeholder="Optional" /></F>
        <F label="Owner"><select className={field} value={f.ownerId} onChange={set("ownerId")}><option value="">— No owner —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
      </section>
      <section className="card-soft animate-rise space-y-4 p-4" style={{ animationDelay: "80ms" }}>
        <h2 className="text-lg font-semibold">Care</h2>
        <F label="Arrival date"><input type="date" className={field} value={f.arrival} onChange={set("arrival")} /></F>
        <F label="Monthly care charge (₹)"><input type="number" inputMode="numeric" className={field} value={f.monthlyCharge} onChange={set("monthlyCharge")} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Status"><select className={field} value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></F>
          <F label="Weight (kg)"><input type="number" className={field} value={f.weight} onChange={set("weight")} placeholder="Optional" /></F>
        </div>
        <F label="Next vaccine due"><input type="date" className={field} value={f.vaccineDue} onChange={set("vaccineDue")} /></F>
        <F label="Identification notes"><textarea rows={3} className={field} value={f.notes} onChange={set("notes")} placeholder="Markings, colour, horns…" /></F>
      </section>
      <button disabled={busy} className="bg-glow flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-primary-foreground shadow-float active:scale-[.98] disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save animal</button>
    </form>
  );
}
