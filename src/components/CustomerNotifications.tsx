import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, fmtDate } from "@/lib/farm-data";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Notice = Database["public"]["Tables"]["customer_notifications"]["Row"];
export function CustomerNotifications() {
  const { uid } = useFarm();
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    const refresh = async () => { const { data, error } = await supabase.from("customer_notifications").select("*").order("created_at", { ascending: false }).limit(100); if (active) { setItems(data ?? []); setError(error?.message ?? ""); setLoadedUid(uid); } };
    void refresh();
    const channel = supabase.channel(`customer-updates-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notifications", filter: `viewer_id=eq.${uid}` }, () => void refresh()).subscribe();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [uid]);
  const visibleItems = loadedUid === uid ? items : [];
  const unread = visibleItems.filter((item) => !item.read_at).length;
  return <><Button variant="ghost" size="icon" aria-label={`Customer notifications${unread ? ` (${unread} unread)` : ""}`} title="Customer notifications" className="relative" onClick={() => setOpen(true)}><Bell />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md">
      <DialogTitle>Animal updates</DialogTitle><DialogDescription>Health, growth and vaccination updates</DialogDescription>
      {loadedUid === uid && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!visibleItems.length && <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground"><BellOff className="h-8 w-8" /><p className="text-sm">No updates yet.</p></div>}
      <ul className="max-h-[50svh] min-h-0 space-y-2 overflow-y-auto overscroll-contain">{visibleItems.map((n) => <li key={n.id} className={`space-y-2 rounded-lg border p-3 ${n.read_at ? "bg-card" : "bg-secondary/40"}`}>
        <Link to="/animals/$id" params={{ id: n.animal_id }} onClick={() => setOpen(false)} className="block break-words font-semibold text-primary">{n.animal_id} · {n.title}</Link>
        <p className="break-words text-sm">{n.message}</p><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>
        {!n.read_at && <Button variant="outline" size="sm" onClick={async () => { const read_at = new Date().toISOString(); const { error } = await supabase.from("customer_notifications").update({ read_at }).eq("id", n.id); if (error) { setError(error.message); return; } setItems((items) => items.map((i) => i.id === n.id ? { ...i, read_at } : i)); }}>Mark read</Button>}</div>
      </li>)}</ul>
    </DialogContent></Dialog></>;
}