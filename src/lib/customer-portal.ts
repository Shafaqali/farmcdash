import { supabase } from "@/integrations/supabase/client";
import type { Animal, Customer, Payment } from "@/lib/farm-data";

export type PortalData = { animals: Animal[]; customers: Customer[]; payments: Payment[] };
const invitationKey = "farmcare-customer-invitation";

export function customerInvitationUrl(base: string, code: string, email: string) {
  const url = new URL("/my-animals", base);
  url.hash = new URLSearchParams({ code, email: email.trim() }).toString();
  return url.toString();
}

/** Call after hydration only. The fragment is never sent to the server. */
export function pendingCustomerInvitation(): { code: string; email: string } | null {
  try {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get("code");
    if (code && /^[a-f0-9]{64}$/.test(code)) {
      const invitation = { code, email: params.get("email") ?? "" };
      window.sessionStorage.setItem(invitationKey, JSON.stringify(invitation));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return invitation;
    }
    const stored = window.sessionStorage.getItem(invitationKey);
    if (!stored) return null;
    const value = JSON.parse(stored);
    return typeof value.code === "string" && typeof value.email === "string" ? value : null;
  } catch { return null; }
}

export function clearCustomerInvitation() {
  try { window.sessionStorage.removeItem(invitationKey); } catch { /* Storage may be disabled. */ }
}

export async function connectCustomer(code: string) {
  const { error } = await supabase.rpc("connect_customer", { _code: code.trim() });
  if (error) throw new Error("This code is expired, already used, or belongs to a different email. Sign in with the invited email or ask your farm for a new invitation.");
  clearCustomerInvitation();
}
export async function loadCustomerPortal(): Promise<PortalData> {
  const { data, error } = await supabase.rpc("customer_portal");
  if (error) throw error;
  return data as unknown as PortalData;
}