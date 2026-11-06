import { useState } from "react";
import { UserRound, Copy, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_URL } from "@/lib/native";
import { useFarm } from "@/lib/farm-data";
import { customerInvitationUrl } from "@/lib/customer-portal";

export function CustomerAccess({ customerId }: { customerId: string }) {
  const { animals, customers, uid } = useFarm();
  const assigned = animals.filter((animal) => animal.userId === uid && animal.ownerId === customerId);
  const customer = customers.find((item) => item.id === customerId);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const invitation = code ? customerInvitationUrl(PUBLIC_URL, code, email) : "";
  const share = async () => {
    const text = `FarmCare: ${customer?.name ?? "Your"} animal account. Sign in or sign up with ${email.trim()}, then confirm Connect my animals. This invitation expires in 7 days.`;
    try {
      if (navigator.share) await navigator.share({ title: "FarmCare customer invitation", text, url: invitation });
      else { await navigator.clipboard.writeText(`${text}\n${invitation}`); setMessage("Invitation copied. Send it to your customer."); }
    } catch { setMessage("Unable to share. Use Copy invitation or copy the link below."); }
  };
  const run = async (revoke = false) => {
    setBusy(true); setMessage(""); setCode("");
    try {
      if (revoke) { const r = await supabase.rpc("revoke_customer_access", { _customer_id: customerId }); if (r.error) throw r.error; setMessage("Customer access removed."); }
      else { const r = await supabase.rpc("invite_customer", { _customer_id: customerId, _email: email }); if (r.error) throw r.error; setCode(r.data); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to update customer access."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); setCode(""); setMessage(""); }}>
    <Button variant="outline" onClick={() => setOpen(true)}><UserRound />Connect customer</Button>
    <DialogContent><DialogTitle>Connect {customer?.name ?? "customer"}</DialogTitle><DialogDescription>Only the invited email can accept. Access expires in 7 days until accepted; connected records are read-only.</DialogDescription>
      <div className="border-y py-3"><p className="text-sm font-semibold">Animals assigned to this customer · {assigned.length}</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{assigned.map((animal) => <li key={animal.id}>{animal.id} · {animal.species}</li>)}</ul>{!assigned.length && <p className="mt-2 text-sm text-muted-foreground">No animals assigned yet. Select this customer in the animal's Owner field first.</p>}</div>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(); }}>
      <label className="text-sm font-medium" htmlFor="customer-access-email">Customer email</label><Input id="customer-access-email" type="email" required disabled={busy} value={email} onChange={(e) => { setEmail(e.target.value); setCode(""); }} />
      <Button type="submit" disabled={busy || !email.trim()}>{busy && <Loader2 className="animate-spin" />}Create connection invitation</Button>
      </form>
      {code && <><Input aria-label="Customer connection code" readOnly value={code} /><Button variant="outline" onClick={() => void share()}><Share2 />Share with customer</Button><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(invitation).then(() => setMessage("Invitation copied.")).catch(() => setMessage("Select and copy the invitation link below.")); }}><Copy />Copy invitation</Button><Input aria-label="Customer invitation link" readOnly value={invitation} /></>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button variant="outline" disabled={busy} onClick={() => void run(true)} className="text-destructive">Revoke all customer access</Button>
    </DialogContent>
  </Dialog>;
}