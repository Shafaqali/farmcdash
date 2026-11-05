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
- Signup preserves account names through the existing profile trigger and treats a missing session as pending email confirmation, never as a signed-in account.
- Excel exports use current-account store data, never shared QR records; reuse the shared exporter for account/customer/animal scopes, reject unowned selections and exclude unassigned receipts from animal exports so they cannot settle animal periods. Verify identity before preparation and use a second save action to preserve browser download activation.
- Notification and payment popups use the shared accessible dialog so focus, dismissal, scroll locking and phone bounds stay consistent.
- Customer viewing uses separate read-only portal RPCs and an email-bound, hashed, expiring one-use invitation; owner payment RLS and editing remain unchanged. Never derive customer finance from shared QR records; the customer portal RPC scopes every query to its protected owner/customer access mapping.
- Customer sign-in is a presentation mode on /my-animals, never an authorization role; invitation links carry the one-use code in a fragment, retained only in tab storage until explicitly accepted, so servers never receive codes in URLs.
