import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ChevronRight, PawPrint, Phone, ShieldCheck, UserRound } from "lucide-react";
import { AccountProfileSettings } from "@/components/AccountProfileSettings";
import { FarmDataReset } from "@/components/FarmDataReset";
import { OwnerEmailSettings } from "@/components/OwnerEmailSettings";
import { BackgroundNoticeControls } from "@/components/BackgroundNoticeControls";
import { AnimalPhoto } from "@/components/AnimalPhoto";
import { Button } from "@/components/ui/button";
import { useFarm } from "@/lib/farm-data";
import { useCustomerPortal } from "@/lib/use-customer-portal";
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "My profile & settings — STAR GOATS FARM" }, { name: "description", content: "Your animals, personal details, notification settings and account security." }] }),
  component: SettingsPage,
});
export function SettingsPage() {
  const { userName, role, animals: ownedAnimals } = useFarm();
  const portal = useCustomerPortal();
  const customer = role === "customer";
  const animals = customer ? portal.data?.animals ?? [] : ownedAnimals;
  const loading = customer && !portal.data;
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("") || "SG";
  return <div className="space-y-5">
    <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Your account</p><h1 className="mt-1 text-3xl font-semibold">Profile & settings</h1><p className="mt-2 text-sm text-muted-foreground">A little about you. Everything in one place.</p></div>
    <section className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm"><div className="absolute inset-x-0 top-0 h-1 bg-primary" /><div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] bg-secondary font-display text-2xl font-semibold uppercase text-primary">{initials}</div><div className="min-w-0"><h2 className="break-words text-2xl font-semibold">{userName || "Your profile"}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{customer ? "Connected customer account" : "Farm owner account"}</p></div></div><div className="mt-5 grid grid-cols-3 divide-x border-t pt-4">{[{ label: "Animals", count: animals.length }, { label: "Active", count: animals.filter((a) => a.status === "Active").length }, { label: "Past care", count: animals.filter((a) => a.status !== "Active").length }].map((stat) => <div key={stat.label} className="px-3 first:pl-0"><p className="text-2xl font-semibold tabular-nums text-primary">{loading ? "—" : stat.count}</p><p className="mt-1 text-[10px] text-muted-foreground">{stat.label}</p></div>)}</div>
      {portal.error && customer && <p role="alert" className="mt-4 text-xs text-destructive">Animal counts could not refresh. <button className="underline" onClick={() => void portal.refetch()}>Try again</button></p>}
      {!!animals.length && <div className="mt-5 border-t pt-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Your animals</p><Link to={customer ? "/my-animals" : "/animals"} className="flex items-center gap-1 text-xs font-semibold text-primary">View all<ChevronRight className="h-3.5 w-3.5" /></Link></div><div className="grid grid-cols-4 gap-2">{animals.slice(0, 4).map((animal) => <Link key={animal.id} to="/animals/$id" params={{ id: animal.id }} className="min-w-0 overflow-hidden rounded-xl border"><AnimalPhoto src={animal.photoUrl} animalId={animal.id} zoom={false} className="aspect-square" /><span className="block truncate bg-background px-1.5 py-1.5 text-center text-[9px] font-semibold">{animal.id}</span></Link>)}</div></div>}
    </section>
    <AccountProfileSettings />
    <section className="overflow-hidden rounded-3xl border bg-card"><div className="flex items-center gap-3 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Bell className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">Notifications</h2><p className="mt-0.5 text-xs text-muted-foreground">Care reminders that keep you connected.</p></div></div><div className="border-t p-4">{customer ? <><BackgroundNoticeControls /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Use the bell in the header for health, vaccine, growth and payment updates. Background alerts are available in the Android app.</p></> : <><p className="mb-3 text-sm text-muted-foreground">Check pending payments and upcoming vaccines, or refresh phone reminder permissions.</p><Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => window.dispatchEvent(new Event("open-farm-notifications"))}><Bell className="h-4 w-4" />Open farm notifications</Button></>}</div></section>
    {customer && !!portal.data?.customers.length && <section className="rounded-3xl border bg-card p-5"><h2 className="text-lg font-semibold">Your connected farm</h2><div className="mt-4 space-y-4">{portal.data.customers.map((account) => <div key={account.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0"><p className="flex items-center gap-2 text-sm font-semibold"><PawPrint className="h-4 w-4 text-primary" />{account.farmName || "Connected farm"}</p>{account.address && <p className="break-words text-xs text-muted-foreground">Your address: {account.address}</p>}{account.farmPhone && <Button asChild size="sm" variant="outline" className="rounded-full"><a href={`tel:${account.farmPhone}`}><Phone className="h-3.5 w-3.5" />Call farm owner</a></Button>}</div>)}</div></section>}
    <OwnerEmailSettings />
    <FarmDataReset />
    <p className="flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground"><UserRound className="h-3 w-3" />Your account details are private.</p>
  </div>;
}
