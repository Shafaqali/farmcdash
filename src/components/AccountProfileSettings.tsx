import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Loader2, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";

function PasswordField({ label, value, onChange, current = false }: { label: string; value: string; onChange: (value: string) => void; current?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <label className="block space-y-2 text-xs font-medium">{label}<span className="relative block"><Input required type={visible ? "text" : "password"} minLength={current ? undefined : 8} maxLength={128} autoComplete={current ? "current-password" : "new-password"} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-xl bg-background pr-12" /><button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground" onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}
export function AccountProfileSettings() {
  const { uid, session, role } = useFarm();
  const queries = useQueryClient();
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", loginId: "" });
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<"profile" | "password" | null>(null);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const ready = !!uid && loadedUid === uid;
  useEffect(() => {
    let active = true;
    setLoadedUid(null); setError(""); setPassword({ current: "", next: "", confirm: "" });
    if (!uid) return;
    void Promise.all([supabase.from("profiles").select("full_name,phone,contact_email,user_code").eq("id", uid).single(), supabase.from("login_aliases").select("kind,display_value").eq("user_id", uid)]).then(([p, a]) => {
      if (!active) return;
      if (p.error || a.error || !p.data) throw new Error("Could not load your profile.");
      const email = a.data?.find((x) => x.kind === "email")?.display_value || p.data.contact_email || session?.user.email || "";
      setProfile({ name: p.data.full_name, phone: p.data.phone, email: email.endsWith("@customer.farm.local") ? "" : email, loginId: a.data?.find((x) => x.kind === "id")?.display_value || p.data.user_code || "" });
      setLoadedUid(uid);
    }).catch(() => { if (active) setError("Could not load your profile. Please check your connection."); });
    return () => { active = false; };
  }, [uid, session?.user.email, retry]);
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm"><div className="flex items-center gap-3 border-b px-5 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><UserRound className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">Personal details</h2><p className="mt-0.5 text-xs text-muted-foreground">Keep your contact and login details up to date.</p></div></div>
      {error ? <div role="alert" className="space-y-3 p-5 text-sm"><p>{error}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Retry loading profile</Button></div> : !ready ? <div aria-label="Loading profile" className="space-y-4 p-5">{[1, 2, 3].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div> : <form className="space-y-4 p-5" onSubmit={async (e) => {
        e.preventDefault(); if (busy || !ready) return; setBusy("profile");
        try {
          const { error } = await supabase.rpc("save_login_profile", { _name: profile.name, _phone: profile.phone, _email: profile.email, _login: profile.loginId });
          if (error) throw error;
          const update = await supabase.auth.updateUser({ data: { full_name: profile.name.trim() } });
          if (update.error) throw update.error;
          await queries.invalidateQueries({ queryKey: ["customer-portal", uid] });
          toast.success("Profile saved");
        } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save profile. These login details may already be used."); }
        finally { setBusy(null); }
      }}><fieldset disabled={!!busy} className="space-y-4 disabled:opacity-70">
        <label className="block space-y-2 text-xs font-medium">Full name<Input required maxLength={100} autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="h-12 rounded-xl bg-background" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-2 text-xs font-medium">Phone<Input required type="tel" pattern="[+0-9 ()-]{7,20}" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="h-12 rounded-xl bg-background" /></label><label className="block space-y-2 text-xs font-medium">Login ID<Input readOnly={role === "customer"} required pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" minLength={3} maxLength={32} autoCapitalize="none" autoCorrect="off" value={profile.loginId} onChange={(e) => setProfile({ ...profile, loginId: e.target.value })} className="h-12 rounded-xl bg-background" /></label></div>
        <label className="block space-y-2 text-xs font-medium">Contact email<Input required type="email" readOnly={role !== "customer"} autoComplete="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="h-12 rounded-xl bg-background read-only:bg-muted/50" /></label>
        <p className="text-xs leading-relaxed text-muted-foreground">{role === "customer" ? "Your login ID is assigned by the farm and cannot be changed. You can update your contact details." : "To change your sign-in email, use the email section below."}</p>
        <Button className="h-11 w-full rounded-xl" disabled={!!busy}>{busy === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy === "profile" ? "Saving profile…" : "Save profile"}</Button>
      </fieldset></form>}
    </section>
    <details className="group overflow-hidden rounded-3xl border bg-card shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><KeyRound className="h-5 w-5" /></span><span className="min-w-0"><span className="block font-display text-lg font-semibold">Password & security</span><span className="mt-0.5 block text-xs text-muted-foreground">Change your password securely.</span></span><span aria-hidden="true" className="ml-auto text-xl text-muted-foreground group-open:rotate-45">+</span></summary>
      <form className="space-y-4 border-t p-5" onSubmit={async (e) => {
        e.preventDefault(); if (busy || !ready) return;
        if (password.next !== password.confirm) { toast.error("Passwords do not match"); return; }
        setBusy("password");
        try { const { error } = await supabase.auth.updateUser({ password: password.next, current_password: password.current }); if (error) throw error; setPassword({ current: "", next: "", confirm: "" }); toast.success("Password updated"); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Could not change password"); }
        finally { setBusy(null); }
      }}><fieldset disabled={!!busy || !ready} className="space-y-4"><PasswordField label="Current password" current value={password.current} onChange={(value) => setPassword({ ...password, current: value })} /><PasswordField label="New password" value={password.next} onChange={(value) => setPassword({ ...password, next: value })} /><PasswordField label="Confirm new password" value={password.confirm} onChange={(value) => setPassword({ ...password, confirm: value })} /><p className="text-xs text-muted-foreground">Use at least 8 characters. Your current password is required.</p><Button variant="outline" className="h-11 w-full rounded-xl" disabled={!!busy || !ready}>{busy === "password" ? "Updating…" : "Update password"}</Button></fieldset></form>
    </details>
  </div>;
}
