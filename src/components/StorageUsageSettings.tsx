import { useCallback, useEffect, useRef, useState } from "react";
import { Database, HardDrive, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";
import { formatBytes, type StorageUsage } from "@/lib/storage-usage";
import { Button } from "@/components/ui/button";

export function StorageUsageSettings() {
  const { uid, role } = useFarm();
  const generation = useRef(0);
  const [state, setState] = useState<{ uid: string; data: StorageUsage | null; error: string; busy: boolean }>({ uid: "", data: null, error: "", busy: false });
  const load = useCallback(async () => {
    if (!uid || role !== "owner") return;
    const revision = ++generation.current;
    setState({ uid, data: null, error: "", busy: true });
    try {
      const { data, error } = await supabase.rpc("farm_storage_usage");
      if (error || !data) throw error ?? new Error("Usage unavailable");
      if (revision === generation.current) setState({ uid, data: data as unknown as StorageUsage, error: "", busy: false });
    } catch { if (revision === generation.current) setState({ uid, data: null, error: "Storage usage could not load. Try again. If this continues, the farm service may need an update.", busy: false }); }
  }, [uid, role]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  if (role !== "owner" || !uid) return null;
  const current = state.uid === uid ? state : { data: null, error: "", busy: true };
  const data = current.data;
  return <section aria-label="Storage usage" className="overflow-hidden rounded-3xl border bg-card">
    <div className="flex items-center justify-between gap-3 border-b p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><HardDrive className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">Storage usage</h2><p className="text-xs text-muted-foreground">Your farm’s records and uploaded photos.</p></div></div><Button variant="ghost" size="icon" aria-label="Refresh storage usage" disabled={current.busy} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${current.busy ? "animate-spin" : ""}`} /></Button></div>
    <div className="space-y-4 p-5">
      {current.busy && <p role="status" className="text-sm text-muted-foreground">Checking usage…</p>}
      {current.error && <p role="alert" className="text-sm text-destructive">{current.error}</p>}
      {data && <><div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2"><div className="rounded-2xl border bg-secondary/30 p-4"><HardDrive className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold">{formatBytes(data.photo_bytes)}</p><p className="text-xs text-muted-foreground">Uploaded photos · {data.photo_count.toLocaleString("en-IN")} files</p></div><div className="rounded-2xl border p-4"><Database className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold">{formatBytes(data.record_bytes)}</p><p className="text-xs text-muted-foreground">Estimated farm data · {data.record_count.toLocaleString("en-IN")} records</p></div></div>
      {data.unknown_photo_sizes > 0 && <p className="text-xs text-destructive">Sizes are unavailable for {data.unknown_photo_sizes} file(s); photo usage is a partial total.</p>}
      <details className="rounded-2xl border p-3"><summary className="cursor-pointer text-sm font-medium">Record breakdown</summary><dl className="mt-3 divide-y">{data.breakdown.map(row => <div key={row.label} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><dt>{row.label} ({row.count.toLocaleString("en-IN")})</dt><dd className="font-medium">{formatBytes(row.bytes)}</dd></div>)}</dl></details>
      <p className="text-[11px] text-muted-foreground">Updated {new Date(data.checked_at).toLocaleString("en-IN")}</p></>}
      <div className="rounded-2xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground"><p className="font-semibold text-foreground">Cloud plan capacity: unavailable in the app</p><p className="mt-1">Check your Lovable Cloud usage for the project’s total capacity and remaining space. Farm data is an estimate of the records listed above; it excludes database indexes, backups and other accounts. Photo storage is separate and includes retained older uploads.</p></div>
    </div>
  </section>;
}
