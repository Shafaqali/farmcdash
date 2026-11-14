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
- Customer viewing uses separate read-only portal RPCs and an email-bound, hashed, expiring one-use invitation; owner payment RLS and editing remain unchanged. Never derive customer finance from shared QR records; the customer portal RPC scopes every query to its protected owner/customer access mapping.
- Account authorization comes from protected user_roles, never login selection or client storage; new account type is fixed by the signup trigger, and existing record owners retain owner access. Customer shells allow only portal, scan and read-only animal detail views.
- Invitation links carry their one-use code in a fragment retained in tab storage until explicitly accepted; customer connection never changes account role.
- Append health history through owner-scoped animal_health; database triggers create durable customer notifications for health, weights and vaccines, and customer notification reads recheck the current animal association.
- Shared animal QR reads use a narrow shared_animal RPC, never bulk animal reads or private financial/health columns; linked customer finance continues through customer_portal.
- Animals without a customer association are personal farm animals; preserve their growth/health history and exclude them from customer balances.
