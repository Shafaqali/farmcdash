import { useEffect, useState } from "react";
import { AnimalPhotoCarousel, type AnimalSlide } from "@/components/AnimalPhotoCarousel";
import { Camera, RefreshCw } from "lucide-react";
import { privatePhotoUrls } from "@/lib/private-photo-urls";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";
import { growthMonths, type GrowthPhoto } from "@/lib/growth-photos";
import { AnimalPhoto } from "@/components/AnimalPhoto";
import { Button } from "@/components/ui/button";

export function AnimalGrowthPhotos({ animalId, revision, allowed, fallbackUrl }: { animalId: string; revision?: string | null; allowed: boolean; fallbackUrl?: string | null | undefined }) {
  const { uid, role } = useFarm();
  const [state, setState] = useState<{ key: string; photos: GrowthPhoto[]; error: string; loading: boolean }>({ key: "", photos: [], error: "", loading: true });
  const [retry, setRetry] = useState(0);
  const key = `${uid}:${animalId}:${revision}`;
  useEffect(() => {
    if (!allowed || !uid) return;
    let active = true;
    let sequence = 0;
    const load = async () => {
      const request = ++sequence;
      if (active) setState(previous => previous.key === key && previous.photos.length ? { ...previous, error: "" } : { key, photos: [], error: "", loading: true });
      try {
        const { data, error } = await supabase.rpc("animal_growth_photos", { _animal_id: animalId });
        if (error) throw error;
        const photos = (data ?? []).filter(p => p.photo_path.startsWith(`${animalId}/`));
        const urls = await privatePhotoUrls(photos.map(p => p.photo_path), `${role}:${uid}`);
        if (active && request === sequence) setState({ key, photos: photos.map(p => ({ ...p, url: urls.get(p.photo_path) ?? undefined })), error: "", loading: false });
      } catch { if (active && request === sequence) setState({ key, photos: [], error: "Photo comparison is unavailable. Refresh to retry. The farm service may need an update.", loading: false }); }
    };
    void load();
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", state => { if (active && state.isActive) void load(); })).then(handle => { if (active) remove = () => void handle.remove(); else void handle.remove(); }).catch(() => {});
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => { active = false; remove?.(); window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [key, uid, role, animalId, allowed, retry]);
  if (!allowed || !uid) return fallbackUrl ? <AnimalPhotoCarousel animalId={animalId} slides={[{path: revision ?? "current", url: fallbackUrl, label: "Current photo"}]} /> : null;
  const current = state.key === key ? state : { photos: [], error: "", loading: true };
  const slides: AnimalSlide[] = [];
  if (fallbackUrl) slides.push({path: revision ?? "current", url: fallbackUrl, label: "Current photo"});
  growthMonths(current.photos).forEach(month => { if (month.photo?.url && !slides.some(s => s.path === month.photo!.photo_path)) slides.push({path: month.photo.photo_path, url: month.photo.url, label: month.label}); });
  return <><AnimalPhotoCarousel animalId={animalId} slides={slides} /><section className="card-soft space-y-4 p-4 sm:p-5" aria-label="Three-month photo comparison">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Growth photo comparison</h2><p className="text-xs leading-relaxed text-muted-foreground">Latest upload from each of the last three calendar months. Tap a photo to enlarge.</p></div><Button variant="ghost" size="icon" aria-label="Refresh growth photos" onClick={() => setRetry(x => x + 1)}><RefreshCw className="h-4 w-4" /></Button></div>
    {current.loading ? <p role="status" className="text-sm text-muted-foreground">Loading photos…</p> : current.error ? <p role="alert" className="text-sm text-destructive">{current.error}</p> : <div className="grid grid-cols-3 gap-2 sm:gap-3">{growthMonths(current.photos).map(month => <article key={month.key} className="min-w-0 overflow-hidden rounded-2xl border bg-background"><div className="p-2 sm:p-3"><p className="text-xs font-semibold sm:text-sm">{month.label}</p><p className="text-[10px] text-muted-foreground sm:text-xs">{month.relative}</p></div>{month.photo?.url ? <AnimalPhoto animalId={animalId} src={month.photo.url} className="aspect-square rounded-none" /> : <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground"><Camera className="h-7 w-7" /><p className="px-1 text-center text-[10px] sm:text-xs">{month.photo ? "Photo could not load" : "No photo uploaded this month"}</p></div>}{month.photo && <p className="p-2 text-[10px] text-muted-foreground sm:p-3 sm:text-xs">Uploaded {new Date(month.photo.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>}</article>)}</div>}
  </section></>;
}
