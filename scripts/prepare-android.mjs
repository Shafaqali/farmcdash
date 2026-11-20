import { cp, copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

// TanStack/Nitro versions emit the SPA in either location. Pick the newest
// shell so a Windows build cannot silently package an older local bundle.
const candidates = await Promise.all([".output/public", "dist/client"].map(async (directory) => {
  try { return { directory, modified: (await stat(`${directory}/_shell.html`)).mtimeMs }; }
  catch { return null; }
}));
const source = candidates.filter(Boolean).sort((a, b) => b.modified - a.modified)[0];
if (!source) throw new Error("Android SPA shell was not generated");
await mkdir("dist/client", { recursive: true });
if (resolve(source.directory) !== resolve("dist/client")) {
  await cp(source.directory, "dist/client", { recursive: true });
}
await copyFile("dist/client/_shell.html", "dist/client/index.html");
console.log(`Prepared Android SPA from ${source.directory}`);
