import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOutFarmAccount } from "@/lib/background-notices";
import { Button } from "@/components/ui/button";
import { AppVersion } from "@/components/AppVersion";
export function ProfileFooter() {
  const [busy, setBusy] = useState(false);
  const queries = useQueryClient();
  return <footer className="space-y-3 border-t pt-5"><Button variant="outline" disabled={busy} className="h-12 w-full rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={async () => {
    if (busy) return; setBusy(true);
    try { await signOutFarmAccount(); await queries.cancelQueries(); queries.clear(); toast("Signed out"); }
    catch { toast.error("Could not sign out. Please try again."); }
    finally { setBusy(false); }
  }}><LogOut className="h-4 w-4" />{busy ? "Signing out…" : "Sign out"}</Button><AppVersion /></footer>;
}
