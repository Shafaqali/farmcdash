import { expect, it } from "vitest";
import { prepareAnimalPhoto } from "@/lib/prepare-animal-photo";
it("rejects unsupported or oversized input before decoding", async () => {
  await expect(prepareAnimalPhoto(new File(["not an image"], "file.txt", { type: "text/plain" }))).rejects.toThrow("Choose a JPG");
  const oversized = new File([], "large.jpg", { type: "image/jpeg" });
  Object.defineProperty(oversized, "size", { value: 16 * 1024 * 1024 });
  await expect(prepareAnimalPhoto(oversized)).rejects.toThrow("15 MB");
});
