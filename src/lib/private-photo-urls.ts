import { supabase } from "@/integrations/supabase/client";
const cache = new Map<string, { url: string; expires: number }>();
const pending = new Map<string, Promise<Map<string, string>>>();
let generation = 0;
export function clearPrivatePhotoUrls() { generation++; cache.clear(); pending.clear(); }

/** Call only with paths freshly authorized by the private store or portal RPC. */
export async function privatePhotoUrls(paths: string[], scope?: string): Promise<Map<string, string>> {
  const unique = [...new Set(paths)].filter(Boolean);
  const result = new Map<string, string>();
  const missing: string[] = [];
  const now = Date.now();
  for (const path of unique) {
    const entry = scope ? cache.get(`${scope}:${path}`) : undefined;
    if (entry && entry.expires > now) result.set(path, entry.url);
    else missing.push(path);
  }
  if (!missing.length) return result;
  const requestKey = JSON.stringify([scope ?? "", [...missing].sort()]);
  let work = scope ? pending.get(requestKey) : undefined;
  if (!work) {
    const revision = generation;
    work = (async () => {
      const { data, error } = await supabase.storage.from("animal-photos").createSignedUrls(missing, 600);
      if (error) throw error;
      const signed = new Map<string, string>();
      for (const item of data ?? []) {
        if (!item.path || !item.signedUrl || item.error || !missing.includes(item.path)) continue;
        signed.set(item.path, item.signedUrl);
        if (scope && revision === generation) cache.set(`${scope}:${item.path}`, { url: item.signedUrl, expires: now + 8 * 60_000 });
      }
      while (cache.size > 400) cache.delete(cache.keys().next().value!);
      return signed;
    })();
    if (scope) {
      pending.set(requestKey, work);
      const current = work;
      void work.finally(() => { if (pending.get(requestKey) === current) pending.delete(requestKey); }).catch(() => {});
    }
  }
  for (const [path, url] of await work) result.set(path, url);
  return result;
}
