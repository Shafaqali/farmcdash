import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import build from "../../app-version.json";

export function AppVersion() {
  const native = Capacitor.isNativePlatform();
  const [version, setVersion] = useState<{ version: string; build: string } | null>(native ? null : build);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!native) return;
    let active = true;
    void import("@capacitor/app").then(({ App }) => App.getInfo()).then(info => {
      if (active) setVersion({ version: info.version, build: info.build });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [native]);
  return <section className="flex items-center justify-between gap-4 px-3 py-2" aria-label="Installed app version">
    <div><h2 className="text-xs font-semibold">{native ? "Installed app" : "Web app"}</h2><p className="mt-1 text-xs text-muted-foreground">Star Goats Farm</p></div>
    <p className="text-right text-xs font-semibold tabular-nums">{version ? `Version ${version.version}` : failed ? "Version unavailable" : "Checking version..."}{version && <span className="mt-1 block text-xs font-normal text-muted-foreground">Build {version.build}</span>}</p>
  </section>;
}
