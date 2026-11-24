import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFarm } from "@/lib/farm-data";
import { loadCustomerPortal } from "@/lib/customer-portal";

export function useCustomerPortal() {
  const { uid, role } = useFarm();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["customer-portal", uid],
    queryFn: () => loadCustomerPortal(uid ?? undefined),
    enabled: !!uid && role === "customer",
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: "always",
  });
  useEffect(() => {
    if (!uid || role !== "customer") return;
    let active = true;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", (state) => {
      if (active && state.isActive) void query.refetch();
    })).then((handle) => { if (active) remove = () => void handle.remove(); else void handle.remove(); }).catch(() => {});
    return () => { active = false; remove?.(); client.removeQueries({ queryKey: ["customer-portal", uid], exact: true }); };
  }, [uid, role, query.refetch, client]);
  return query;
}
