import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { customerAccount } from "@/lib/customer-account";
import { anniversary } from "@/lib/care-billing";
import { fmtDate, inr, isoToday, useFarm, type Payment } from "@/lib/farm-data";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function CustomerPayments({ customerId, payment, defaultAnimalId = "" }: { customerId: string; payment?: Payment; defaultAnimalId?: string }) {
  const { animals, payments, addPayment, updatePayment } = useFarm();
  const account = customerAccount(customerId, animals, payments);
  const [open, setOpen] = useState(false);
  const [animalId, setAnimalId] = useState(payment?.animalId ?? defaultAnimalId);
  const [period, setPeriod] = useState(payment?.periodStart ?? "");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [date, setDate] = useState(payment?.date ?? isoToday());
  const [saving, setSaving] = useState(false);
  const entry = account.entries.find((item) => item.animal.id === animalId);
  const options = entry ? [...new Set([...entry.periods.map((item) => item.start), ...Array.from({ length: 12 }, (_, i) => anniversary(entry.animal.arrival, entry.periods.length + i)).filter((start) => !entry.animal.soldDate && entry.animal.status === "Active" && !!start), ...(payment?.animalId === animalId && payment.periodStart ? [payment.periodStart] : [])])].sort() : [];
  return <section aria-label={payment ? "Edit payment" : "Record payment"}>
    <div className="flex items-center justify-between gap-2">{!payment && <h2 className="text-lg font-semibold">Record payment</h2>}<Button variant="ghost" size={payment ? "sm" : "icon"} aria-label={open ? "Close payment form" : payment ? "Edit payment" : "Add payment"} onClick={() => { if (!open && payment) { setAnimalId(payment.animalId ?? ""); setPeriod(payment.periodStart ?? ""); setAmount(String(payment.amount)); setDate(payment.date); } setOpen(!open); }}>{open ? <X /> : payment ? <Pencil /> : <Plus />}{payment && "Edit"}</Button></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>{payment ? "Correct payment" : "Record payment"}</DialogTitle><DialogDescription>Choose the animal and exact care period.</DialogDescription><form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      if ((!payment && !animalId) || (animalId && !period) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) { toast.error("Choose animal, care period and a positive amount"); return; }
      setSaving(true);
      try { const values = { customerId, animalId: animalId || null, periodStart: animalId ? period : null, amount: Number(amount), date }; if (payment) await updatePayment({ ...values, id: payment.id }); else await addPayment(values); toast.success(payment ? "Payment corrected" : "Animal payment recorded"); if (!payment) setAmount(""); setOpen(false); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Payment could not be saved"); }
      finally { setSaving(false); }
    }}>
      <label className="block text-sm">Animal<select required={!payment} value={animalId} onChange={(event) => { setAnimalId(event.target.value); setPeriod(""); }} className="mt-1 w-full rounded-lg border bg-background p-2.5"><option value="">{payment ? "Unassigned payment" : "Choose animal"}</option>{account.entries.map((item) => <option key={item.animal.id} value={item.animal.id}>{item.animal.id} · {item.animal.species} · {inr(item.animal.monthlyCharge)}/month</option>)}</select></label>
      <label className="block text-sm">Care period<select required={!!animalId} disabled={!entry} value={period} onChange={(event) => { setPeriod(event.target.value); if (!payment) { const due = entry?.periods.find((item) => item.start === event.target.value)?.remaining ?? entry?.animal.monthlyCharge; setAmount(String(due ?? "")); } }} className="mt-1 w-full rounded-lg border bg-background p-2.5"><option value="">Choose month</option>{options.map((start) => <option key={start} value={start}>{fmtDate(start)}{start > isoToday() ? " · Advance" : entry?.periods.at(-1)?.start === start ? " · Current period" : ""}{entry?.periods.find((item) => item.start === start)?.remaining === 0 ? " · Paid" : ""}</option>)}</select></label>
      {animalId && period && <p className="text-sm text-muted-foreground">Care payment for {fmtDate(period)}{period > isoToday() ? " · Advance payment" : ""}</p>}
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Amount ₹<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full min-w-0 rounded-lg border bg-background p-2.5" /></label><label className="block text-sm">Received on<input required type="date" value={date} max={isoToday()} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full min-w-0 rounded-lg border bg-background p-2.5" /></label></div>
      <Button disabled={saving} type="submit" className="w-full">{saving ? "Saving…" : payment ? "Save correction" : "Save payment"}</Button>
    </form></DialogContent></Dialog>
  </section>;
}