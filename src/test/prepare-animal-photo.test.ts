import { afterEach, expect, it, vi } from "vitest";
import { prepareAnimalPhoto } from "@/lib/prepare-animal-photo";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("rejects unsupported or oversized input before decoding", async () => {
  await expect(prepareAnimalPhoto(new File(["not an image"], "file.txt", { type: "text/plain" }))).rejects.toThrow("Choose a JPG");
  const oversized = new File([], "large.jpg", { type: "image/jpeg" });
  Object.defineProperty(oversized, "size", { value: 16 * 1024 * 1024 });
  await expect(prepareAnimalPhoto(oversized)).rejects.toThrow("15 MB");
});

function mockRaster(width: number, height: number) {
  class Raster {
    naturalWidth = width; naturalHeight = height;
    onload: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal("Image", Raster);
  vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  return vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    callback(new Blob([`${this.width}x${this.height}`], { type: type ?? "image/png" }));
  });
}

it("resizes a 3200x2400 new photo to a maximum 1600-pixel edge", async () => {
  const encoder = mockRaster(3200, 2400);
  await prepareAnimalPhoto(new File(["photo"], "camera.jpg", { type: "image/jpeg" }));
  const canvas = encoder.mock.contexts[0];
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("No canvas encoded");
  expect(canvas.width).toBe(1600);
  expect(canvas.height).toBe(1200);
});

it("never upscales a small photo", async () => {
  const encoder = mockRaster(800, 600);
  const original = new File(["small"], "small.jpg", { type: "image/jpeg" });
  expect(await prepareAnimalPhoto(original)).toBe(original);
  expect(encoder).not.toHaveBeenCalled();
});

it("uses an alpha-capable output for PNG transparency", async () => {
  const encoder = mockRaster(3200, 2400);
  const result = await prepareAnimalPhoto(new File(["transparent"], "alpha.png", { type: "image/png" }));
  expect(result.type).toBe("image/webp");
  expect(encoder.mock.lastCall?.[1]).toBe("image/webp");
});
