import { readFile, writeFile } from "node:fs/promises";
const gradle = await readFile(new URL("../android/app/build.gradle", import.meta.url), "utf8");
const version = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const build = gradle.match(/versionCode\s+(\d+)/)?.[1];
if (!version || !build) throw new Error("Android version/build are missing");
await writeFile(new URL("../app-version.json", import.meta.url), JSON.stringify({version,build})+"\n");
console.log(`App version ${version} (${build})`);
