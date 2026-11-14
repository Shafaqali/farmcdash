import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, ChevronRight, PawPrint } from "lucide-react";
import { useFarm, STATUSES } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/animals")({
  head: () => ({ meta: [
    { title: "Animals — STAR GOATS FARM" },
    { name: "description", content: "Browse, search and filter every animal in your care." },
    { property: "og:title", content: "Animals — STAR GOATS FARM" },
    { property: "og:description", content: "Browse, search and filter every animal in your care." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AnimalsLayout,
});

function AnimalsLayout() {
  const path = useLocation({ select: (l) => l.pathname });
  return path === "/animals" || path === "/animals/" ? <Animals /> : <Outlet />;
}

const chip = (on: boolean) => `shrink-0 rounded-md px-4 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`;

function Animals() {
  const { animals, customers, categories, isAdmin, loading } = useFarm();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [cat, setCat] = useState("All");
  const [sub, setSub] = useState("All");
  const [st, setSt] = useState("All");
  const tops = categories.filter((c) => !c.parentId);
  const subs = categories.filter((c) => c.parentId === cat);
  const owner = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  const list = animals.filter((a) => (group === "all" || (group === "personal" ? !a.ownerId : !!a.ownerId)) && (cat === "All" || a.categoryId === cat) && (sub === "All" || a.subcategoryId === sub) && (st === "All" || a.status === st) &&
    `${a.id} ${a.breed} ${a.sub} ${owner(a.ownerId)}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle eyebrow={`${list.length} of ${animals.length} animals`} title="Animals"
        action={isAdmin ? <Button asChild className="shrink-0"><Link to="/animals/new"><Plus />Register</Link></Button> : undefined} />
      <div className="mb-3 flex flex-wrap gap-2">{[["all", "All animals"], ["customer", "Customer animals"], ["personal", "Personal animals"]].map(([key,label]) => <Button key={key} variant={group === key ? "default" : "outline"} onClick={() => setGroup(key ?? "all")}>{label}</Button>)}</div>
      <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search animals" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, breed or owner" className="h-11 bg-card pl-10" /></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Button variant="outline" aria-pressed={cat === "All"} onClick={() => { setCat("All"); setSub("All"); }} className={chip(cat === "All")}>All</Button>
        {tops.map((c) => <Button variant="outline" aria-pressed={cat === c.id} key={c.id} onClick={() => { setCat(c.id); setSub("All"); }} className={chip(cat === c.id)}>{c.name}</Button>)}
      </div>
      {subs.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <Button variant="outline" onClick={() => setSub("All")} className={chip(sub === "All")}>All types</Button>
          {subs.map((c) => <Button variant="outline" key={c.id} onClick={() => setSub(c.id)} className={chip(sub === c.id)}>{c.name}</Button>)}
        </div>
      )}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {["All", ...STATUSES].map((s) => <Button variant="ghost" size="sm" aria-pressed={st === s} key={s} onClick={() => setSt(s)} className={`shrink-0 ${st === s ? "bg-secondary text-primary" : "text-muted-foreground"}`}>{s === "All" ? "Any status" : s}</Button>)}
      </div>
      {loading && !animals.length && <p className="mt-6 text-center text-muted-foreground">Loading…</p>}
      {!loading && !list.length && <p className="py-10 text-center text-sm text-muted-foreground">No animals found.</p>}
      <ul className="mt-4 space-y-2.5">
        {list.map((a, i) => (
          <li key={a.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
            <Link to="/animals/$id" params={{ id: a.id }} className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/20">
              {a.photoUrl
                ? <img src={a.photoUrl} alt={a.id} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><PawPrint className="h-6 w-6" /></span>}
              <div className="min-w-0 flex-1">
                <p className="break-all font-semibold">{a.id}</p>
                <p className="break-words text-sm">{[a.species, a.sub || a.breed].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{owner(a.ownerId) || "Personal farm animal"}</p>
                <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${a.status === "Active" ? "bg-success/15 text-primary" : a.status === "Sold" ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
              </div>
              <ChevronRight className="mt-5 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
