import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn(), oauth: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: auth.oauth } } }));
vi.mock("@/lib/native", () => ({ isNativeApp: () => true, authRedirectUrl: () => "https://farmcdash.lovable.app" }));
import { LoginScreen } from "@/components/LoginScreen";

function fillSignup() {
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "  Shafaq Ali  " } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "shafaq@example.com" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FarmCare-test-123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "FarmCare-test-123" } });
}
describe("FarmCare account access", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);
  it("stores the user's full name on signup and waits for email confirmation without signing in", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<LoginScreen />); fillSignup();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({ email: "shafaq@example.com", password: "FarmCare-test-123", options: { emailRedirectTo: "https://farmcdash.lovable.app", data: { full_name: "Shafaq Ali" } } }));
    await screen.findByRole("button", { name: "Back to sign in" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("does not create an account when passwords disagree", () => {
    render(<LoginScreen />); fillSignup();
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("signs in with email and password and allows retry after rejection", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: new Error("Invalid login credentials") }).mockResolvedValueOnce({ error: null });
    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "shafaq@example.com" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FarmCare-test-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to FarmCare" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in to FarmCare" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Sign in to FarmCare" }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledTimes(2));
    expect(auth.signInWithPassword).toHaveBeenLastCalledWith({ email: "shafaq@example.com", password: "FarmCare-test-123" });
  });
});