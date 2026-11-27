import { expect, it } from "vitest";
import { notificationPresentation } from "@/lib/notification-presentation";
it("labels each notification category without modifying the source message", () => {
  for (const [title, kind, type] of [["Payment due", "payment", "payment"], ["Vaccination recorded", "animal", "vaccine"], ["Health updated", "animal", "health"], ["Weight recorded", "animal", "growth"], ["New farm update", "animal", "update"]] as const) {
    const result = notificationPresentation(title, kind);
    expect(result.type).toBe(type);
    expect(result.emoji).not.toBe("");
  }
});
