import { ClipboardList, HeartPulse, PawPrint, Scale, Syringe, Thermometer, CalendarDays } from "lucide-react";
import type { Animal } from "@/lib/farm-data";
import { fmtDate } from "@/lib/farm-data";
import type { HealthRecord } from "@/lib/animal-health-summary";

export function AnimalQuickSummary({ animal, ownerName = "Not available", registeredBy = "Not available", health, privateAccess = false }: { animal: Animal; ownerName?: string; registeredBy?: string; health?: HealthRecord | null | undefined; privateAccess?: boolean }) {
  const weights = [...animal.weights].sort((a, b) => a.date.localeCompare(b.date));
  const first = weights[0], latest = weights.at(-1);
  const change = latest && first && weights.length > 1 ? latest.kg - first.kg : null;
  const vaccines = [...animal.vaccinations].sort((a, b) => b.date.localeCompare(a.date));
  const healthValue = health === undefined ? "Unavailable" : "Not recorded";
  const items = [
    ["Animal ID", animal.id], ["Owner", ownerName], ["Registered by", registeredBy],
    ["Category / breed", [animal.species, animal.sub, animal.breed].filter(Boolean).join(" · ") || "Not recorded"],
    ["Current animal status", animal.status], ["Care started", fmtDate(animal.arrival)],
    ["Latest weight", latest ? `${latest.kg} kg · ${fmtDate(latest.date)}` : "Not recorded"],
    ["Recorded weight change", change == null || !first ? "Add two weight records to compare" : `${change > 0 ? "+" : ""}${Number(change.toFixed(2))} kg since ${fmtDate(first.date)}`],
    ["Most recent vaccine given", vaccines[0] ? `${vaccines[0].name} · ${fmtDate(vaccines[0].date)}` : "Not recorded"],
    ["Next vaccination due", animal.vaccineDue ? fmtDate(animal.vaccineDue) : "Not scheduled"],
    ...(animal.soldDate ? [["Care ended / sold", fmtDate(animal.soldDate)]] : []),
    ...(privateAccess ? [
      ["Latest recorded health status", health?.status ?? healthValue],
      ["Health observation date", health ? fmtDate(health.date) : healthValue],
      ["Temperature at latest observation", health?.temperature_c != null ? `${health.temperature_c} °C · ${fmtDate(health.date)}` : health ? "Not measured in the latest update" : healthValue],
      ["Condition", health?.condition || healthValue],
      ["Illness started", health?.illness_started ? fmtDate(health.illness_started) : "Not recorded"],
      ["Condition details", health?.details || "Not recorded"],
      ["Medicines & dosage", health?.medicine || "Not recorded"],
      ["Treatment", health?.treatment || "Not recorded"],
      ["Progress / recovery", health?.recovery || "Not recorded"],
      ["Animal notes", animal.notes || "Not recorded"],
    ] : []),
  ];
  const groups = [
    { title: "About this animal", icon: PawPrint, entries: items.slice(0, 6) },
    { title: "Growth progress", icon: Scale, entries: items.slice(6, 8) },
    { title: "Vaccination schedule", icon: Syringe, entries: items.slice(8, animal.soldDate ? 11 : 10) },
    ...(privateAccess ? [{ title: "Health & treatment", icon: HeartPulse, entries: items.slice(animal.soldDate ? 11 : 10) }] : []),
  ];
  return <section className="card-soft overflow-hidden" aria-label="Animal quick summary">
    <header className="flex items-start gap-3 border-b bg-secondary/40 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><ClipboardList aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h2 className="text-xl font-semibold">Quick summary</h2><p className="mt-1 text-sm text-muted-foreground">Latest recorded information for {animal.id}</p></div></header>
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
      {[{ label: "Latest weight", value: latest ? `${latest.kg} kg` : "Not recorded", date: latest ? fmtDate(latest.date) : "Add a weight update", icon: Scale },
        ...(privateAccess ? [{ label: "Temperature", value: health?.temperature_c != null ? `${health.temperature_c} \u00b0C` : "Not recorded", date: health ? fmtDate(health.date) : "No observation available", icon: Thermometer }] : []),
        { label: "Next vaccine", value: animal.vaccineDue ? fmtDate(animal.vaccineDue) : "Not scheduled", date: "Current care schedule", icon: CalendarDays }].map(metric => <div key={metric.label} className="min-w-0 rounded-2xl border border-primary/15 bg-secondary/30 p-3 last:col-span-2 sm:last:col-span-1"><metric.icon aria-hidden="true" className="mb-3 h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.date}</p></div>)}
    </div>
    <div className="space-y-4 px-4 pb-4">{groups.map(group => <section key={group.title} className="rounded-2xl border bg-muted/20 p-3 sm:p-4"><h3 className="flex items-center gap-2 rounded-xl bg-secondary/70 p-3 text-base font-semibold text-primary"><group.icon aria-hidden="true" className="h-4 w-4 text-primary" />{group.title}</h3><dl className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">{group.entries.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-card p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">{value}</dd></div>)}</dl></section>)}
      <section className="rounded-2xl border p-4"><h3 className="flex items-center gap-2 text-base font-semibold"><Syringe aria-hidden="true" className="h-4 w-4 text-primary" />Vaccines given ({vaccines.length})</h3>{vaccines.length ? <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{vaccines.map(v => <li key={v.id} className="space-y-2 rounded-xl border border-primary/15 bg-secondary/25 p-3"><p className="flex items-start gap-2 break-words font-semibold"><Syringe aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{v.name}</p><p className="text-muted-foreground">Given {fmtDate(v.date)}{v.nextDue ? ` | Next due ${fmtDate(v.nextDue)}` : ""}</p></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No vaccines recorded yet.</p>}</section>
      <p className="text-xs text-muted-foreground">Measurements describe the recorded observation, not a live reading.</p>
    </div>
  </section>;
}
