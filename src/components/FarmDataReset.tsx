import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteConfirmation } from "./DeleteConfirmation";
import { useFarm } from "@/lib/farm-data";
import { clearPhoneAlerts } from "@/lib/local-alerts";
import { supabase } from "@/integrations/supabase/client";

export function FarmDataReset() {
  const { isAdmin, reload } = useFarm();
  const queries = useQueryClient();
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return <section className="space-y-4 border-t pt-6">
    <h2 className="text-lg font-semibold text-destructive">Reset farm data</h2>
    <p className="text-sm text-muted-foreground">Permanently deletes your animals, customers, payments, health, growth and vaccine records. Customer access is removed. Your login, profile and categories stay; other farms are untouched. Animal numbers restart at 0001 with a new reset prefix. Old QR tags stop working.</p>
    <label className="block space-y-2 text-sm">Type DELETE to reset<Input value={confirmation} autoComplete="off" onChange={e => setConfirmation(e.target.value)} /></label>
    <Button variant="destructive" disabled={confirmation !== "DELETE"} onClick={() => setOpen(true)}><Trash2 />Delete all my farm data</Button>
    <DeleteConfirmation open={open} onOpenChange={setOpen} title="Delete all your farm data?" description="This cannot be undone. Only this owner's farm records will be deleted. Your account and customer login accounts remain, without animal access." onConfirm={async () => {
      await queries.cancelQueries();
      const { error } = await supabase.rpc("reset_owned_farm", { _confirmation: confirmation });
      if (error) throw new Error(error.message);
      queries.clear();
      await clearPhoneAlerts();
      await reload();
      setConfirmation("");
      toast.success("Farm data reset. New animal numbers start at 0001.");
    }} />
  </section>;
}