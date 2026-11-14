import { useEffect, useState } from "react";
import { HeartPulse, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fmtDate, isoToday } from "@/lib/farm-data";

type Health = Database["public"]["Tables"]["animal_health"]["Row"];
export function AnimalHealth({ animalId, editable = false }: { animalId: string; editable?: boolean }) {
  const [records, setRecords] = useState<Health[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ date: isoToday(), condition: "", details: "", medicine: "", treatment: "", recovery: "", status: "Monitoring" });
  const refresh = async () => {
    const { data, error } = await supabase.from("animal_health").select("*").eq("animal_id", animalId).order("date", { ascending: false }).order("id");
    if (error) throw error;
    setRecords(data ?? []);
  };
  useEffect(() => { let active = true; void supabase.from("animal_health").select("*").eq("animal_id", animalId).order("date", { ascending: false }).then(({ data, error }) => { if (active) { setRecords(data ?? []); setError(error?.message ?? ""); } }); return () => { active = false; }; }, [animalId]);
  return <section className="space-y-3 border-y py-4" aria-label="Animal health history">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><HeartPulse className="h-5 w-5 text-primary" />Health history</h2>{editable && <Button variant="outline" onClick={() => { setError(""); setOpen(true); }}><Plus />Health update</Button>}</div>
    {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!records.length && <p className="text-sm text-muted-foreground">No health updates recorded.</p>}
    {records.map((h) => <article key={h.id} className="rounded-lg border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="break-words font-semibold">{h.condition}</h3><span className={h.status === "Sick" ? "text-sm text-destructive" : "text-sm text-primary"}>{h.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{fmtDate(h.date)}</p><dl className="mt-3 space-y-2 text-sm">{([["Condition details", h.details], ["Medicines", h.medicine], ["Treatment", h.treatment], ["Recovery update", h.recovery]] as const).filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="whitespace-pre-wrap break-words text-muted-foreground">{value}</dd></div>)}</dl></article>)}
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent><DialogTitle>Animal health update</DialogTitle><DialogDescription>{animalId}</DialogDescription><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { const { error } = await supabase.from("animal_health").insert({ ...form, condition: form.condition.trim(), animal_id: animalId }); if (error) throw error; await refresh(); setOpen(false); setForm({ date: isoToday(), condition: "", details: "", medicine: "", treatment: "", recovery: "", status: "Monitoring" }); } catch(e) { setError(e instanceof Error ? e.message : "Health update could not be saved"); } finally { setBusy(false); } }}>
    <label className="block space-y-1 text-sm">Date<Input type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
    <label className="block space-y-1 text-sm">Health status<select className="h-10 w-full rounded-md border bg-background px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Healthy", "Monitoring", "Sick", "Recovering", "Recovered"].map((s) => <option key={s}>{s}</option>)}</select></label>
    <label className="block space-y-1 text-sm">Condition<Input required maxLength={200} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></label>
    {([["details", "Condition details"], ["medicine", "Medicines & dosage"], ["treatment", "Treatment"], ["recovery", "Recovery update"]] as const).map(([key,label]) => <label key={key} className="block space-y-1 text-sm">{label}<Textarea rows={2} maxLength={4000} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy || !form.condition.trim()} className="w-full">{busy ? "Saving…" : "Save health update"}</Button></form></DialogContent></Dialog>
  </section>;
}