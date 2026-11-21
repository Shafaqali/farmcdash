import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimalPhoto } from "@/components/AnimalPhoto";
import { Button } from "@/components/ui/button";

export type AnimalSlide = { path: string; url: string; label: string };
export function AnimalPhotoCarousel({ animalId, slides }: { animalId: string; slides: AnimalSlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const signature = slides.map(s => s.path).join("|");
  useEffect(() => { setSelected(0); if (track.current) track.current.scrollLeft = 0; }, [animalId, signature]);
  if (!slides.length) return null;
  const go = (index: number) => {
    if (track.current) track.current.scrollTo({ left: index * track.current.clientWidth, behavior: "smooth" });
  };
  return <section className="overflow-hidden rounded-3xl border bg-card shadow-sm" aria-label="Animal photo history">
    <div ref={track} tabIndex={0} role="region" aria-label="Swipe left or right to browse monthly animal photos" className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]" onScroll={e => { const el = e.currentTarget; setSelected(Math.round(el.scrollLeft / (el.clientWidth || 1))); }} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(Math.min(slides.length - 1, Math.max(0, selected + (e.key === "ArrowRight" ? 1 : -1)))); } }}>
      {slides.map((slide, i) => <div key={slide.path} className="w-full shrink-0 snap-center" role="group" aria-label={`${i + 1} of ${slides.length}: ${slide.label}`}><AnimalPhoto src={slide.url} animalId={animalId} className="aspect-[4/3] [&_img]:object-contain" /></div>)}
    </div>
    <div className="flex items-center justify-between gap-2 p-3"><Button variant="outline" size="icon" disabled={selected === 0} aria-label="Previous animal photo" onClick={() => go(selected - 1)}><ChevronLeft /></Button><div className="min-w-0 text-center" aria-live="polite"><p className="text-sm font-semibold">{slides[selected]?.label}</p><p className="text-xs text-muted-foreground">{selected + 1} / {slides.length}{slides.length > 1 ? " · Swipe to compare" : " · Tap to enlarge"}</p></div><Button variant="outline" size="icon" disabled={selected >= slides.length - 1} aria-label="Next animal photo" onClick={() => go(selected + 1)}><ChevronRight /></Button></div>
  </section>;
}
