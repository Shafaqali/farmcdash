<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Customer detail pages use only the current user's customers, animals and payments from the farm store, and reuse `chargesFor` for account totals; shared QR animal data must never supply financial details.
- Calendar care periods are computed in `care-billing`; `chargesFor` and account views share these periods to keep balances and alerts consistent. Payments optionally link to an animal and exact period, validated by the database against user and customer ownership; unlinked payments affect only the customer total.
- Scanned-animal billing uses only the owner-scoped farm animals and payments, reuses customer account periods, and reuses the customer payment editor; payment corrections update the original record under owner RLS rather than adding a second receipt.
- Android packages bundle the local SPA via `build:android`; increment the Android version and compare signing certificates on each delivery because Android requires the same certificate for in-place updates.
- Android builds must package the original branding assets at their CDN-relative paths because Capacitor's local origin cannot serve hosted asset routes.
- The shared Brand component displays the official header image with a concise name for login and both account shells; Android icons and favicon derive from the official square app image, preserving its proportions.
- Signup preserves account names through the existing profile trigger and treats a missing session as pending email confirmation, never as a signed-in account.
- Excel exports use current-account store data, never shared QR records; reuse the shared exporter for account/customer/animal scopes, reject unowned selections and exclude unassigned receipts from animal exports so they cannot settle animal periods. Verify identity before preparation and use a second save action to preserve browser download activation.
- Notification and payment popups use the shared accessible dialog so focus, dismissal, scroll locking and phone bounds stay consistent.
- Delete prompts reuse DeleteConfirmation over the shared dialog, with initial cancel focus and a pending state, to prevent accidental repeated deletion on phones.
- Native farm reminders are serialized, cleared for empty data and signed-out/customer sessions, and only farm reminders are removed; failed syncs remain retryable.
- Customer viewing uses read-only portal RPCs and owner-provisioned login accounts linked through customer_access; owner payment RLS remains unchanged. Never derive customer finance from shared QR records.
- Account authorization comes from protected user_roles, never login selection or client storage; new account type is fixed by the signup trigger, and existing record owners retain owner access. Customer shells allow only portal, scan and read-only animal detail views.
- Account credential actions use an authenticated, ownership-checked public HTTP handler for both the website and Capacitor local origin; private normalized aliases never expose email resolution, and passwords remain in Cloud Auth only.
- Append health history through owner-scoped animal_health; database triggers create durable customer notifications for health, weights and vaccines, and customer notification reads recheck the current animal association.
- Shared animal QR reads use a narrow shared_animal RPC, never bulk animal reads or private financial/health columns; linked customer finance continues through customer_portal.
- Animals without a customer association are personal farm animals; preserve their growth/health history and exclude them from customer balances.

- Care start uses the existing arrival date throughout billing and registration, avoiding divergent anniversary schedules.
- Customer portal returns server-computed per-animal period statuses with no receipt amounts or account totals; owner finance stays in the private farm store.
- Animal deletion uses the ownership-checked atomic delete_owned_animal RPC; health/notifications are removed and receipts retained as unassigned.
- Owner phone is saved in the owner profile and shared only through the connected customer portal; customer address/email use additive fields.
- Owner-scoped atomic RPCs delete customers (retain animals as personal) and reset farm data (retain login/categories); reset generations prevent reused QR IDs while restarting animal counters.
- Dashboard outstanding sums nonnegative lifetime customer balances, showing credit separately; date filters affect activity totals, never net another customer's advance against debt.
- Customer Android background polling uses a restricted device capability encrypted with AndroidKeyStore, never Auth refresh tokens or shared QR data. Every server poll rechecks the live Auth session, role and current associations; payment reminders recheck debt. Sign-out/account switching clears only customer background work/notices, with generation checks preventing stale registration or delivery. Owner clicks and worker-generated payment reminders share database-level daily deduplication.
- Customer photos use the role/association-checked customer_animal_photos RPC, intersect paths with current private portal animals, and sign only matching animal folders through Storage RLS. Keep short-lived links, account-keyed portal caches and foreground renewal; never make the photo bucket public or derive customer records from QR reads.
- Monthly photo galleries use animal_growth_photos with Asia/Kolkata calendar months and expiring account-scoped links, so reassignment revokes access.
- Health summaries use observation date then known creation time; legacy NULL timestamps mean unknown same-day order, never fabricated history.
- Storage usage uses owner-checked farm_storage_usage for attributable files and estimated rows only; unknown sizes stay incomplete and quotas are never inferred.
