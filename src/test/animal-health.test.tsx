import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/farm-data", () => ({ fmtDate: (s: string) => s, isoToday: () => "2026-11-20" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert, select: () => ({ eq: () => ({ order: () => { const result = Promise.resolve({ data: [], error: null }); return Object.assign(result, { order: () => result }); } }) }) }) } }));
import { AnimalHealth } from "@/components/AnimalHealth";
it("saves a single trimmed owner health entry and resets the form", async () => {
  render(<AnimalHealth animalId="GOAT-1" editable />);
  fireEvent.click(screen.getByRole("button", { name: "Health update" }));
  fireEvent.change(screen.getByLabelText("Condition"), { target: { value: "  Reduced appetite  " } });
  fireEvent.change(screen.getByLabelText("Temperature (°C)"), { target: { value: "39.2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save health update" }));
  await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
  expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({ animal_id: "GOAT-1", condition: "Reduced appetite", temperature_c: 39.2, status: "Monitoring" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
