// Build used only for the Android app: a self-contained single-page bundle placed inside the APK.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export default defineConfig({
  vite: {
    plugins: [{
      name: "bundle-farmcare-brand-assets",
      async closeBundle() {
        // CDN paths are not served by Capacitor's localhost. Package the same
        // original assets at their existing paths so images also work offline.
        for (const name of ["farmcare-header-logo.png", "farmcare-app-icon.png"]) {
          const asset = JSON.parse(await readFile(`src/assets/${name}.asset.json`, "utf8")) as { url: string };
          const response = await fetch(new URL(asset.url, "https://farmcdash.lovable.app"));
          if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Could not bundle FarmCare asset: ${name}`);
          const destination = join("dist/client", asset.url);
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
        }
      },
    }],
  },
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true },
  },
});
