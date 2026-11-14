import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [
    { title: "Categories — STAR GOATS FARM" },
    { name: "description", content: "Manage animal categories and sub-categories." },
    { property: "og:title", content: "Categories — STAR GOATS FARM" },
    { property: "og:description", content: "Manage animal categories and sub-categories." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Categories,
});

function Categories() {
  const { categories, animals, isAdmin, reload } = useFarm();
  const [name, setName] = useState("");
  const [subName, setSubName] = useState<Record<string, string>>({});
  const tops = categories.filter((c) => !c.parentId);
  const add = async (n: string, parentId: string | null) => {
    if (!n.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: n.trim(), parent_id: parentId, code: parentId ? "" : n.trim()[0]!.toUpperCase() });
    if (error) { toast.error(error.message); return; }
    await reload(); toast.success(`${n.trim()} added`);
  };
  const del = async (id: string, n: string) => {
    if (animals.some((a) => a.categoryId === id || a.subcategoryId === id)) { toast.error(`${n} has animals — move them first`); return; }
    if (!confirm(`Delete ${n}?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await reload();
  };
  return (
    <div className="space-y-4">
      <Link to="/profile" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Profile</Link>
      <PageTitle eyebrow={`${tops.length} categories`} title="Animal categories" />
      {isAdmin && (
        <form className="card-soft flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); void add(name, null); setName(""); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category (e.g. Camel)" className="flex-1 rounded-xl border bg-background px-3 py-2 outline-none focus:border-primary" />
          <button className="bg-glow grid w-11 place-items-center rounded-xl text-primary-foreground"><Plus className="h-5 w-5" /></button>
        </form>
      )}
      <ul className="space-y-3">
        {tops.map((c, i) => {
          const subs = categories.filter((s) => s.parentId === c.id);
          const count = animals.filter((a) => a.categoryId === c.id).length;
          return (
            <li key={c.id} className="card-soft animate-rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className="bg-glow grid h-10 w-10 place-items-center rounded-xl font-display font-semibold text-primary-foreground">{c.code || c.name[0]}</span>
                <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{count} animals · {subs.length} sub-categories</p></div>
                {isAdmin && <button aria-label="Delete" onClick={() => void del(c.id, c.name)}><Trash2 className="h-4 w-4 text-destructive" /></button>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {subs.map((s) => (
                  <span key={s.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-primary"><Tag className="h-3 w-3" />{s.name}
                    {isAdmin && <button aria-label={`Delete ${s.name}`} onClick={() => void del(s.id, s.name)} className="ml-1 opacity-60">×</button>}
                  </span>
                ))}
              </div>
              {isAdmin && (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(subName[c.id] ?? "", c.id); setSubName({ ...subName, [c.id]: "" }); }}>
                  <input value={subName[c.id] ?? ""} onChange={(e) => setSubName({ ...subName, [c.id]: e.target.value })} placeholder={`Add ${c.name} sub-category`} className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button className="rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">Add</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
