import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

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
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({ email: "shafaq@example.com", password: "FarmCare-test-123", options: { emailRedirectTo: "https://farmcdash.lovable.app", data: { full_name: "Shafaq Ali", account_type: "owner" } } }));
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
    fireEvent.click(screen.getByRole("button", { name: "Sign in to STAR GOATS FARM" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in to STAR GOATS FARM" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Sign in to STAR GOATS FARM" }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledTimes(2));
    expect(auth.signInWithPassword).toHaveBeenLastCalledWith({ email: "shafaq@example.com", password: "FarmCare-test-123" });
  });
  it("uses the invited customer's email for customer login without auto-connecting", async () => {
    window.history.replaceState(null, "", `/my-animals#code=${"a".repeat(64)}&email=customer%40example.com`);
    auth.signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginScreen customer />);
    expect(screen.getByLabelText("Email address")).toHaveValue("customer@example.com");
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "Customer-test-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to my animals" }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "customer@example.com", password: "Customer-test-123" }));
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  it("creates customer accounts with the customer signup type", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<LoginScreen customer />); fillSignup();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: { full_name: "Shafaq Ali", account_type: "customer" } }) })));
  });
});