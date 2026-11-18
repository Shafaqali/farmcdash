import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { customerLoginSchema, loginAlias } from "@/lib/login-identity";

export const Route = createFileRoute("/api/public/accounts")({
  server: { handlers: {
    OPTIONS: ({ request }) => new Response(null, { status: 204, headers: responseHeaders(request) }),
    POST: async ({ request }) => {
      const headers = responseHeaders(request);
      const respond = (body: object, status = 200) => Response.json(body, { status, headers });
      const origin = request.headers.get("origin");
      if (origin && !allowedOrigin(request, origin)) return respond({ error: "Request not allowed." }, 403);
      try {
        if (Number(request.headers.get("content-length")) > 8192) return respond({ error: "Request too large." }, 413);
        const text = await request.text();
        if (text.length > 8192) return respond({ error: "Request too large." }, 413);
        const body = JSON.parse(text);
        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!url || !key) return respond({ error: "Login is temporarily unavailable." }, 503);
        const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
        const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); },
        } });
        if (body.action === "login") {
          const data = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) }).parse(body);
          // Alias resolution is privileged and never returned before password verification.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map(n => n.toString(16).padStart(2,"0")).join("");
          const alias = loginAlias(data.identifier);
          const [ipLimit, aliasLimit] = await Promise.all([
            supabaseAdmin.rpc("limit_login_attempt", { _key: await hash(`ip:${request.headers.get("cf-connecting-ip") || "local"}`), _limit: 100 }),
            supabaseAdmin.rpc("limit_login_attempt", { _key: await hash(alias), _limit: 12 }),
          ]);
          if (ipLimit.error || aliasLimit.error || !ipLimit.data || !aliasLimit.data) return respond({ error: "Too many attempts. Try again in 15 minutes." }, 429);
          const { data: found } = await supabaseAdmin.from("login_aliases").select("user_id").eq("alias", alias).maybeSingle();
          const user = found ? await supabaseAdmin.auth.admin.getUserById(found.user_id) : null;
          // Unknown identifiers still perform password verification to avoid an email lookup oracle.
          const result = await client.auth.signInWithPassword({ email: user?.data.user?.email || "missing@customer.farm.local", password: data.password });
          if (!found || result.error || !result.data.session) return respond({ error: "Incorrect login or password." }, 401);
          return respond({ session: { access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token } });
        }
        if (body.action !== "create") return respond({ error: "Invalid request." }, 400);
        if (!token) return respond({ error: "Sign in first." }, 401);
        const { data: verified, error: authError } = await client.auth.getUser(token);
        if (authError || !verified.user) return respond({ error: "Sign in again." }, 401);
        const { data: owner } = await client.rpc("is_farm_owner");
        if (!owner) return respond({ error: "Only farm owners can create customer logins." }, 403);
        const data = customerLoginSchema.parse(body);
        if (data.customerId) {
          const { data: customer } = await client.from("customers").select("id,login_user_id").eq("id", data.customerId).eq("user_id", verified.user.id).maybeSingle();
          if (!customer || customer.login_user_id) return respond({ error: "Customer unavailable or already has a login." }, 409);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const aliases = [loginAlias(data.loginId), loginAlias(data.phone), loginAlias(data.email)];
        const { data: used, error: lookupError } = await supabaseAdmin.from("login_aliases").select("alias").in("alias", aliases);
        if (lookupError) throw lookupError;
        if (used?.length) return respond({ error: "This login ID, phone or email is already used. Choose different details." }, 409);
        // A stable internal credential address allows immediate owner-provisioned password login,
        // while editable contact aliases never change role or expose an authentication address.
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({ email: `${crypto.randomUUID()}@customer.farm.local`, password: data.password, email_confirm: true, user_metadata: { full_name: data.name, account_type: "customer" } });
        if (createError || !created.user) return respond({ error: createError?.message || "Could not create login." }, 400);
        const result = await supabaseAdmin.rpc("provision_customer_login", { _owner: verified.user.id, _viewer: created.user.id, ...(data.customerId ? { _customer: data.customerId } : {}), _name: data.name, _phone: data.phone, _email: data.email, _address: data.address, _login: data.loginId });
        if (result.error) { await supabaseAdmin.auth.admin.deleteUser(created.user.id); return respond({ error: "Could not save customer. Check whether these login details are already used." }, 409); }
        return respond({ customerId: result.data, loginId: data.loginId });
      } catch (error) {
        if (error instanceof z.ZodError) return respond({ error: error.issues[0]?.message || "Enter valid details." }, 400);
        return respond({ error: "Unable to complete this request. Please try again." }, 500);
      }
    },
  } },
});
function allowedOrigin(request: Request, origin: string) {
  return origin === new URL(request.url).origin || origin === "https://farmcdash.lovable.app" || origin === "http://localhost" || origin === "https://localhost" || origin === "capacitor://localhost";
}
function responseHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return { "Access-Control-Allow-Origin": origin && allowedOrigin(request, origin) ? origin : new URL(request.url).origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Vary": "Origin", "Cache-Control": "no-store" };
}