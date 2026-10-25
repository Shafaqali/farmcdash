import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, LogOut, ChevronRight, PawPrint, Users, IndianRupee, Tags, ScanLine, ShieldCheck, KeyRound, Mail, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm, inr } from "@/lib/farm-data";

const field = "w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile — FarmCare" },
    { name: "description", content: "Your farm profile, settings and quick actions." },
    { property: "og:title", content: "Profile — FarmCare" },
    { property: "og:description", content: "Your farm profile, settings and quick actions." },
  ] }),
  component: Profile,
});

function Profile() {
  const { animals, customers, payments, isAdmin, userName, session } = useFarm();
  const sold = animals.filter((a) => a.status === "Sold").length;
  const active = animals.filter((a) => a.status === "Active").length;
  return (
    <div className="space-y-5">
      <section className="bg-hero animate-rise relative overflow-hidden rounded-3xl p-6 text-center text-primary-foreground shadow-float">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary-glow/40 blur-2xl" />
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-primary-foreground/30 bg-accent font-display text-3xl font-semibold uppercase text-accent-foreground">{userName[0] ?? "F"}</div>
        <h1 className="relative mt-3 text-2xl font-semibold">{userName}</h1>
        <p className="relative text-sm opacity-80">{session?.user.email}</p>
        <span className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5" />My farm</span>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {[{ i: PawPrint, v: `${active}/${animals.length}`, l: "Active" }, { i: Users, v: customers.length, l: "Customers" }, { i: IndianRupee, v: inr(payments.reduce((s, p) => s + p.amount, 0)), l: "Collected" }].map((s) => (
            <div key={s.l} className="rounded-2xl bg-primary-foreground/10 py-3"><s.i className="mx-auto h-4 w-4 opacity-80" /><p className="mt-1 font-semibold">{s.v}</p><p className="text-[11px] opacity-75">{s.l}</p></div>
          ))}
        </div>
        <p className="relative mt-3 text-xs opacity-75">{sold} sold</p>
      </section>
      {isAdmin && <Link to="/animals/new" className="bg-glow animate-rise flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-primary-foreground shadow-float active:scale-[.98]"><Plus className="h-5 w-5" />Register new animal</Link>}
      <ul className="card-soft animate-rise divide-y overflow-hidden">
        {[{ i: Tags, l: "Animal categories", to: "/categories" as const }, { i: ScanLine, l: "Scan & update animal", to: "/scan" as const }].map((r) => (
          <li key={r.l}><Link to={r.to} className="flex w-full items-center gap-3 px-4 py-4 active:bg-muted">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><r.i className="h-4 w-4" /></span>
            <span className="flex-1 font-medium">{r.l}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link></li>
        ))}
      </ul>
      <AccountSettings />
      <button onClick={async () => { await supabase.auth.signOut(); toast("Signed out"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3.5 font-semibold text-destructive"><LogOut className="h-4 w-4" />Sign out</button>
    </div>
  );
}

function AccountSettings() {
  const { session } = useFarm();
  const [open, setOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busyPw, setBusyPw] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw, current_password: curPw });
      if (error) throw error;
      toast.success("Password updated");
      setCurPw(""); setNewPw("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not update password"); }
    finally { setBusyPw(false); }
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Confirmation link sent to your new email — open it to finish the change");
      setNewEmail("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not update email"); }
    finally { setBusyEmail(false); }
  };

  return (
    <section className="card-soft animate-rise overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-4 active:bg-muted">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Settings2 className="h-4 w-4" /></span>
        <span className="flex-1 text-left font-medium">Account settings</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="space-y-5 border-t px-4 py-5">
          <form onSubmit={changePassword} className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" />Change password</p>
            <input className={field} type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
            <input className={field} type="password" placeholder="New password (min 6 characters)" minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            <button disabled={busyPw} className="bg-glow flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-primary-foreground shadow-float active:scale-[.98] disabled:opacity-60">
              {busyPw && <Loader2 className="h-4 w-4 animate-spin" />}Update password
            </button>
          </form>
          <form onSubmit={changeEmail} className="space-y-3 border-t pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-primary" />Change email</p>
            <p className="text-xs text-muted-foreground">Current: {session?.user.email}</p>
            <input className={field} type="email" placeholder="New email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <button disabled={busyEmail} className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-card py-3 font-semibold active:scale-[.98] disabled:opacity-60">
              {busyEmail && <Loader2 className="h-4 w-4 animate-spin" />}Update email
            </button>
            <p className="text-[11px] text-muted-foreground">A confirmation link goes to the new email — the change completes after you open it.</p>
          </form>
        </div>
      )}
    </section>
  );
}
