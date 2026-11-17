import { describe, expect, it } from "vitest";
import { customerLoginSchema, loginAlias } from "@/lib/login-identity";
describe("Single password login identifiers", () => {
  it("accepts phone numbers with common separators", () => { expect(loginAlias(" +91 98765-43210 ")).toBe("phone:919876543210"); });
  it("normalizes email addresses", () => { expect(loginAlias("Customer@Example.com ")).toBe("email:customer@example.com"); });
  it("normalizes login IDs without treating them as email", () => { expect(loginAlias(" Shafaq01 ")).toBe("id:shafaq01"); });
  it("requires owner-created customer credentials and full profile", () => {
    const valid = { name: "Customer", phone: "9876543210", email: "customer@example.com", address: "Address", loginId: "customer01", password: "StrongPassword123" };
    expect(customerLoginSchema.safeParse(valid).success).toBe(true);
    for (const invalid of [{ ...valid, password: "" }, { ...valid, loginId: "" }, { ...valid, email: "invalid" }, { ...valid, phone: "12" }]) expect(customerLoginSchema.safeParse(invalid).success).toBe(false);
  });
});