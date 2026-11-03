import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFarm } from "@/lib/farm-data";
import { supabase } from "@/integrations/supabase/client";
import { createFarmWorkbook, selectExportData, type ExportScope } from "@/lib/farm-export";
import { saveExport } from "@/lib/download-file";

export function FarmExport({ scope }: { scope?: ExportScope }) {
  const { uid, animals, customers, payments, categories, loading } = useFarm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ blob: Blob; uid: string } | null>(null);
  const scopeKey = scope ? `${scope.kind}:${scope.id}` : "all";
  useEffect(() => { setReady(null); setOpen(false); }, [scopeKey, uid]);
  useEffect(() => { setReady(null); }, [animals, customers, payments, categories]);
  const title = scope?.kind === "animal" ? "Export animal" : scope?.kind === "customer" ? "Export customer" : "Export your farm";
  const label = scope ? `Download ${scope.kind} data as Excel` : "Download all data as Excel";
  let counts = { animals: 0, customers: 0, payments: 0 };
  try { const selected = selectExportData({ uid: uid ?? "", animals, customers, payments, categories }, scope); counts = { animals: selected.animals.length, customers: selected.customers.length, payments: selected.payments.length }; } catch { /* Not available without an owned selection. */ }
  const prepare = async () => {
    setBusy(true); setError(""); setReady(null);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !uid || data.user?.id !== uid) throw new Error("Please sign in again to export your data.");
      const blob = await createFarmWorkbook({ uid, animals, customers, payments, categories }, scope);
      setReady({ blob, uid });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare Excel."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); setReady(null); setError(""); }}>
    <Button variant={scope ? "outline" : "ghost"} size={scope ? "default" : "icon"} title={label} aria-label={label} onClick={() => setOpen(true)}><Download />{scope && "Excel"}</Button>
    <DialogContent className="max-w-md">
      <FileSpreadsheet className="h-9 w-9 text-primary" />
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{scope?.kind === "animal" ? `${scope.id} · Linked receipts, care periods, weight and vaccination records. Unassigned customer payments are excluded.` : scope?.kind === "customer" ? "This customer's animals, receipts, care periods, balances, weights and vaccinations." : "Animals, customers, payments, care periods, weights, vaccinations and categories."}</DialogDescription>
      <dl className="grid grid-cols-3 gap-3 border-y py-4 text-center text-sm">{[["Animals", counts.animals], ["Customers", counts.customers], ["Payments", counts.payments]].map(([label, count]) => <div key={label}><dd className="text-xl font-semibold">{count}</dd><dt className="text-muted-foreground">{label}</dt></div>)}</dl>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {ready && ready.uid === uid ? <Button onClick={() => { void saveExport(ready.blob, `FarmCare-${scope ? `${scope.kind}-${scope.id.replace(/[^a-zA-Z0-9_-]/g, "_")}-` : ""}${new Date().toISOString().slice(0, 10)}.xlsx`).catch((e) => { if (!String(e).toLowerCase().includes("cancel")) setError("Unable to save Excel. Please try again."); }); }}><Download />Save Excel</Button> : <Button disabled={busy || loading || !uid} onClick={prepare}>{busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}{busy ? "Preparing Excel…" : "Prepare Excel"}</Button>}
    </DialogContent>
  </Dialog>;
}