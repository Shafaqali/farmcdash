import { useState } from "react";
import { UserRound, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_URL } from "@/lib/native";

export function CustomerAccess({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (revoke = false) => {
    setBusy(true); setMessage(""); setCode("");
    try {
      if (revoke) { const r = await supabase.rpc("revoke_customer_access", { _customer_id: customerId }); if (r.error) throw r.error; setMessage("Customer access removed."); }
      else { const r = await supabase.rpc("invite_customer", { _customer_id: customerId, _email: email }); if (r.error) throw r.error; setCode(r.data); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to update customer access."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); setCode(""); setMessage(""); }}>
    <Button variant="outline" onClick={() => setOpen(true)}><UserRound />Customer access</Button>
    <DialogContent><DialogTitle>Customer login access</DialogTitle><DialogDescription>Only this email account can use the one-time code. It expires in 7 days. Animal, vaccine and payment records are read-only.</DialogDescription>
      <label className="text-sm font-medium" htmlFor="customer-access-email">Customer email</label><Input id="customer-access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {code && <><p className="text-sm">Send the code and website address to your customer.</p><Input aria-label="Customer connection code" readOnly value={code} /><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(`${PUBLIC_URL}/my-animals\nConnection code: ${code}`).then(() => setMessage("Copied.")).catch(() => setMessage("Select and copy the code above.")); }}><Copy />Copy invitation</Button><a href={`${PUBLIC_URL}/my-animals`} className="break-all text-sm text-primary">{PUBLIC_URL}/my-animals</a></>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button disabled={busy || !email} onClick={() => void run()}>{busy && <Loader2 className="animate-spin" />}Create new code</Button>
      <Button variant="outline" disabled={busy} onClick={() => void run(true)} className="text-destructive">Revoke all customer access</Button>
    </DialogContent>
  </Dialog>;
}