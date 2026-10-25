import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

/** QR tag for an animal; encodes the animal ID so the in-app scanner opens its record. */
export function AnimalQR({ id, label, size = 92 }: { id: string; label: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const download = () => {
    const src = ref.current;
    if (!src) return;
    // Build a printable label: QR + ID + description under it.
    const pad = 32, qr = 512, out = document.createElement("canvas");
    out.width = qr + pad * 2; out.height = qr + pad * 2 + 110;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, pad, pad, qr, qr);
    ctx.fillStyle = "#111111"; ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif"; ctx.fillText(id, out.width / 2, qr + pad + 60);
    ctx.font = "26px sans-serif"; ctx.fillText(label, out.width / 2, qr + pad + 98);
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png"); a.download = `FarmCare-${id}-QR.png`; a.click();
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-card p-2">
        <QRCodeCanvas ref={ref} value={id} size={512} marginSize={1} style={{ width: size, height: size }} />
      </div>
      <button type="button" onClick={download} className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
        <Download className="h-3.5 w-3.5" />Download QR
      </button>
    </div>
  );
}
