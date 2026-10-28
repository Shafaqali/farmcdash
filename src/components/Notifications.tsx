import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Syringe, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { syncPhoneAlerts } from "@/lib/local-alerts";
import { useFarm, inr, chargesFor, TODAY, DAY_MS, fmtDate } from "@/lib/farm-data";

type Alert = { key: string; kind: "vaccine" | "money"; title: string; sub: string; to: string; params?: { id: string }; urgent: boolean };

export function useAlerts(): Alert[] {
  const { animals, customers, payments } = useFarm();
  return useMemo(() => {
    const out: Alert[] = [];
    for (const a of animals) {
      if (a.status !== "Active" || !a.vaccineDue) continue;
      const t = Date.parse(a.vaccineDue);
      if (isNaN(t) || t > TODAY + 3 * DAY_MS) continue;
      const days = Math.round((t - TODAY) / DAY_MS);
      const when = days < 0 ? `${-days} din late` : days === 0 ? "aaj" : `${days} din mein`;
      out.push({ key: `v-${a.id}`, kind: "vaccine", title: `${a.id} (${a.species}) ko vaccine dena hai`, sub: `Due: ${fmtDate(a.vaccineDue)} — ${when}`, to: "/animals/$id", params: { id: a.id }, urgent: days <= 0 });
    }
    for (const c of customers) {
      const due = animals.filter((a) => a.ownerId === c.id).reduce((s, a) => s + chargesFor(a), 0);
      const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
      const bal = due - paid;
      if (bal > 0) out.push({ key: `m-${c.id}-${bal}`, kind: "money", title: `${c.name} ka ${inr(bal)} baki hai`, sub: c.phone || c.village || "Customer", to: "/customers", urgent: false });
    }
    return out.sort((x, y) => Number(y.urgent) - Number(x.urgent));
  }, [animals, customers, payments]);
}

function usePhoneAlerts() {
  const { animals, customers, payments } = useFarm();
  useEffect(() => {
    const vaccines = animals.filter((a) => a.status === "Active" && a.vaccineDue && !isNaN(Date.parse(a.vaccineDue))).map((a) => ({ id: a.id, species: a.species, due: a.vaccineDue as string }));
    const money = customers.map((c) => {
      const due = animals.filter((a) => a.ownerId === c.id).reduce((s, a) => s + chargesFor(a), 0);
      const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
      return { name: c.name, bal: due - paid };
    }).filter((m) => m.bal > 0);
    if (!animals.length && !customers.length) return;
    const sync = () => void syncPhoneAlerts(vaccines, money);
    sync();
    // Re-sync whenever the app comes back to the foreground so schedules stay fresh
    let handle: { remove: () => void } | undefined;
    void import("@capacitor/app").then(({ App }) =>
      App.addListener("appStateChange", (s) => { if (s.isActive) sync(); }).then((h) => { handle = h; })
    ).catch(() => {});
    return () => handle?.remove();
  }, [animals, customers, payments]);
}

export function NotificationBell() {
  const alerts = useAlerts();
  usePhoneAlerts();
  const [open, setOpen] = useState(false);
  const shown = useRef(new Set<string>());

  // Live alert: pop a message for each new vaccine due item
  useEffect(() => {
    for (const a of alerts) {
      if (a.kind !== "vaccine" || shown.current.has(a.key)) continue;
      shown.current.add(a.key);
      toast.warning(a.title, { description: a.sub });
    }
  }, [alerts]);

  return (
    <>
      <button aria-label="Notifications" onClick={() => setOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full bg-muted">
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{alerts.length > 99 ? "99+" : alerts.length}</span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/30" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-16 max-h-[75vh] w-[92%] max-w-md overflow-y-auto rounded-3xl border bg-card p-4 shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <button aria-label="Close" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
            </div>
            {alerts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sab theek hai — koi alert nahi.</p>}
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.key}>
                  <Link to={a.to} params={a.params as never} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${a.kind === "vaccine" ? (a.urgent ? "bg-destructive/15 text-destructive" : "bg-accent/30 text-accent-foreground") : "bg-secondary text-primary"}`}>
                      {a.kind === "vaccine" ? <Syringe className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                    </span>
                    <span><span className="block text-sm font-semibold">{a.title}</span><span className="block text-xs text-muted-foreground">{a.sub}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
