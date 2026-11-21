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
  return <section className="card-soft border-primary/15 bg-secondary/30 p-5" aria-label="Animal quick summary"><h2 className="text-lg font-semibold">Quick summary</h2><p className="mt-1 text-xs text-muted-foreground">{animal.id} · Latest recorded information, with observation dates.</p><dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{value}</dd></div>)}</dl><div className="mt-5 border-t pt-4"><h3 className="text-sm font-semibold">Vaccines given ({vaccines.length})</h3>{vaccines.length ? <ul className="mt-2 divide-y text-sm">{vaccines.map(v => <li key={v.id} className="flex flex-wrap justify-between gap-2 py-2"><span className="break-words font-medium">{v.name}</span><span className="text-muted-foreground">Given {fmtDate(v.date)}{v.nextDue ? ` · Next due ${fmtDate(v.nextDue)}` : ""}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No vaccines recorded.</p>}</div></section>;
}
