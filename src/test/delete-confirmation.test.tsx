import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeleteConfirmation } from "@/components/DeleteConfirmation";
afterEach(cleanup);
it("keeps a failed deletion open and permits retry without pretending it succeeded", async () => {
  const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Record is still linked")).mockResolvedValueOnce(undefined);
  const onOpenChange = vi.fn();
  render(<DeleteConfirmation open onOpenChange={onOpenChange} title="Delete record?" description="Permanent removal" onConfirm={onConfirm} />);
  fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  await screen.findByRole("alert");
  expect(onOpenChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(onConfirm).toHaveBeenCalledTimes(2);
});