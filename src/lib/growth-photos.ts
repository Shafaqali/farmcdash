export type GrowthPhoto = { photo_path: string; uploaded_at: string; url?: string | undefined };
const monthKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(date);
export function growthMonths(photos: GrowthPhoto[], now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find(p => p.type === "year")?.value);
  const month = Number(parts.find(p => p.type === "month")?.value);
  return Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 - offset, 15));
    const key = monthKey(date);
    const photo = photos.filter(p => Number.isFinite(Date.parse(p.uploaded_at)) && monthKey(new Date(p.uploaded_at)) === key)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
    return { key, label: date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }), relative: offset === 0 ? "Current month" : offset === 1 ? "Previous month" : "Two months ago", photo };
  });
}
