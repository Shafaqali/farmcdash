import { describe, expect, it } from "vitest";
import { animalGroup, canManageAnimal, customerRouteAllowed, scannedAnimalId } from "@/lib/account-access";
describe("Separate customer and owner permissions", () => {
  it("keeps customer QR details and scanner inside customer access", () => { expect(customerRouteAllowed("/scan")).toBe(true); expect(customerRouteAllowed("/animals/U01-G0001")).toBe(true); });
  it("blocks customer access to every farm-management surface", () => { for (const path of ["/", "/animals", "/animals/new", "/customers", "/customers/customer-one", "/profile", "/categories"]) expect(customerRouteAllowed(path)).toBe(false); });
  it("never grants customer editing even if registration identity matches", () => { expect(canManageAnimal("customer", "same-id", "same-id")).toBe(false); });
  it("only permits the registering farm owner to manage an animal", () => { expect(canManageAnimal("owner", "owner-one", "owner-one")).toBe(true); expect(canManageAnimal("owner", "owner-two", "owner-one")).toBe(false); });
  it("separates personal animals from customer associations", () => { expect(animalGroup("")).toBe("personal"); expect(animalGroup("customer-one")).toBe("customer"); });
  it("opens existing plain tags and shared QR URLs", () => { expect(scannedAnimalId("u01-g0001")).toBe("U01-G0001"); expect(scannedAnimalId("https://farmcdash.lovable.app/animals/U01-G0001")).toBe("U01-G0001"); });
});