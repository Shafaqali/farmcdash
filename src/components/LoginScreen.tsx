import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import logo from "@/assets/farmcare-logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { isNativeApp, authRedirectUrl } from "@/lib/native";

const field = "w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

export function LoginScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: authRedirectUrl(), data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) toast.success("Account created — please sign in");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Sign in failed"); }
    finally { setBusy(false); }
  };
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <img src={logo} alt="FarmCare logo" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl shadow-float" />
        <h1 className="mt-4 text-3xl font-semibold">FarmCare</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Sign in to manage your animals" : "Create your account"}</p>
      </motion.div>
      <form onSubmit={submit} className="card-soft animate-rise mt-8 space-y-3 p-5">
        {mode === "up" && <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={field} type="password" placeholder="Password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <button disabled={busy} className="bg-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-primary-foreground shadow-float active:scale-[.98] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Sign in" : "Create account"}
        </button>
{!native && <>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <button type="button" onClick={google} className="w-full rounded-2xl border bg-card py-3.5 font-semibold active:scale-[.98]">Continue with Google</button>
        </>}
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 text-sm font-semibold text-primary">
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground">Your customers and payments are private to your account.</p>
    </div>
  );
}
