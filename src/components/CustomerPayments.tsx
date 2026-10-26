import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { customerAccount } from "@/lib/customer-account";
import { anniversary } from "@/lib/care-billing";
import { fmtDate, inr, isoToday, useFarm } from "@/lib/farm-data";

export function CustomerPayments({ customerId }: { customerId: string }) {
  const { animals, payments, addPayment } = useFarm();
  const account = customerAccount(customerId, animals, payments);
  const [open, setOpen] = useState(false);
  const [animalId, setAnimalId] = useState("");
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoToday());
  const [saving, setSaving] = useState(false);
  const entry = account.entries.find((item) => item.animal.id === animalId);
  const options = entry ? [...entry.periods.map((item) => item.start), ...Array.from({ length: 12 }, (_, i) => anniversary(entry.animal.arrival, entry.periods.length + i)).filter((start) => !entry.animal.soldDate && entry.animal.status === "Active" && !!start)] : [];
  return <section aria-labelledby="record-payment">
    <div className="flex items-center justify-between gap-2"><h2 id="record-payment" className="text-lg font-semibold">Record payment</h2><Button variant="ghost" size="icon" aria-label={open ? "Close payment form" : "Add payment"} onClick={() => setOpen(!open)}>{open ? <X /> : <Plus />}</Button></div>
    {open && <form className="mt-3 space-y-3 border-y py-4" onSubmit={async (event) => {
      event.preventDefault();
      if (!animalId || !period || !Number.isFinite(Number(amount)) || Number(amount) <= 0) { toast.error("Choose animal, care period and a positive amount"); return; }
      setSaving(true);
      try { await addPayment({ customerId, animalId, periodStart: period, amount: Number(amount), date }); toast.success("Animal payment recorded"); setAmount(""); setOpen(false); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Payment could not be saved"); }
      finally { setSaving(false); }
    }}>
      <label className="block text-sm">Animal<select required value={animalId} onChange={(event) => { setAnimalId(event.target.value); setPeriod(""); }} className="mt-1 w-full rounded-lg border bg-background p-2.5"><option value="">Choose animal</option>{account.entries.map((item) => <option key={item.animal.id} value={item.animal.id}>{item.animal.id} · {item.animal.species} · {inr(item.animal.monthlyCharge)}/month</option>)}</select></label>
      <label className="block text-sm">Care period<select required disabled={!entry} value={period} onChange={(event) => { setPeriod(event.target.value); const due = entry?.periods.find((item) => item.start === event.target.value)?.remaining ?? entry?.animal.monthlyCharge; setAmount(String(due ?? "")); }} className="mt-1 w-full rounded-lg border bg-background p-2.5"><option value="">Choose month</option>{options.map((start) => <option key={start} value={start}>{fmtDate(start)}{entry?.periods.find((item) => item.start === start)?.remaining === 0 ? " · Paid" : ""}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Amount ₹<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full min-w-0 rounded-lg border bg-background p-2.5" /></label><label className="block text-sm">Received on<input required type="date" value={date} max={isoToday()} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full min-w-0 rounded-lg border bg-background p-2.5" /></label></div>
      <Button disabled={saving} type="submit" className="w-full">{saving ? "Saving…" : "Save payment"}</Button>
    </form>}
  </section>;
}