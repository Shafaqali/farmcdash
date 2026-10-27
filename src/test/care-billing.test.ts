import { describe, expect, it } from "vitest";
import { anniversary, carePeriods, nextCareDate } from "@/lib/care-billing";

describe("Arrival-date monthly billing", () => {
  it("charges on arrival and the same day each following month", () => {
    expect(carePeriods({ arrival: "2026-08-26", monthlyCharge: 500 }, "2026-10-25")).toEqual(["2026-08-26", "2026-09-26"]);
    expect(carePeriods({ arrival: "2026-08-26", monthlyCharge: 500 }, "2026-10-26")).toEqual(["2026-08-26", "2026-09-26", "2026-10-26"]);
    expect(nextCareDate({ arrival: "2026-08-26", monthlyCharge: 500, status: "Active" }, "2026-10-26")).toBe("2026-11-26");
  });
  it("uses the last day in short months then restores the original arrival day", () => {
    expect(anniversary("2026-01-31", 1)).toBe("2026-02-28");
    expect(anniversary("2026-01-31", 2)).toBe("2026-03-31");
  });
  it("does not schedule future collections for sold animals", () => {
    expect(carePeriods({ arrival: "2026-08-26", monthlyCharge: 500, soldDate: "2026-09-30" }, "2026-10-26")).toEqual(["2026-08-26", "2026-09-26"]);
    expect(nextCareDate({ arrival: "2026-08-26", monthlyCharge: 500, soldDate: "2026-09-30", status: "Sold" }, "2026-10-26")).toBeNull();
  });
});