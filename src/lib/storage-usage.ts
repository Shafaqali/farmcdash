export type StorageUsage = {
  record_bytes: number; record_count: number; photo_bytes: number; photo_count: number;
  unknown_photo_sizes: number; checked_at: string;
  breakdown: { label: string; count: number; bytes: number }[];
};
export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Unavailable";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = value === 0 ? 0 : Math.max(0, Math.min(4, Math.floor(Math.log(value) / Math.log(1024))));
  return `${(value / 1024 ** index).toLocaleString("en-IN", { maximumFractionDigits: index === 0 ? 0 : 2 })} ${units[index]}`;
}
