import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ createSignedUrls: mock.sign }) } } }));
import { clearPrivatePhotoUrls, privatePhotoUrls } from "@/lib/private-photo-urls";
beforeEach(() => { clearPrivatePhotoUrls(); mock.sign.mockReset(); mock.sign.mockImplementation(async (paths: string[]) => ({ data: paths.map(path => ({ path, signedUrl: `signed:${path}` })), error: null })); });
describe("private photo URL reuse", () => {
  it("keeps stable URLs on refresh and signs only newly authorized paths", async () => {
    await privatePhotoUrls(["a/1.jpg", "a/1.jpg"], "owner:a");
    const urls = await privatePhotoUrls(["a/1.jpg", "a/2.jpg"], "owner:a");
    expect(mock.sign).toHaveBeenNthCalledWith(1, ["a/1.jpg"], 600);
    expect(mock.sign).toHaveBeenNthCalledWith(2, ["a/2.jpg"], 600);
    expect(urls.size).toBe(2);
    await privatePhotoUrls(["a/1.jpg", "a/2.jpg"], "owner:a");
    expect(mock.sign).toHaveBeenCalledTimes(2);
  });
  it("never reuses another account's or role's URLs", async () => {
    await privatePhotoUrls(["a/1.jpg"], "owner:a");
    await privatePhotoUrls(["a/1.jpg"], "customer:b");
    await privatePhotoUrls(["a/1.jpg"], "customer:a");
    expect(mock.sign).toHaveBeenCalledTimes(3);
  });
  it("renews before the ten-minute signed link expires", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      await privatePhotoUrls(["a/1.jpg"], "owner:a");
      clock.mockReturnValue(8 * 60_000);
      await privatePhotoUrls(["a/1.jpg"], "owner:a");
      expect(mock.sign).toHaveBeenCalledTimes(2);
    } finally { clock.mockRestore(); }
  });
  it("deduplicates concurrent signing and prevents late requests restoring a cleared cache", async () => {
    let finish: (value: unknown) => void = () => { throw new Error("Pending callback unavailable"); };
    mock.sign.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = privatePhotoUrls(["a/1.jpg"], "owner:a");
    const second = privatePhotoUrls(["a/1.jpg"], "owner:a");
    expect(mock.sign).toHaveBeenCalledTimes(1);
    clearPrivatePhotoUrls();
    finish({ data: [{ path: "a/1.jpg", signedUrl: "old-url" }], error: null });
    await Promise.all([first, second]);
    await privatePhotoUrls(["a/1.jpg"], "owner:a");
    expect(mock.sign).toHaveBeenCalledTimes(2);
  });
  it("does not return cached paths removed by a fresh portal permission check", async () => {
    await privatePhotoUrls(["a/1.jpg", "a/2.jpg"], "customer:a");
    const permitted = await privatePhotoUrls(["a/2.jpg"], "customer:a");
    expect([...permitted.keys()]).toEqual(["a/2.jpg"]);
  });
});
