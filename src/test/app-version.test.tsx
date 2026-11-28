import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppVersion } from "@/components/AppVersion";
import version from "../../app-version.json";
const mocks = vi.hoisted(() => ({ native: true, info: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: mocks.info } }));
beforeEach(() => { mocks.native = true; mocks.info.mockReset(); });
afterEach(cleanup);
it("shows the installed package version rather than a hardcoded web version", async () => {
  mocks.info.mockResolvedValue({ version: "1.28", build: "28" });
  render(<AppVersion />);
  await screen.findByText("Version 1.28");
  expect(screen.getByText("Build 28")).toBeInTheDocument();
});
it("labels browser build information separately", () => {
  mocks.native = false;
  render(<AppVersion />);
  expect(screen.getByText("Web app")).toBeInTheDocument();
  expect(screen.getByText(`Version ${version.version}`)).toBeInTheDocument();
  expect(mocks.info).not.toHaveBeenCalled();
});
it("does not invent an installed version if the native API fails", async () => {
  mocks.info.mockRejectedValue(new Error("Unavailable"));
  render(<AppVersion />);
  await screen.findByText("Version unavailable");
});
