import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareAnimalPhoto } from "@/lib/prepare-animal-photo";
import { formatBytes } from "@/lib/storage-usage";

export function AnimalPhotoPicker({ value, onChange, disabled = false, onProcessingChange }: { value: File | null; onChange: (file: File | null) => void; disabled?: boolean; onProcessingChange?: (busy: boolean) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [sizes, setSizes] = useState<{ file: File; original: number } | null>(null);
  useEffect(() => {
    if (!value) { setPreview(null); return; }
    const url = URL.createObjectURL(value);
    setPreview({ file: value, url });
    return () => URL.revokeObjectURL(url);
  }, [value]);
  useEffect(() => () => { generation.current++; onProcessingChange?.(false); }, [onProcessingChange]);
  const choose = async (file?: File) => {
    if (!file || disabled || processing) return;
    const revision = ++generation.current;
    setProcessing(true); onProcessingChange?.(true); setError("");
    try {
      const prepared = await prepareAnimalPhoto(file);
      if (revision !== generation.current) return;
      setSizes({ file: prepared, original: file.size });
      onChange(prepared);
    } catch (e) { if (revision === generation.current) setError(e instanceof Error ? e.message : "Could not prepare the photo. Try another image."); }
    finally { if (revision === generation.current) { setProcessing(false); onProcessingChange?.(false); } }
  };
  return <div className="space-y-3 rounded-2xl border bg-background p-4" aria-label="Animal photo upload">
    <div><h3 className="font-semibold">Animal photo</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Take a new photo or choose one from your gallery. Photos resize automatically to a maximum 1600-pixel edge before upload. Smaller photos keep their dimensions.</p></div>
    {value && preview?.file === value && <img src={preview.url} alt="Selected animal photo preview" className="max-h-64 w-full rounded-xl bg-muted object-contain" />}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><Button type="button" variant="outline" disabled={disabled || processing} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" />Take photo</Button><Button type="button" variant="outline" disabled={disabled || processing} onClick={() => gallery.current?.click()}><ImagePlus className="h-4 w-4" />Choose from gallery</Button></div>
    <input ref={camera} type="file" accept="image/*" capture="environment" aria-label="Take animal photo" className="hidden" disabled={disabled || processing} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void choose(file); }} />
    <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/bmp" aria-label="Choose animal photo from gallery" className="hidden" disabled={disabled || processing} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void choose(file); }} />
    {processing && <p role="status" className="flex items-center gap-2 text-xs text-primary"><Loader2 className="h-4 w-4 animate-spin" />Resizing photo…</p>}
    {value && !processing && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/40 p-3"><div className="text-xs"><p className="font-semibold text-primary">Ready to upload · {formatBytes(value.size)}</p>{sizes?.file === value && sizes.original > value.size && <p className="mt-1 text-muted-foreground">Original {formatBytes(sizes.original)} → Optimized {formatBytes(value.size)}</p>}</div><Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => { generation.current++; onChange(null); setSizes(null); setError(""); }}><Trash2 className="h-3.5 w-3.5" />Remove</Button></div>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP or BMP · Up to 15 MB before resizing. Camera availability depends on your phone or browser.</p>
  </div>;
}
