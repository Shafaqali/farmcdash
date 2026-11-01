import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFarm } from "@/lib/farm-data";
import { supabase } from "@/integrations/supabase/client";
import { createFarmWorkbook } from "@/lib/farm-export";
import { saveExport } from "@/lib/download-file";

export function FarmExport() {
  const { uid, animals, customers, payments, categories, loading } = useFarm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ blob: Blob; uid: string } | null>(null);
  const prepare = async () => {
    setBusy(true); setError(""); setReady(null);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !uid || data.user?.id !== uid) throw new Error("Please sign in again to export your data.");
      const blob = await createFarmWorkbook({ uid, animals, customers, payments, categories });
      setReady({ blob, uid });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare Excel."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); setReady(null); setError(""); }}>
    <Button variant="ghost" size="icon" title="Download all data as Excel" aria-label="Download all data as Excel" onClick={() => setOpen(true)}><Download /></Button>
    <DialogContent className="max-w-md">
      <FileSpreadsheet className="h-9 w-9 text-primary" />
      <DialogTitle>Export your farm</DialogTitle>
      <DialogDescription>Animals, customers, payments, care periods, weights, vaccinations and categories.</DialogDescription>
      <dl className="grid grid-cols-3 gap-3 border-y py-4 text-center text-sm">{[["Animals", animals.length], ["Customers", customers.length], ["Payments", payments.length]].map(([label, count]) => <div key={label}><dd className="text-xl font-semibold">{count}</dd><dt className="text-muted-foreground">{label}</dt></div>)}</dl>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {ready?.uid === uid ? <Button onClick={() => { void saveExport(ready.blob, `FarmCare-${new Date().toISOString().slice(0, 10)}.xlsx`).catch((e) => { if (!String(e).toLowerCase().includes("cancel")) setError("Unable to save Excel. Please try again."); }); }}><Download />Save Excel</Button> : <Button disabled={busy || loading || !uid} onClick={prepare}>{busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}{busy ? "Preparing Excel…" : "Prepare Excel"}</Button>}
    </DialogContent>
  </Dialog>;
}