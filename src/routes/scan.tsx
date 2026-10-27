import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QrCode, CameraOff } from "lucide-react";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [
    { title: "Scan tag — FarmCare" },
    { name: "description", content: "Scan an animal's QR label to open its record." },
    { property: "og:title", content: "Scan tag — FarmCare" },
    { property: "og:description", content: "Scan an animal's QR label to open its record." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Scan,
});

function Scan() {
  const nav = useNavigate();
  const [id, setId] = useState("");
  const [err, setErr] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null;
    let cancelled = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const s = new Html5Qrcode("reader");
      scanner = s;
      s.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (text) => {
        if (done.current) return; done.current = true;
        s.stop().finally(() => nav({ to: "/animals/$id", params: { id: text.trim().toUpperCase() } }));
      }, () => {}).catch(() => setErr(true));
    });
    return () => { cancelled = true; if (scanner?.isScanning) scanner.stop().catch(() => {}); };
  }, [nav]);
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Point the camera at an animal's QR label" title="Scan animal tag" />
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-foreground shadow-float">
        <div id="reader" className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        {err ? (
          <div className="absolute inset-0 grid place-items-center text-center text-primary-foreground"><div><CameraOff className="mx-auto h-10 w-10 opacity-70" /><p className="mt-2 text-sm opacity-80">Camera not available. Type the ID below.</p></div></div>
        ) : (
          <div className="pointer-events-none absolute inset-[18%]">
            {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"].map((c) => <span key={c} className={`absolute h-10 w-10 border-accent ${c}`} />)}
            <span className="animate-scanline absolute inset-x-2 h-0.5 rounded-full bg-accent shadow-float" />
          </div>
        )}
      </div>
      <form className="card-soft flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (id.trim()) nav({ to: "/animals/$id", params: { id: id.trim().toUpperCase() } }); }}>
        <span className="grid w-10 place-items-center text-muted-foreground"><QrCode className="h-5 w-5" /></span>
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Or type ID, e.g. U01-G0001" className="flex-1 bg-transparent outline-none" />
        <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Open</button>
      </form>
    </div>
  );
}
