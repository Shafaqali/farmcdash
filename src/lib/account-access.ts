export type AccountRole = "owner" | "customer";

export function customerRouteAllowed(path: string) {
  return path === "/my-animals" || path === "/scan" || /^\/animals\/(?!new(?:\/|$))[^/]+\/?$/.test(path);
}

export function canManageAnimal(role: AccountRole | null, uid: string | null, registeredBy: string) {
  return role === "owner" && !!uid && uid === registeredBy;
}

export function animalGroup(ownerId: string) {
  return ownerId ? "customer" : "personal";
}

export function scannedAnimalId(text: string) {
  const value = text.trim();
  try { const url = new URL(value); return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "").toUpperCase(); }
  catch { return value.toUpperCase(); }
}