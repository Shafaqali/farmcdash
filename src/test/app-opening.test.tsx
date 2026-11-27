import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppOpening } from "@/components/AppOpening";
const platform = vi.hoisted(() => ({ native: true }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => platform.native } }));
beforeEach(() => { vi.useFakeTimers(); platform.native = true; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it("removes the cold-start overlay after the short animation and does not repeat on rerender", () => {
  const view = render(<AppOpening />);
  expect(screen.getByRole("status", { name: "Opening Star Goats Farm" })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(950));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  view.rerender(<AppOpening />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("skips the animation for reduced motion", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  render(<AppOpening />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
it("does not overlay the website", () => {
  platform.native = false;
  render(<AppOpening />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
