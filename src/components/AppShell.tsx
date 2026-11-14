import { Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, PawPrint, Users, ScanLine, UserRound, Bell } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { NotificationBell } from "./Notifications";
import { FarmExport } from "./FarmExport";
import { Brand } from "./Brand";

const left = [{ to: "/", label: "Home", icon: LayoutGrid }, { to: "/animals", label: "Animals", icon: PawPrint }] as const;
const right = [{ to: "/customers", label: "Customers", icon: Users }, { to: "/profile", label: "Profile", icon: UserRound }] as const;

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Users; active: boolean }) {
  return (
    <Link to={to} className="relative flex flex-1 flex-col items-center gap-1 py-2">
      {active && <motion.span layoutId="nav-pill" className="absolute top-1 h-8 w-14 rounded-full bg-secondary" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
      <Icon className={`relative h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.4 : 1.8} />
      <span className={`relative text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useLocation({ select: (l) => l.pathname });
  const is = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b px-5 py-3">
        <Link to="/" className="flex min-w-0 items-center">
          <Brand />
        </Link>
        <div className="flex shrink-0 items-center gap-2"><FarmExport /><NotificationBell /></div>
      </header>
      <motion.main key={path} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} className="px-5 pt-5">
        {children}
      </motion.main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-3 pb-3">
        <div className="glass shadow-nav relative flex items-end rounded-3xl border px-2">
          {left.map((t) => <NavItem key={t.to} {...t} active={is(t.to)} />)}
          <div className="flex flex-1 justify-center">
            <Link to="/scan" aria-label="Scan QR" className="relative -mt-8 mb-2">
              <span className="animate-pulse-ring absolute inset-0 rounded-full bg-primary-glow" />
              <motion.span whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.06 }}
                className={`bg-glow relative grid h-16 w-16 place-items-center rounded-full border-4 border-background text-primary-foreground shadow-float ${is("/scan") ? "ring-2 ring-accent" : ""}`}>
                <ScanLine className="h-7 w-7" />
              </motion.span>
            </Link>
          </div>
          {right.map((t) => <NavItem key={t.to} {...t} active={is(t.to)} />)}
        </div>
      </nav>
    </div>
  );
}

export function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="break-words text-3xl font-semibold leading-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}
