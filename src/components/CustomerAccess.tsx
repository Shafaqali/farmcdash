import { useState } from "react";
import { UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFarm } from "@/lib/farm-data";
import { createCustomerLogin } from "@/lib/account-login";

export function CustomerAccess({ customerId }: { customerId: string }) {
  const { customers, reload } = useFarm();
  const customer = customers.find(c => c.id === customerId);
  const [open, setOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!customer) return null;
  if (customer.loginUserId) return <p className="text-sm text-primary">Customer login active</p>;
  return <Dialog open={open} onOpenChange={v => { if (!busy) { setOpen(v); setPassword(""); setError(""); } }}>
    <Button variant="outline" onClick={() => setOpen(true)}><UserRound />Create customer login</Button>
    <DialogContent><DialogTitle>Login for {customer.name}</DialogTitle><DialogDescription>Customer account</DialogDescription>
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(""); try { await createCustomerLogin({ customerId, name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address || "", loginId, password }); await reload(); setPassword(""); setOpen(false); } catch(e) { setError(e instanceof Error ? e.message : "Could not create login"); } finally { setBusy(false); } }}>
        <label className="block space-y-2 text-sm">Login ID<Input required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" value={loginId} autoCapitalize="none" onChange={e => setLoginId(e.target.value)} /></label>
        <label className="block space-y-2 text-sm">Password<Input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create login</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
