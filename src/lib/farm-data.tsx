import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Status = "Active" | "Sold" | "Discharged" | "Dead";
export const STATUSES: Status[] = ["Active", "Sold", "Discharged", "Dead"];
export type Category = { id: string; name: string; parentId: string | null; code: string };
export type Vaccination = { id: string; name: string; date: string; nextDue: string | null };
export type Animal = {
  id: string; userId: string; categoryId: string; subcategoryId: string | null;
  species: string; sub: string; breed: string; ownerId: string; status: Status;
  arrival: string; monthlyCharge: number; notes: string;
  photoPath: string | null; photoUrl: string | null;
  vaccineDue: string; soldDate: string | null; soldPrice: number | null;
  weights: { id: string; date: string; kg: number }[];
  vaccinations: Vaccination[];
};
export type Customer = { id: string; name: string; phone: string; village: string };
export type Payment = { id: string; customerId: string; amount: number; date: string };

const DAY = 86400000;

type Data = { animals: Animal[]; allAnimals: Animal[]; customers: Customer[]; payments: Payment[]; categories: Category[] };
type Store = Data & {
  loading: boolean;
  session: Session | null;
  authReady: boolean;
  isAdmin: boolean;
  uid: string | null;
  addCustomer: (c: Omit<Customer, "id">) => Promise<void>;
  userName: string;
  reload: () => Promise<void>;
  addPayment: (p: Omit<Payment, "id">) => Promise<void>;
};
const Ctx = createContext<Store | null>(null);
const empty: Data = { animals: [], allAnimals: [], customers: [], payments: [], categories: [] };

async function fetchAll(uid: string): Promise<Data> {
  const [a, c, p, cat, w, v] = await Promise.all([
    supabase.from("animals").select("*").order("created_at"),
    supabase.from("customers").select("*").eq("user_id", uid).order("name"),
    supabase.from("payments").select("*").eq("user_id", uid).order("date", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase.from("weights").select("*").order("date"),
    supabase.from("vaccinations").select("*").order("date", { ascending: false }),
  ]);
  const err = a.error || c.error || p.error || cat.error || w.error || v.error;
  if (err) throw err;
  const categories: Category[] = (cat.data ?? []).map((x) => ({ id: x.id, name: x.name, parentId: x.parent_id, code: x.code }));
  const catName = (id: string | null) => categories.find((x) => x.id === id)?.name ?? "";
  const paths = (a.data ?? []).map((x) => x.photo_url).filter((x): x is string => !!x);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("animal-photos").createSignedUrls(paths, 3600);
    data?.forEach((d) => { if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl); });
  }
  const animals: Animal[] = (a.data ?? []).map((x) => ({
    id: x.id, userId: x.user_id, categoryId: x.category_id, subcategoryId: x.subcategory_id,
    species: catName(x.category_id), sub: catName(x.subcategory_id), breed: x.breed,
    ownerId: x.owner_id ?? "", status: x.status as Status, arrival: x.arrival,
    monthlyCharge: Number(x.monthly_charge), notes: x.notes,
    photoPath: x.photo_url, photoUrl: x.photo_url ? urls.get(x.photo_url) ?? null : null,
    vaccineDue: x.vaccine_due ?? "", soldDate: x.sold_date, soldPrice: x.sold_price == null ? null : Number(x.sold_price),
    weights: (w.data ?? []).filter((y) => y.animal_id === x.id).map((y) => ({ id: y.id, date: y.date, kg: Number(y.kg) })),
    vaccinations: (v.data ?? []).filter((y) => y.animal_id === x.id).map((y) => ({ id: y.id, name: y.name, date: y.date, nextDue: y.next_due })),
  }));
  return {
    animals: animals.filter((x) => x.userId === uid), allAnimals: animals, categories,
    customers: (c.data ?? []).map((x) => ({ id: x.id, name: x.name, phone: x.phone, village: x.village })),
    payments: (p.data ?? []).map((x) => ({ id: x.id, customerId: x.customer_id, amount: Number(x.amount), date: x.date })),
  };
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthReady(true); });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      setData(await fetchAll(uid));
      setIsAdmin(true);
    } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { if (uid) void reload(); else { setData(empty); setIsAdmin(false); } }, [uid, reload]);

  const addPayment: Store["addPayment"] = async (p) => {
    const { error } = await supabase.from("payments").insert({ customer_id: p.customerId, amount: p.amount, date: p.date });
    if (error) throw error;
    await reload();
  };
  const addCustomer: Store["addCustomer"] = async (c) => {
    const { error } = await supabase.from("customers").insert({ name: c.name, phone: c.phone, village: c.village });
    if (error) throw error;
    await reload();
  };
  const meta = session?.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const userName = meta?.full_name || meta?.name || session?.user.email?.split("@")[0] || "";
  return <Ctx.Provider value={{ ...data, loading, session, authReady, isAdmin, uid: uid ?? null, addCustomer, userName, reload, addPayment }}>{children}</Ctx.Provider>;
}
export const useFarm = () => { const c = useContext(Ctx); if (!c) throw new Error("FarmProvider missing"); return c; };

/** Upload a photo for an animal; returns the storage path. */
export async function uploadAnimalPhoto(animalId: string, file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${animalId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("animal-photos").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export const TODAY = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
export const DAY_MS = DAY;
export const isoToday = () => new Date().toISOString().slice(0, 10);
export const inr = (v: number) => { const n = String(Math.abs(Math.round(v))); const last = n.slice(-3), rest = n.slice(0, -3); return (v < 0 ? "-₹" : "₹") + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last; };
/** Charges accrued: monthly charge × months in care (min 1), from arrival up to today (or sold date). */
export function chargesFor(a: Pick<Animal, "arrival" | "monthlyCharge"> & { soldDate?: string | null }, from = 0, to = TODAY) {
  const end = a.soldDate ? Math.min(to, Date.parse(a.soldDate)) : to;
  const start = Math.max(Date.parse(a.arrival), from);
  if (start > end) return 0;
  return Math.max(1, Math.round((end - start) / (30 * DAY))) * a.monthlyCharge;
}

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WD = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const fmtDate = (d: string | number) => { if (d === "" ) return "—"; const x = new Date(d); if (isNaN(x.getTime())) return "—"; return `${x.getUTCDate()} ${MON[x.getUTCMonth()] ?? ""} ${x.getUTCFullYear()}`; };
export const fmtLong = (d: number) => { const x = new Date(d); return `${WD[x.getUTCDay()] ?? ""}, ${x.getUTCDate()} ${MON[x.getUTCMonth()] ?? ""}`; };
export const monShort = (d: string | number) => MON[new Date(d).getUTCMonth()] ?? "";
