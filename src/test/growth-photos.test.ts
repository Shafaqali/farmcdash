import { describe, it, expect } from "vitest";
import { growthMonths } from "@/lib/growth-photos";

describe("growth photo calendar comparison", () => {
  it("uses the latest upload per month and does not substitute an older month's photo", () => {
    const months = growthMonths([
      { photo_path: "a/old.jpg", uploaded_at: "2026-11-01T00:00:00Z" },
      { photo_path: "a/latest.jpg", uploaded_at: "2026-11-19T00:00:00Z" },
      { photo_path: "a/sept.jpg", uploaded_at: "2026-09-10T00:00:00Z" },
      { photo_path: "a/aug.jpg", uploaded_at: "2026-08-10T00:00:00Z" },
    ], new Date("2026-11-20T00:00:00Z"));
    expect(months.map(m => m.photo?.photo_path)).toEqual(["a/latest.jpg", undefined, "a/sept.jpg"]);
    expect(months.map(m => m.label)).toEqual(["November 2026", "October 2026", "September 2026"]);
  });
  it("handles year boundaries and the Indian calendar month at midnight", () => {
    const months = growthMonths([{ photo_path: "a/jan.jpg", uploaded_at: "2026-12-31T19:00:00Z" }], new Date("2026-12-31T19:30:00Z"));
    expect(months.map(m => m.label)).toEqual(["January 2027", "December 2026", "November 2026"]);
    expect(months[0]?.photo?.photo_path).toBe("a/jan.jpg");
  });
});
