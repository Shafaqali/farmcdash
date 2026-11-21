import type { Database } from "@/integrations/supabase/types";
export type HealthRecord = Database["public"]["Tables"]["animal_health"]["Row"];
export function latestHealth(records: HealthRecord[]): HealthRecord | null {
  return [...records].sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? "").localeCompare(a.created_at ?? "") || b.id.localeCompare(a.id))[0] ?? null;
}
