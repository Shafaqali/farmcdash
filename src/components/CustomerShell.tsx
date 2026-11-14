import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ScanLine, PawPrint } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brand } from "./Brand";
import { CustomerNotifications } from "./CustomerNotifications";
export function CustomerShell({ children }: { children: ReactNode }) {
  const queries = useQueryClient(); const navigate = useNavigate();
  return <div className="mx-auto min-h-svh max-w-2xl pb-24"><header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background px-5 py-4"><Link to="/my-animals" className="min-w-0"><Brand /></Link><div className="flex shrink-0"><CustomerNotifications /><Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={async () => { await queries.cancelQueries(); queries.clear(); await supabase.auth.signOut(); await navigate({ to: "/my-animals", replace: true }); }}><LogOut /></Button></div></header><main className="px-5 py-5">{children}</main><nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl justify-around border-t bg-background px-5 py-4"><Button asChild variant="ghost"><Link to="/my-animals"><PawPrint />My animals</Link></Button><Button asChild variant="ghost"><Link to="/scan"><ScanLine />Scan QR</Link></Button></nav></div>;
}