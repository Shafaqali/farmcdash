import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function DeleteConfirmation({ open, onOpenChange, title, description, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="max-w-sm">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></span>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" disabled={busy} autoFocus onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onConfirm(); onOpenChange(false); } catch (e) { setError(e instanceof Error ? e.message : "Record could not be deleted. Please try again."); } finally { setBusy(false); } }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}