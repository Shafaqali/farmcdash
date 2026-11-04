import { supabase } from "@/integrations/supabase/client";
import type { Animal, Customer, Payment } from "@/lib/farm-data";

export type PortalData = { animals: Animal[]; customers: Customer[]; payments: Payment[] };
export async function loadCustomerPortal(): Promise<PortalData> {
  const { data, error } = await supabase.rpc("customer_portal");
  if (error) throw error;
  return data as unknown as PortalData;
}