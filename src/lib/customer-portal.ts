import { supabase } from "@/integrations/supabase/client";
import type { Animal, Customer, Payment } from "@/lib/farm-data";

export type PaymentStatus = { animalId: string; periodStart: string; status: "Paid" | "Payment due" };
export type PortalData = { animals: Animal[]; customers: Customer[]; payments: Payment[]; paymentStatuses?: PaymentStatus[]; photoWarning?: string };
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
  const portal = data as unknown as PortalData;
  if (!portal.animals.length) return portal;
  try {
    const { data: photos, error: photoError } = await supabase.rpc("customer_animal_photos");
    if (photoError) throw photoError;
    const permitted = new Set(portal.animals.map((a) => a.id));
    const paths = (photos ?? []).filter((p) => permitted.has(p.animal_id) && p.photo_path.startsWith(`${p.animal_id}/`));
    if (!paths.length) return portal;
    const { data: signed, error: signingError } = await supabase.storage.from("animal-photos").createSignedUrls(paths.map((p) => p.photo_path), 600);
    if (signingError) throw signingError;
    const urls = new Map((signed ?? []).filter((p) => p.path && p.signedUrl && !p.error).map((p) => [p.path!, p.signedUrl]));
    const byAnimal = new Map(paths.map((p) => [p.animal_id, p.photo_path]));
    return { ...portal, animals: portal.animals.map((a) => ({ ...a, photoPath: byAnimal.get(a.id) ?? null, photoUrl: urls.get(byAnimal.get(a.id) ?? "") ?? null })), ...(urls.size < paths.length ? { photoWarning: "Some photos could not load. Refresh to try again." } : {}) };
  } catch {
    // Animal/status records remain usable if Storage or the photo migration is unavailable.
    return { ...portal, photoWarning: "Animal photos are temporarily unavailable. Refresh to try again." };
  }
}
