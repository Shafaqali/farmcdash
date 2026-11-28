import { playCustomerNoticeSound } from "@/lib/notice-sound";
import { notificationPresentation } from "@/lib/notification-presentation";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellOff, Check, CheckCheck, HeartPulse, RefreshCw, Syringe, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";
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
  const [filter, setFilter] = useState("All");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const uidRef = useRef(uid); uidRef.current = uid;
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    setSaving(false); setFilter("All"); setError(""); setLoadedUid(null); setItems([]); setFetching(false);
    if (!uid) return;
    let active = true, running = false, queued = false;
    let known: Set<string> | null = null;
    const refresh = async () => {
      if (!active) return;
      if (running) { queued = true; return; }
      running = true; setFetching(true);
      try {
        const { data, error } = await supabase.from("customer_notifications").select("*").order("created_at", { ascending: false }).limit(100);
        if (!active) return;
        if (error) throw error;
        const next = data ?? [];
        const previous = known;
        const fresh = previous ? next.filter((notice) => !previous.has(notice.id) && !notice.read_at) : [];
        known = new Set(next.map((notice) => notice.id));
        const first = fresh[0];
        if (fresh.length) {
          window.dispatchEvent(new CustomEvent("farm-customer-update", { detail: { uid } }));
          if (document.visibilityState === "visible") void playCustomerNoticeSound(uid);
        }
        if (first) toast.info(fresh.length === 1 ? first.title : `${fresh.length} customer updates`, { description: fresh.length === 1 ? first.message : "Open the bell to see your updates." });
        setItems(next); setError(""); setLoadedUid(uid);
      } catch { if (active) { setError("Could not load updates. Check your connection and try again."); setLoadedUid(uid); } }
      finally { running = false; if (active) { setFetching(false); if (queued) { queued = false; void refresh(); } } }
    };
    refreshRef.current = refresh;
    void refresh();
    const channel = supabase.channel(`customer-updates-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notifications", filter: `viewer_id=eq.${uid}` }, () => {
      if (active) window.dispatchEvent(new CustomEvent("farm-customer-update", { detail: { uid } }));
      void refresh();
    }).subscribe();
    const timer = window.setInterval(() => void refresh(), 30000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", refresh); document.addEventListener("visibilitychange", onVisible);
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", (state) => { if (state.isActive) void refresh(); })).then((handle) => { if (active) remove = () => void handle.remove(); else void handle.remove(); }).catch(() => {});
    return () => { active = false; void supabase.removeChannel(channel); remove?.(); window.clearInterval(timer); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", onVisible); if (refreshRef.current === refresh) refreshRef.current = async () => {}; };
  }, [uid]);
  const visibleItems = loadedUid === uid ? items : [];
  const unread = visibleItems.filter((notice) => !notice.read_at).length;
  const filtered = visibleItems.filter((notice) => filter === "All" || (filter === "Unread" ? !notice.read_at : filter === "Payments" ? notificationPresentation(notice.title, notice.kind).type === "payment" : notice.title.toLowerCase().includes("health")));
  const markRead = async (ids: string[]) => {
    if (!uid || saving || !ids.length) return;
    const account = uid; setSaving(true);
    try {
      const read_at = new Date().toISOString();
      const { data, error } = await supabase.from("customer_notifications").update({ read_at }).eq("viewer_id", account).in("id", ids).select("id");
      if (error) throw error;
      if (uidRef.current !== account) return;
      const changed = new Set(data?.map((notice) => notice.id));
      setItems((current) => current.map((notice) => changed.has(notice.id) ? { ...notice, read_at } : notice));
    } catch { if (uidRef.current === account) setError("Could not mark these updates read. Please try again."); }
    finally { if (uidRef.current === account) setSaving(false); }
  };
  return <>
    <Button variant="ghost" size="icon" aria-label={`Customer notifications${unread ? ` (${unread} unread)` : ""}`} title="Customer notifications" className="relative h-10 w-10 rounded-full bg-muted" onClick={() => { setOpen(true); void refreshRef.current(); }}><Bell className="h-4.5 w-4.5" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0 shadow-xl">
      <div className="flex items-center gap-3 border-b px-5 py-5 pr-10"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Bell className="h-5 w-5" /></span><div><DialogTitle className="text-xl font-bold">Your updates</DialogTitle><DialogDescription className="mt-1 text-xs">{unread ? `${unread} unread · ` : ""}Health, care and payment reminders</DialogDescription></div></div>
      <div className="flex items-center justify-between gap-2 border-b px-5 py-3"><div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">{["All", "Unread", "Health", "Payments"].map((value) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} className="shrink-0 rounded-lg px-3 text-sm font-semibold" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</Button>)}</div><Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-lg" aria-label="Refresh notifications" disabled={fetching} onClick={() => void refreshRef.current()}><RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} /></Button></div>
      {error && loadedUid === uid && <p role="alert" className="m-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {loadedUid !== uid && <p className="py-8 text-center text-sm text-muted-foreground">Loading your updates…</p>}
      {loadedUid === uid && !filtered.length && !error && <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/50 px-5 py-9 text-center"><BellOff className="h-8 w-8 text-muted-foreground/50" /><p className="font-semibold">{filter === "Unread" ? "You're all caught up" : "No updates here yet"}</p><p className="max-w-xs text-xs leading-relaxed text-muted-foreground">Your farm's animal updates and payment reminders will appear here.</p></div>}
      <ul className="max-h-[45svh] min-h-0 divide-y overflow-y-auto overscroll-contain px-5">{filtered.map((notice) => {
        const presentation = notificationPresentation(notice.title, notice.kind);
        const payment = presentation.type === "payment";
        const health = presentation.type === "health";
        const Icon = payment ? Wallet : health ? HeartPulse : notice.title.toLowerCase().includes("vaccin") ? Syringe : TrendingUp;
        return <li key={notice.id} className={`py-4 ${notice.read_at ? "bg-card" : "bg-secondary/15"}`}><div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${payment ? "bg-secondary text-primary" : "bg-secondary text-primary"}`}><Icon aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="mb-1 text-xs font-semibold text-primary">{presentation.label}</p>{notice.animal_id ? <Link to="/animals/$id" params={{ id: notice.animal_id }} onClick={() => { setOpen(false); if (!notice.read_at) void markRead([notice.id]); }} className="block break-words text-base font-bold leading-snug">{notice.title}<span className="mt-2 inline-flex rounded-md bg-secondary px-2 py-1 text-sm font-bold tracking-wide text-primary">{notice.animal_id}</span></Link> : <Link to="/my-animals" onClick={() => { setOpen(false); if (!notice.read_at) void markRead([notice.id]); }} className="block break-words text-base font-bold leading-snug">{notice.title}</Link>}<p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{notice.message}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><time dateTime={notice.created_at} className="text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>{!notice.read_at ? <Button variant="ghost" size="sm" disabled={saving} className="h-7 gap-1 rounded-full px-2 text-xs text-primary" onClick={() => void markRead([notice.id])}><Check className="h-3 w-3" />Mark read</Button> : <CheckCheck aria-label="Read" className="h-3.5 w-3.5 text-primary/60" />}</div></div>{!notice.read_at && <span aria-label="Unread" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}</div></li>;
      })}</ul>
      {unread > 0 && <Button variant="outline" disabled={saving} className="m-4 h-10 rounded-lg text-sm font-semibold" onClick={() => void markRead(visibleItems.filter((notice) => !notice.read_at).map((notice) => notice.id))}><CheckCheck className="h-4 w-4" />{saving ? "Updating…" : "Mark all read"}</Button>}
    </DialogContent></Dialog>
  </>;
}
