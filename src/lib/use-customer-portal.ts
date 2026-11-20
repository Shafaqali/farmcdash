import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFarm } from "@/lib/farm-data";
import { loadCustomerPortal } from "@/lib/customer-portal";

export function useCustomerPortal() {
  const { uid, role } = useFarm();
  const query = useQuery({
    queryKey: ["customer-portal", uid],
    queryFn: loadCustomerPortal,
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
    return () => { active = false; remove?.(); };
  }, [uid, role, query.refetch]);
  return query;
}
