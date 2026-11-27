import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Animal } from "@/lib/farm-data";
import { latestHealth, type HealthRecord } from "@/lib/animal-health-summary";
vi.mock("@/lib/farm-data", () => ({ fmtDate: (s: string) => s }));
import { AnimalQuickSummary } from "@/components/AnimalQuickSummary";
const animal = { id: "GOAT-1", species: "Goat", sub: "", breed: "Sirohi", status: "Active", arrival: "2026-09-01", weights: [{ id: "w", date: "2026-11-20", kg: 28 }], vaccinations: [{ id: "v", name: "PPR", date: "2026-11-19", nextDue: "2027-11-19" }], vaccineDue: "2027-11-19", notes: "PRIVATE NOTE" } as Animal;
const health = { id: "h", animal_id: "GOAT-1", date: "2026-11-20", created_at: "2026-11-20T10:00:00Z", temperature_c: 39.2, status: "Recovering", condition: "Improving appetite", medicine: "PRIVATE MEDICINE" } as HealthRecord;
describe("animal summary", () => {
  it("shows owner, dated temperature, weight, health and vaccines to permitted viewers", () => {
    render(<AnimalQuickSummary animal={animal} ownerName="Animal owner" registeredBy="Farm owner" privateAccess health={health} />);
    expect(screen.getByText("Animal owner")).toBeInTheDocument();
    expect(screen.getByText("39.2 °C · 2026-11-20")).toBeInTheDocument();
    expect(screen.getByText("Recovering")).toBeInTheDocument();
    expect(screen.getByText("28 kg · 2026-11-20")).toBeInTheDocument();
    expect(screen.getByText("PPR")).toBeInTheDocument();
  });
  it("does not expose private health or notes in shared summaries", () => {
    render(<AnimalQuickSummary animal={animal} health={health} />);
    expect(screen.queryByText("PRIVATE MEDICINE")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIVATE NOTE")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovering")).not.toBeInTheDocument();
  });
  it("replaces missing health fields with one concise empty state", () => {
    render(<AnimalQuickSummary animal={animal} privateAccess health={null} />);
    expect(screen.getByText("No health observations recorded yet.")).toBeInTheDocument();
    expect(screen.queryByText("Medicines & dosage")).not.toBeInTheDocument();
    expect(screen.queryByText("Health observation date")).not.toBeInTheDocument();
  });
  it("uses the newest observation, breaking same-day ties by record timestamp", () => {
    expect(latestHealth([{ ...health, id: "zzz", created_at: "2026-11-20T09:00:00Z" }, health, { ...health, id: "older", date: "2026-11-19" }])?.id).toBe("h");
    expect(latestHealth([])).toBeNull();
  });
});
