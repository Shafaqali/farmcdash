import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), changed: vi.fn(), busy: vi.fn() }));
vi.mock("@/lib/prepare-animal-photo", () => ({ prepareAnimalPhoto: mocks.prepare }));
import { AnimalPhotoPicker } from "@/components/AnimalPhotoPicker";
function Harness() { const [value, setValue] = useState<File | null>(null); return <AnimalPhotoPicker value={value} onChange={file => { mocks.changed(file); setValue(file); }} onProcessingChange={mocks.busy} />; }
beforeEach(() => { mocks.prepare.mockReset(); mocks.changed.mockReset(); mocks.busy.mockReset(); URL.createObjectURL = vi.fn(() => "blob:preview"); URL.revokeObjectURL = vi.fn(); });
describe("animal camera/gallery picker", () => {
  it("keeps camera capture separate from the gallery chooser", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Take animal photo")).toHaveAttribute("capture", "environment");
    expect(screen.getByLabelText("Choose animal photo from gallery")).not.toHaveAttribute("capture");
    expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Choose from gallery" })).toBeEnabled();
  });
  it("prepares a camera photo before preview and releases its preview when removed", async () => {
    const original = new File(["camera image"], "camera.jpg", { type: "image/jpeg" });
    const optimized = new File(["small"], "small.jpg", { type: "image/jpeg" });
    mocks.prepare.mockResolvedValue(optimized);
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Take animal photo"), { target: { files: [original] } });
    expect(await screen.findByAltText("Selected animal photo preview")).toBeInTheDocument();
    expect(mocks.changed).toHaveBeenCalledWith(optimized);
    expect(screen.getByText(/Ready to upload/)).toHaveTextContent("5 B");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByAltText("Selected animal photo preview")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
  it("blocks competing selections during resize and cancels a late result on unmount", async () => {
    let finish!: (file: File) => void;
    mocks.prepare.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const photo = new File(["camera"], "camera.jpg", { type: "image/jpeg" });
    const view = render(<Harness />);
    fireEvent.change(screen.getByLabelText("Choose animal photo from gallery"), { target: { files: [photo] } });
    expect(screen.getByRole("status")).toHaveTextContent("Resizing photo");
    expect(screen.getByRole("button", { name: "Take photo" })).toBeDisabled();
    expect(mocks.busy).toHaveBeenCalledWith(true);
    view.unmount();
    await act(async () => { finish(photo); });
    expect(mocks.changed).not.toHaveBeenCalled();
    expect(mocks.busy).toHaveBeenLastCalledWith(false);
  });
  it("shows preparation errors without uploading or selecting an invalid image", async () => {
    mocks.prepare.mockRejectedValue(new Error("Choose a JPG, PNG, WebP or BMP photo."));
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Choose animal photo from gallery"), { target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a JPG");
    await waitFor(() => expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled());
    expect(mocks.changed).not.toHaveBeenCalled();
  });
});
