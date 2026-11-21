import { describe, expect, it } from "vitest";
import { latestHealth, type HealthRecord } from "@/lib/animal-health-summary";

describe("health observation rules", () => {
  it("does not substitute an older temperature when the latest observation has no measurement", () => {
    const base = { animal_id: "animal", user_id: "owner", details: "", medicine: "", treatment: "", recovery: "", status: "Monitoring", illness_started: null };
    const records: HealthRecord[] = [
      { ...base, id: "a", date: "2026-11-20", created_at: "2026-11-20T10:00:00Z", condition: "Measured", temperature_c: 39.2 },
      { ...base, id: "b", date: "2026-11-21", created_at: "2026-11-21T10:00:00Z", condition: "Progress", temperature_c: null },
    ];
    expect(latestHealth(records)?.id).toBe("b");
    expect(latestHealth(records)?.temperature_c).toBeNull();
  });
  it("preserves unknown legacy creation times", () => {
    const legacy: HealthRecord = { id: "legacy", animal_id: "animal", user_id: "owner", date: "2026-11-20", created_at: null, condition: "Observation", details: "", medicine: "", treatment: "", recovery: "", status: "Monitoring", temperature_c: null, illness_started: null };
    expect(latestHealth([legacy])?.created_at).toBeNull();
  });
});