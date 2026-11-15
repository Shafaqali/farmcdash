import { describe, expect, it } from "vitest";
import { chargesFor } from "@/lib/farm-data";

describe("Caring rules", () => {
  it("never charges personal animals even with an old nonzero charge", () => {
    expect(chargesFor({ ownerId: "", arrival: "2026-09-15", monthlyCharge: 1500 }, 0, Date.parse("2026-11-15"))).toBe(0);
  });
  it("starts customer care on the registration caring date", () => {
    expect(chargesFor({ ownerId: "customer", arrival: "2026-10-20", monthlyCharge: 1500 }, 0, Date.parse("2026-11-15"))).toBe(1500);
  });
});