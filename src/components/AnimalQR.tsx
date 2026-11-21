import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveExport } from "@/lib/download-file";
import { qrPdf } from "@/lib/qr-export";

export function AnimalQR({ id, label, size = 92 }: { id: string; label: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"png" | "jpg" | "pdf">("png");
  const [ready, setReady] = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReady(null); setOpen(false); setError(""); }, [id, label]);
  const prepare = () => {
    try {
      if (!ref.current) throw new Error("QR code is unavailable.");
      const out = document.createElement("canvas");
      out.width = 1200; out.height = 1440;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("QR export is unavailable.");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, out.width, out.height);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(ref.current, 80, 80, 1040, 1040);
      ctx.fillStyle = "#111"; ctx.textAlign = "center";
      const text = (value: string, y: number, initial: number) => {
        let font = initial;
        do { ctx.font = `600 ${font--}px sans-serif`; } while (ctx.measureText(value).width > 1080 && font > 12);
        ctx.fillText(value, 600, y);
      };
      text(id, 1210, 64); text(label, 1280, 36); text("STAR GOATS FARM", 1360, 32);
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const data = Uint8Array.from(atob(out.toDataURL(mime, 1).split(",")[1] ?? ""), c => c.charCodeAt(0));
      const bytes = format === "pdf" ? qrPdf(data, out.width, out.height) : data;
      setReady({ blob: new Blob([bytes as BlobPart], { type: format === "pdf" ? "application/pdf" : mime }), name: `STAR-GOATS-FARM-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}-QR.${format}` });
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare QR."); }
  };
  return <div className="flex shrink-0 flex-col items-center gap-2">
    <div className="rounded-2xl bg-card p-2"><QRCodeCanvas ref={ref} value={id} size={1040} level="H" marginSize={4} style={{ width: size, height: size }} /></div>
    <Button type="button" variant="secondary" size="sm" onClick={() => { setOpen(true); setReady(null); setError(""); }} className="gap-1 text-xs"><Download className="h-3.5 w-3.5" />Download QR</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-w-sm rounded-3xl"><DialogTitle>Download animal QR</DialogTitle><DialogDescription>{id} · Choose a format for printing or sharing.</DialogDescription><div className="grid grid-cols-3 gap-2">{(["png", "jpg", "pdf"] as const).map(value => <Button key={value} variant={format === value ? "default" : "outline"} disabled={busy} aria-pressed={format === value} onClick={() => { setFormat(value); setReady(null); }}>{value.toUpperCase()}</Button>)}</div><p className="text-xs text-muted-foreground">High-resolution QR with the animal ID, description and a clear scanning border.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{ready ? <Button disabled={busy} onClick={async () => { setBusy(true); try { await saveExport(ready.blob, ready.name); } catch (e) { if (!String(e).toLowerCase().includes("cancel")) setError("Could not save QR. Please try again."); } finally { setBusy(false); } }}><Download />{busy ? "Saving…" : `Save ${format.toUpperCase()}`}</Button> : <Button onClick={prepare}>Prepare {format.toUpperCase()}</Button>}</DialogContent></Dialog>
  </div>;
}
