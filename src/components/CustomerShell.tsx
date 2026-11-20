import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ScanLine, PawPrint, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Brand } from "./Brand";
import { CustomerNotifications } from "./CustomerNotifications";
import { signOutFarmAccount } from "@/lib/background-notices";
export function CustomerShell({ children }: { children: ReactNode }) {
  const queries = useQueryClient();
  const navigate = useNavigate();
  const path = useLocation({ select: (location) => location.pathname });
  const [signingOut, setSigningOut] = useState(false);
  return <div className="mx-auto min-h-svh max-w-2xl pb-28">
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5"><Link to="/my-animals" className="min-w-0"><Brand /></Link><div className="flex shrink-0 items-center gap-1"><CustomerNotifications /><Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" disabled={signingOut} className="rounded-full text-muted-foreground" onClick={async () => {
      if (signingOut) return; setSigningOut(true);
      try { await signOutFarmAccount(); await queries.cancelQueries(); queries.clear(); await navigate({ to: "/my-animals", replace: true }); }
      catch { toast.error("Could not sign out. Please try again."); }
      finally { setSigningOut(false); }
    }}><LogOut className="h-4 w-4" /></Button></div></header>
    <main className="px-4 py-5 sm:px-5">{children}</main>
    <nav aria-label="Customer navigation" className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><div className="glass shadow-nav grid grid-cols-3 rounded-3xl border p-2">{[{ to: "/my-animals", label: "My animals", icon: PawPrint }, { to: "/scan", label: "Scan QR", icon: ScanLine }, { to: "/settings", label: "My profile", icon: UserRound }].map(({ to, label, icon: Icon }) => {
      const selected = path === to || (to === "/my-animals" && path.startsWith("/animals/"));
      return <Link key={to} to={to} aria-current={selected ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-2xl text-[10px] font-semibold transition-colors ${selected ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-5 w-5" strokeWidth={selected ? 2.3 : 1.8} />{label}</Link>;
    })}</div></nav>
  </div>;
}
