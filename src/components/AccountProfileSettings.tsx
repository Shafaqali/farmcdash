import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";

export function AccountProfileSettings() {
  const { uid, session, role } = useFarm();
  const [profile, setProfile] = useState({ name: "", phone: "", email: "", loginId: "" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  useEffect(() => {
    let active = true;
    if (!uid) return;
    setReady(false);
    void Promise.all([supabase.from("profiles").select("full_name,phone,contact_email,user_code").eq("id", uid).single(), supabase.from("login_aliases").select("kind,display_value").eq("user_id", uid)]).then(([p,a]) => {
      if (!active) return;
      if (p.error || a.error || !p.data) { toast.error("Could not load your profile"); return; }
      setProfile({ name: p.data.full_name, phone: p.data.phone, email: a.data?.find(x => x.kind === "email")?.display_value || p.data.contact_email || session?.user.email || "", loginId: a.data?.find(x => x.kind === "id")?.display_value || p.data.user_code || "" });
      setReady(true);
    });
    return () => { active = false; };
  }, [uid, session?.user.email]);
  return <div className="space-y-7">
    <form className="space-y-4 border-b pb-6" onSubmit={async e => {
      e.preventDefault(); if (busy || !ready) return; setBusy(true);
      try {
        const { error } = await supabase.rpc("save_login_profile", { _name: profile.name, _phone: profile.phone, _email: profile.email, _login: profile.loginId });
        if (error) throw error;
        const update = await supabase.auth.updateUser({ data: { full_name: profile.name.trim() } });
        if (update.error) throw update.error;
        toast.success("Profile saved");
      } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save profile. This login ID, phone or email may already be used."); } finally { setBusy(false); }
    }}>
      <h2 className="text-lg font-semibold">Your profile</h2>
      <label className="block space-y-2 text-sm">Full name<Input required maxLength={100} autoComplete="name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label>
      <label className="block space-y-2 text-sm">Phone<Input required type="tel" pattern="[+0-9 ()-]{7,20}" autoComplete="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
      <label className="block space-y-2 text-sm">Email<Input required type="email" readOnly={role !== "customer"} autoComplete="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></label>
      <label className="block space-y-2 text-sm">Login ID<Input required pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" minLength={3} maxLength={32} autoCapitalize="none" value={profile.loginId} onChange={e => setProfile({ ...profile, loginId: e.target.value })} /></label>
      <Button disabled={busy || !ready}>{busy ? "Saving…" : "Save profile"}</Button>
    </form>
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); if (busy) return;
      if (password.next !== password.confirm) { toast.error("Passwords do not match"); return; }
      setBusy(true);
      try { const { error } = await supabase.auth.updateUser({ password: password.next, current_password: password.current }); if (error) throw error; setPassword({ current: "", next: "", confirm: "" }); toast.success("Password updated"); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Could not change password"); } finally { setBusy(false); }
    }}>
      <h2 className="text-lg font-semibold">Change password</h2>
      <label className="block space-y-2 text-sm">Current password<Input required type="password" autoComplete="current-password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} /></label>
      <label className="block space-y-2 text-sm">New password<Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password.next} onChange={e => setPassword({ ...password, next: e.target.value })} /></label>
      <label className="block space-y-2 text-sm">Confirm new password<Input required type="password" autoComplete="new-password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} /></label>
      <Button disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
    </form>
  </div>;
}