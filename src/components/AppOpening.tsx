import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** A short cold-start transition. It never repeats on navigation or resume. */
export function AppOpening() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 950);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="app-opening" role="status" aria-label="Opening Star Goats Farm">
    <img src="/branding/star-goats-farm-logo.png" alt="" width="180" height="180" />
    <p>Star Goats Farm</p>
  </div>;
}
