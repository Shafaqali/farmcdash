import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AnimalPhoto } from "@/components/AnimalPhoto";
it("prioritizes the hero photo and opens its full view", () => {
  render(<AnimalPhoto src="https://example.test/photo.jpg" animalId="GOAT-1" priority />);
  expect(screen.getByAltText("Animal GOAT-1")).toHaveAttribute("loading", "eager");
  expect(screen.getByAltText("Animal GOAT-1")).toHaveAttribute("fetchpriority", "high");
  fireEvent.click(screen.getByRole("button", { name: "View photo of animal GOAT-1" }));
  expect(screen.getByAltText("Full photo of animal GOAT-1")).toBeInTheDocument();
});
it("shows a failed-photo fallback and accepts a refreshed link", () => {
  const view = render(<AnimalPhoto src="https://example.test/old.jpg" animalId="GOAT-1" />);
  fireEvent.error(screen.getByAltText("Animal GOAT-1"));
  expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  view.rerender(<AnimalPhoto src="https://example.test/new.jpg" animalId="GOAT-1" />);
  expect(screen.getByAltText("Animal GOAT-1")).toHaveAttribute("src", "https://example.test/new.jpg");
});
