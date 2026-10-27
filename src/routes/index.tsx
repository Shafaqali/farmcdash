import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PawPrint, Activity, Users, AlertTriangle, CalendarClock, TrendingUp, Wallet, ScanLine, Plus, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFarm, inr, chargesFor, TODAY, DAY_MS, fmtLong, monShort } from "@/lib/farm-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard — FarmCare" },
    { name: "description", content: "Farm overview: animals, charges, collections and vaccines at a glance." },
    { property: "og:title", content: "Dashboard — FarmCare" },
    { property: "og:description", content: "Farm overview: animals, charges, collections and vaccines at a glance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dashboard,
});

const periods = [{ k: "30d", d: 30 }, { k: "90d", d: 90 }, { k: "6m", d: 180 }, { k: "All", d: 3650 }];
const tip = { contentStyle: { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 } };

function Dashboard() {
  const { animals, customers, payments, categories } = useFarm();
  const [p, setP] = useState(1);
  const from = TODAY - periods[p]!.d * DAY_MS;
  const m = useMemo(() => {
    const charges = animals.reduce((s, a) => s + chargesFor(a, from), 0);
    const collected = payments.filter((x) => Date.parse(x.date) >= from).reduce((s, x) => s + x.amount, 0);
    const overdue = animals.filter((a) => a.status === "Active" && a.vaccineDue && Date.parse(a.vaccineDue) < TODAY).length;
    const due = animals.filter((a) => { const t = Date.parse(a.vaccineDue); return t >= TODAY && t <= TODAY + 14 * DAY_MS; }).length;
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(TODAY); d.setUTCMonth(d.getUTCMonth() - 5 + i, 1);
      const s = d.getTime(), e = new Date(d).setUTCMonth(d.getUTCMonth() + 1);
      return {
        m: monShort(s),
        charges: animals.filter((a) => Date.parse(a.arrival) < e).reduce((t, a) => t + a.monthlyCharge, 0),
        paid: payments.filter((x) => { const t = Date.parse(x.date); return t >= s && t < e; }).reduce((t, x) => t + x.amount, 0),
      };
    });
    const species = categories.filter((c) => !c.parentId).map((c) => ({ n: c.name, v: animals.filter((a) => a.categoryId === c.id).length }));
    return { charges, collected, overdue, due, months, species };
  }, [animals, payments, categories, from]);
  const rate = m.charges ? Math.min(100, Math.round((m.collected / m.charges) * 100)) : 0;
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-hero relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-float">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-glow/40 blur-2xl" />
        <p className="text-sm opacity-80">{fmtLong(TODAY)}</p>
        <h1 className="mt-1 text-3xl font-semibold">Farm overview</h1>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div><p className="text-xs opacity-75">Outstanding</p><p className="font-display text-2xl font-semibold">{inr(m.charges - m.collected)}</p></div>
          <div><p className="text-xs opacity-75">Collection rate</p><p className="font-display text-2xl font-semibold">{rate}%</p></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
          <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 1.1, ease: "easeOut" }} className="h-full rounded-full bg-accent" />
        </div>
        <div className="mt-5 flex gap-2">
          <Link to="/scan" className="flex items-center gap-2 rounded-full bg-primary-foreground px-4 py-2 text-sm font-semibold text-primary"><ScanLine className="h-4 w-4" />Scan QR</Link>
          <Link to="/animals/new" className="flex items-center gap-2 rounded-full border border-primary-foreground/40 px-4 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />Register</Link>
        </div>
      </motion.section>

      <div className="relative flex rounded-full bg-muted p-1">
        {periods.map((x, i) => (
          <button key={x.k} onClick={() => setP(i)} className="relative flex-1 py-2 text-sm font-medium">
            {p === i && <motion.span layoutId="period" className="absolute inset-0 rounded-full bg-primary shadow-float" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className={`relative ${p === i ? "text-primary-foreground" : "text-muted-foreground"}`}>{x.k}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { l: "Total animals", v: animals.length, i: PawPrint, to: "/animals" },
          { l: "Active in care", v: animals.filter((a) => a.status === "Active").length, i: Activity, to: "/animals" },
          { l: "Customers", v: customers.length, i: Users, to: "/customers" },
          { l: "Charges", v: inr(m.charges), i: TrendingUp, to: "/customers" },
          { l: "Collected", v: inr(m.collected), i: Wallet, to: "/customers" },
          { l: "Vaccines due 14d", v: m.due, i: CalendarClock, to: "/animals", tone: "warn" },
          { l: "Overdue vaccines", v: m.overdue, i: AlertTriangle, to: "/animals", tone: "bad" },
          { l: "Added this month", v: animals.filter((a) => Date.parse(a.arrival) > TODAY - 30 * DAY_MS).length, i: Plus, to: "/animals" },
        ].map((s, idx) => (
          <Link key={s.l} to={s.to} className="card-soft animate-rise group p-4 transition-transform active:scale-95" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-start justify-between">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${s.tone === "bad" ? "bg-destructive/10 text-destructive" : s.tone === "warn" ? "bg-accent/30 text-accent-foreground" : "bg-secondary text-primary"}`}><s.i className="h-4 w-4" /></span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </Link>
        ))}
      </div>

      <section className="card-soft animate-rise p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Charges vs payments</h2>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-chart-1" />Charges</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-chart-2" />Paid</span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={m.months} margin={{ left: -18, right: 4, top: 6 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity={0.5} /><stop offset="1" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip {...tip} formatter={(v) => inr(Number(v))} />
              <Area type="monotone" dataKey="charges" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g1)" animationDuration={1200} />
              <Area type="monotone" dataKey="paid" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#g2)" animationDuration={1400} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card-soft animate-rise p-4">
          <h2 className="mb-2 text-lg font-semibold">Herd mix</h2>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36">
              <ResponsiveContainer>
                <PieChart><Pie data={m.species} dataKey="v" nameKey="n" innerRadius={42} outerRadius={64} paddingAngle={4} cornerRadius={6} animationDuration={1100}>
                  {m.species.map((_, i) => <Cell key={i} fill={colors[i] ?? ""} stroke="none" />)}
                </Pie><Tooltip {...tip} /></PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm">
              {m.species.map((s, i) => (
                <li key={s.n} className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: colors[i] }} /><span className="w-16">{s.n}</span><b>{s.v}</b></li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card-soft animate-rise p-4">
          <h2 className="mb-2 text-lg font-semibold">Monthly collections</h2>
          <div className="h-36">
            <ResponsiveContainer>
              <BarChart data={m.months} margin={{ left: -24, right: 0 }}>
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis hide /><Tooltip {...tip} cursor={{ fill: "var(--muted)" }} formatter={(v) => inr(Number(v))} />
                <Bar dataKey="paid" radius={[8, 8, 8, 8]} fill="var(--chart-1)" animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
