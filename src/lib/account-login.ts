import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, PUBLIC_URL } from "@/lib/native";
import type { CustomerLoginInput } from "./login-identity";

async function accountRequest(body: object, authenticated = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Please sign in again.");
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${isNativeApp() ? PUBLIC_URL : ""}/api/public/accounts`, { method: "POST", headers, body: JSON.stringify(body), credentials: "omit" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to complete this request.");
  return result;
}
export async function signInIdentifier(identifier: string, password: string) {
  const result = await accountRequest({ action: "login", identifier, password });
  const { error } = await supabase.auth.setSession(result.session);
  if (error) throw error;
}
export async function createCustomerLogin(input: CustomerLoginInput): Promise<{ customerId: string; loginId: string }> {
  return accountRequest({ action: "create", ...input }, true);
}