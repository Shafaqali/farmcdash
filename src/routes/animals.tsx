import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { useFarm, STATUSES } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/animals")({
  head: () => ({ meta: [
    { title: "Animals — FarmCare" },
    { name: "description", content: "Browse, search and filter every animal in your care." },
    { property: "og:title", content: "Animals — FarmCare" },
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

const chip = (on: boolean) => `shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`;

function Animals() {
  const { animals, customers, categories, isAdmin, loading } = useFarm();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sub, setSub] = useState("All");
  const [st, setSt] = useState("All");
  const tops = categories.filter((c) => !c.parentId);
  const subs = categories.filter((c) => c.parentId === cat);
  const owner = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  const list = animals.filter((a) => (cat === "All" || a.categoryId === cat) && (sub === "All" || a.subcategoryId === sub) && (st === "All" || a.status === st) &&
    `${a.id} ${a.breed} ${a.sub} ${owner(a.ownerId)}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle eyebrow={`${list.length} of ${animals.length} animals`} title="Animals"
        action={isAdmin ? <Link to="/animals/new" className="bg-glow flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-float active:scale-95"><Plus className="h-4 w-4" />Register</Link> : undefined} />
      <label className="card-soft flex items-center gap-2 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, breed or owner" className="w-full bg-transparent outline-none" />
      </label>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => { setCat("All"); setSub("All"); }} className={chip(cat === "All")}>All</button>
        {tops.map((c) => <button key={c.id} onClick={() => { setCat(c.id); setSub("All"); }} className={chip(cat === c.id)}>{c.name}</button>)}
      </div>
      {subs.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSub("All")} className={chip(sub === "All")}>All types</button>
          {subs.map((c) => <button key={c.id} onClick={() => setSub(c.id)} className={chip(sub === c.id)}>{c.name}</button>)}
        </div>
      )}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {["All", ...STATUSES].map((s) => <button key={s} onClick={() => setSt(s)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${st === s ? "bg-secondary text-primary" : "text-muted-foreground"}`}>{s === "All" ? "Any status" : s}</button>)}
      </div>
      {loading && !animals.length && <p className="mt-6 text-center text-muted-foreground">Loading…</p>}
      <ul className="mt-4 space-y-2.5">
        {list.map((a, i) => (
          <li key={a.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
            <Link to="/animals/$id" params={{ id: a.id }} className="card-soft flex items-center gap-3 p-3 transition-transform active:scale-[.98]">
              {a.photoUrl
                ? <img src={a.photoUrl} alt={a.id} className="h-12 w-12 rounded-2xl object-cover" />
                : <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary font-display text-xs font-semibold text-primary">{a.id}</span>}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.id} · {a.species}{a.sub ? ` · ${a.sub}` : ""}</p>
                <p className="truncate text-sm text-muted-foreground">{owner(a.ownerId) || "No owner"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.status === "Active" ? "bg-success/15 text-primary" : a.status === "Sold" ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
