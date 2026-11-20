import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, PawPrint, Phone, RefreshCw, Search, ShieldCheck, Syringe, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimalPhoto } from "@/components/AnimalPhoto";
import { useFarm, fmtDate } from "@/lib/farm-data";
import { useCustomerPortal } from "@/lib/use-customer-portal";

export const Route = createFileRoute("/my-animals")({
  head: () => ({ meta: [{ title: "My animals — STAR GOATS FARM" }, { name: "description", content: "Your animals, photos and care updates in one place." }] }),
  component: CustomerPortal,
});
export function CustomerPortal() {
  const { userName } = useFarm();
  const { data, isPending, isFetching, error, refetch } = useCustomerPortal();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const animals = data?.animals ?? [];
  const active = animals.filter((a) => a.status === "Active").length;
  const dueIds = new Set(data?.paymentStatuses?.filter((p) => p.status !== "Paid").map((p) => p.animalId));
  const visible = animals.filter((a) => (filter === "All" || (filter === "Active" ? a.status === "Active" : a.status !== "Active")) && `${a.id} ${a.species} ${a.breed} ${a.sub}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-6">
    <section className="bg-hero relative overflow-hidden rounded-[1.75rem] p-5 text-primary-foreground sm:p-7">
      <PawPrint aria-hidden="true" className="absolute -right-5 top-4 h-36 w-36 -rotate-12 opacity-[0.06]" />
      <div className="relative flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-65">Your farm connection</p><h1 className="mt-3 break-words text-3xl font-semibold">My animals</h1><p className="mt-1 break-words text-sm opacity-75">Welcome back, {userName || "farm family"}.</p></div><Button variant="ghost" size="icon" aria-label="Refresh records" disabled={isFetching} onClick={() => void refetch()} className="shrink-0 rounded-full bg-white/10 text-inherit hover:bg-white/20 hover:text-inherit"><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button></div>
      <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-4">{[{ label: "Total animals", value: animals.length }, { label: "Active in care", value: active }, { label: "Payment due", value: animals.filter((a) => dueIds.has(a.id)).length }].map((stat) => <div key={stat.label} className="px-2 first:pl-0"><p className="font-sans text-2xl font-semibold tabular-nums">{isPending ? "—" : stat.value}</p><p className="mt-1 text-[10px] opacity-70 sm:text-xs">{stat.label}</p></div>)}</div>
    </section>
    {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm"><p>Could not refresh your animals. Please check your connection.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Try again</Button></div>}
    {data?.photoWarning && <p role="status" className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">{data.photoWarning}</p>}
    <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Your herd</h2><p className="mt-1 text-xs text-muted-foreground">Photos, care dates and the latest status.</p></div><span className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">{visible.length} animals</span></div>
    {!!animals.length && <div className="space-y-3"><div className="relative"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search your animals" placeholder="Search animal ID, breed or type" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl bg-card pl-10" /></div><div className="flex gap-2">{["All", "Active", "Past care"].map((key) => <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} aria-pressed={filter === key} onClick={() => setFilter(key)} className="rounded-full px-4">{key}</Button>)}</div></div>}
    {isPending && !error && <div aria-label="Loading animals" className="grid gap-4 sm:grid-cols-2">{[1, 2].map((n) => <div key={n} className="h-80 animate-pulse rounded-2xl border bg-secondary/50" />)}</div>}
    {data && !animals.length && <div className="rounded-3xl border border-dashed bg-card px-6 py-12 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary"><PawPrint className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-semibold">Your herd starts here</h2><p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Animals will appear here as soon as your farm owner assigns them to your account.</p></div>}
    {data?.customers.filter((c) => visible.some((a) => a.ownerId === c.id)).map((customer) => <section key={customer.id} className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="break-words text-sm font-semibold">{customer.farmName || "Your connected farm"}</p><p className="mt-0.5 break-words text-xs text-muted-foreground">{customer.name} · {animals.filter((a) => a.ownerId === customer.id).length} animals</p></div></div>{customer.farmPhone && <Button asChild size="icon" variant="outline" className="shrink-0 rounded-full"><a href={`tel:${customer.farmPhone}`} aria-label={`Call ${customer.farmName || "farm owner"}`}><Phone className="h-4 w-4" /></a></Button>}</div>
      <div className="grid items-start gap-4 sm:grid-cols-2">{visible.filter((a) => a.ownerId === customer.id).map((animal) => {
        const periods = data.paymentStatuses?.filter((p) => p.animalId === animal.id) ?? [];
        const due = periods.some((p) => p.status !== "Paid");
        return <article key={animal.id} className="overflow-hidden rounded-[1.25rem] border bg-card shadow-sm">
          <div className="relative"><AnimalPhoto src={animal.photoUrl} animalId={animal.id} /><span className={`pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${animal.status === "Active" ? "bg-primary text-primary-foreground" : "bg-background/95 text-foreground"}`}>{animal.status}</span></div>
          <div className="space-y-4 p-4"><Link to="/animals/$id" params={{ id: animal.id }} className="group flex items-center justify-between gap-2"><div className="min-w-0"><h3 className="break-all font-sans text-lg font-bold">{animal.id}</h3><p className="mt-0.5 break-words text-xs text-muted-foreground">{[animal.species, animal.breed || animal.sub].filter(Boolean).join(" · ")}</p></div><ArrowUpRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
          <div className="space-y-2.5 border-y py-3 text-xs"><p className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Care started</span><span className="font-medium">{fmtDate(animal.arrival)}</span></p><p className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-muted-foreground"><Syringe className="h-3.5 w-3.5" />Next vaccine</span><span className="font-medium">{animal.vaccineDue ? fmtDate(animal.vaccineDue) : "Not scheduled"}</span></p></div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${due ? "bg-amber-50 text-amber-900" : "bg-secondary text-primary"}`}>{due ? <Wallet className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{due ? "Care payment due" : periods.length ? "Care payments up to date" : "No care payment due"}</div>
          <details className="group text-xs"><summary className="flex cursor-pointer list-none items-center justify-between py-1 font-semibold text-muted-foreground">Care month history<ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" /></summary>{periods.length ? <ul className="mt-2 divide-y">{periods.slice().reverse().map((p) => <li key={p.periodStart} className="flex justify-between gap-2 py-2.5"><span>{fmtDate(p.periodStart)}</span><span className={p.status === "Paid" ? "text-primary" : "text-amber-800"}>{p.status}</span></li>)}</ul> : <p className="py-3 text-muted-foreground">No care months recorded.</p>}</details></div>
        </article>;
      })}</div>
    </section>)}
    {!!animals.length && !visible.length && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No animals match your search.</p>}
  </div>;
}
