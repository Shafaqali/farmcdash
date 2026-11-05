import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import logo from "@/assets/farmcare-header-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { isNativeApp, authRedirectUrl } from "@/lib/native";
import { pendingCustomerInvitation } from "@/lib/customer-portal";

const field = "h-12 bg-card pl-11 pr-4 shadow-none";

export function LoginScreen({ customer = false }: { customer?: boolean }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendWait, setResendWait] = useState(0);
  useEffect(() => {
    if (customer) {
      const invitation = pendingCustomerInvitation();
      if (invitation?.email) setEmail(invitation.email);
    }
  }, [customer]);
  useEffect(() => {
    if (resendWait <= 0) return;
    const timer = window.setTimeout(() => setResendWait((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWait]);
  const changeMode = (next: "in" | "up") => {
    setMode(next); setError(""); setConfirmation(false); setPw(""); setConfirmPassword(""); setShowPassword(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (mode === "up" && !name.trim()) { setError("Please enter your name."); return; }
    if (mode === "up" && pw !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: authRedirectUrl(), data: { full_name: name.trim() } } });
        if (error) throw error;
        if (!data.session) { setConfirmation(true); setResendWait(60); setPw(""); setConfirmPassword(""); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  };
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  const google = async () => {
    setBusy(true); setError("");
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: customer ? `${window.location.origin}/my-animals` : window.location.origin });
      if (r.error) throw r.error;
    } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again."); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (busy || resendWait > 0) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authRedirectUrl() } });
      if (error) throw error;
      setResendWait(60);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to resend email."); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-svh bg-background">
      <main className="flex min-h-svh flex-col justify-center px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
        <img src={logo.url} alt="FarmCare" width={264} height={88} className="mx-auto h-20 w-64 max-w-full object-contain" />
        <nav aria-label="Login account type" className="mt-6 grid grid-cols-2 gap-1 rounded-lg border p-1">
          <Button asChild variant={customer ? "ghost" : "default"}><Link to="/">Farm owner</Link></Button>
          <Button asChild variant={customer ? "default" : "ghost"}><Link to="/my-animals">Customer</Link></Button>
        </nav>
        <div className="mx-auto w-full max-w-sm py-6 lg:py-8">
          <h1 className="text-center text-2xl font-semibold">{confirmation ? "Check your email" : customer ? (mode === "in" ? "Customer login" : "Create customer account") : mode === "in" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">{confirmation ? "Confirm your account to get started." : customer ? "Your animal care account" : "Your animals. Your farm. Always connected."}</p>
          {confirmation ? <div className="mt-8 space-y-5">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-sm leading-relaxed">Open the confirmation link sent to <strong className="break-all">{email.trim()}</strong>, then return here and sign in. Check your spam folder too.</p>
            {native && <p className="text-sm text-muted-foreground">The link opens the FarmCare website. After confirming, return to this app to sign in.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full" onClick={() => changeMode("in")}>Back to sign in <ArrowRight /></Button>
            <Button variant="outline" className="h-12 w-full" disabled={busy || resendWait > 0} onClick={resend}>{busy && <Loader2 className="animate-spin" />}{resendWait > 0 ? `Resend email in ${resendWait}s` : "Resend confirmation email"}</Button>
          </div> : <>
            <div className="mt-7 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" aria-label="Account access">
              <Button type="button" variant={mode === "in" ? "default" : "ghost"} disabled={busy} aria-pressed={mode === "in"} onClick={() => changeMode("in")}>Sign in</Button>
              <Button type="button" variant={mode === "up" ? "default" : "ghost"} disabled={busy} aria-pressed={mode === "up"} onClick={() => changeMode("up")}>Sign up</Button>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-5">
              {mode === "up" && <div><label htmlFor="account-name" className="mb-2 block text-sm font-medium">Full name</label><div className="relative"><UserRound className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" /><Input id="account-name" className={field} autoComplete="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} /></div></div>}
              <div><label htmlFor="account-email" className="mb-2 block text-sm font-medium">Email address</label><div className="relative"><Mail className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" /><Input id="account-email" className={field} type="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} /></div></div>
              <div><label htmlFor="account-password" className="mb-2 block text-sm font-medium">Password</label><div className="relative"><LockKeyhole className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" /><Input id="account-password" className={`${field} pr-12`} type={showPassword ? "text" : "password"} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder={mode === "in" ? "Enter your password" : "Create a password"} minLength={mode === "up" ? 6 : undefined} value={pw} onChange={(e) => setPw(e.target.value)} required disabled={busy} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div>
              {mode === "up" && <div><label htmlFor="account-confirm" className="mb-2 block text-sm font-medium">Confirm password</label><div className="relative"><LockKeyhole className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" /><Input id="account-confirm" className={field} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={busy} /></div></div>}
              {error && <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="h-12 w-full text-base">{busy ? <Loader2 className="animate-spin" /> : null}{mode === "in" ? (customer ? "Sign in to my animals" : "Sign in to FarmCare") : "Create account"}{!busy && <ArrowRight />}</Button>
            </form>
            {!native && <div className="mt-6 space-y-5"><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div><Button type="button" variant="outline" className="h-12 w-full bg-card" disabled={busy} onClick={google}>Continue with Google</Button></div>}
          </>}
        </div>
        <div className="mx-auto flex max-w-sm items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><p>Your customers and payments stay private to your account.</p></div>
        </div>
      </main>
    </div>
  );
}
