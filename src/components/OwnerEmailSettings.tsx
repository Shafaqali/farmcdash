import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useFarm } from "@/lib/farm-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function OwnerEmailSettings() {
  const { role, session } = useFarm();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  if (role !== "owner") return null;
  return <details className="group rounded-3xl border bg-card"><summary className="flex cursor-pointer list-none items-center gap-3 p-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-primary"><Mail className="h-5 w-5" /></span><span><span className="block font-semibold">Sign-in email</span><span className="mt-0.5 block text-xs text-muted-foreground">Update your owner account email.</span></span><span className="ml-auto text-xl text-muted-foreground group-open:rotate-45" aria-hidden="true">+</span></summary><form className="space-y-4 border-t p-5" onSubmit={async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true);
    try { const { error } = await supabase.auth.updateUser({ email: email.trim() }); if (error) throw error; setEmail(""); toast.success("Open the confirmation link in your new email to finish the change."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update email"); }
    finally { setBusy(false); }
  }}><p className="break-all text-xs text-muted-foreground">Current: {session?.user.email}</p><label className="block space-y-2 text-xs font-medium">New sign-in email<Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" /></label><Button variant="outline" disabled={busy} className="h-11 w-full rounded-xl">{busy ? "Sending confirmation…" : "Send confirmation email"}</Button></form></details>;
}
