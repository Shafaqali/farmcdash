import { useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/lib/farm-data";
import { Button } from "@/components/ui/button";

export function PaymentReminders() {
  const { role } = useFarm();
  const [busy, setBusy] = useState(false);
  if (role !== "owner") return null;
  return <div className="mb-4 space-y-2 rounded-lg border bg-card p-3">
    <Button className="h-auto min-h-10 w-full whitespace-normal" variant="outline" disabled={busy} onClick={async () => {
      if (busy) return;
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc("remind_unpaid_customers");
        if (error) throw error;
        toast.success(data ? `In-app reminders sent to ${data} customer account(s).` : "No new reminders: payments are settled, customer logins are not linked, or reminders were already sent today.");
      } catch { toast.error("Could not send reminders. Try again and ensure the farm service is up to date."); }
      finally { setBusy(false); }
    }}><BellRing />{busy ? "Sending reminders…" : "Remind unpaid customers"}</Button>
    <p className="text-xs text-muted-foreground">Send one daily in-app reminder to linked customers with outstanding payments. Customers who have paid or have credit are excluded.</p>
  </div>;
}
