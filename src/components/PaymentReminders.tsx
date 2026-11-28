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
        const { data, error } = await supabase.rpc("remind_unpaid_customers_now");
        if (error) throw error;
        if (data) toast.success(`New reminders queued for ${data} customer account(s).`);
        else toast.info("No linked customers currently have an outstanding balance. Check customer login links and balances.");
      } catch { toast.error("Could not queue reminders. Check your connection and apply the v35 SQL update through Lovable."); }
      finally { setBusy(false); }
    }}><BellRing />{busy ? "Sending reminders…" : "Remind unpaid customers"}</Button>
    <p className="text-xs text-muted-foreground">Every press queues a new reminder for linked unpaid customers. Paid customers are excluded. Closed-app delivery depends on Android background checks.</p>
  </div>;
}
