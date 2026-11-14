import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
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
  useEffect(() => {
    if (!uid) return;
    let active = true;
    const refresh = async () => { const { data, error } = await supabase.from("customer_notifications").select("*").order("created_at", { ascending: false }).limit(100); if (active) { setItems(data ?? []); setError(error?.message ?? ""); } };
    void refresh();
    const channel = supabase.channel(`customer-updates-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notifications", filter: `viewer_id=eq.${uid}` }, () => void refresh()).subscribe();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => { active = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [uid]);
  const unread = items.filter((item) => !item.read_at).length;
  return <><Button variant="ghost" size="icon" aria-label={`Customer notifications${unread ? ` (${unread} unread)` : ""}`} title="Customer notifications" className="relative" onClick={() => setOpen(true)}><Bell />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">{unread}</span>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Animal updates</DialogTitle><DialogDescription>Health, growth and vaccination updates</DialogDescription>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{!items.length && <p className="text-sm text-muted-foreground">No updates yet.</p>}<ul className="divide-y">{items.map((n) => <li key={n.id} className="space-y-1 py-3"><Link to="/animals/$id" params={{ id: n.animal_id }} onClick={() => setOpen(false)} className="break-words font-semibold text-primary">{n.animal_id} · {n.title}</Link><p className="break-words text-sm">{n.message}</p><p className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>{!n.read_at && <Button variant="ghost" size="sm" onClick={async () => { const read_at = new Date().toISOString(); const { error } = await supabase.from("customer_notifications").update({ read_at }).eq("id", n.id); if (error) { setError(error.message); return; } setItems((items) => items.map((i) => i.id === n.id ? { ...i, read_at } : i)); }}>Mark read</Button>}</li>)}</ul></DialogContent></Dialog></>;
}