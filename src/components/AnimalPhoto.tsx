import { useState } from "react";
import { ImageOff, Maximize2, PawPrint } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function AnimalPhoto({ src, animalId, className = "aspect-[4/3]", zoom = true }: { src?: string | null; animalId: string; className?: string; zoom?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const available = !!src && failed !== src;
  const media = <>{available ? <img src={src!} alt={`Animal ${animalId}`} loading="lazy" width={800} height={600} onError={() => setFailed(src!)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary/50 text-muted-foreground">{src ? <ImageOff className="h-8 w-8 opacity-50" /> : <PawPrint className="h-9 w-9 text-primary/40" />}<span className="text-xs">{src ? "Photo unavailable" : "No photo yet"}</span></span>}</>;
  return <>
    {available && zoom ? <button type="button" aria-label={`View photo of animal ${animalId}`} onClick={() => setOpen(true)} className={`group relative block w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}>{media}<span aria-hidden="true" className="absolute bottom-3 right-3 rounded-full bg-background/90 p-2 text-foreground shadow-sm"><Maximize2 className="h-3.5 w-3.5" /></span></button> : <div className={`relative overflow-hidden bg-muted ${className}`}>{media}</div>}
    <Dialog open={open && available} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogTitle>{animalId}</DialogTitle><DialogDescription>Animal photo · full view</DialogDescription>{available && <img src={src!} alt={`Full photo of animal ${animalId}`} className="max-h-[65svh] w-full rounded-xl bg-muted object-contain" onError={() => setFailed(src!)} />}</DialogContent></Dialog>
  </>;
}
