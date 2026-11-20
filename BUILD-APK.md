# Build the FarmCare Android APK

## Version 1.19 — Customer profile, photos and care UI

Delivered as `Star-Goats-Farm_v19.apk`. Verified version 1.19/code 19, valid signing matching this folder's v18 APK, 59 tests, TypeScript, web/native builds, SPA asset references and all three official logos. Packaged code contains the native background worker and no Firebase SDK or UI-test fixture data.

Version 1.19/code 19 refreshes customer My animals, profile/settings and notifications, plus the owner profile. Customer screens show total/active/past-care animal counts, searchable photo cards, farm contact actions, vaccine dates and server-computed care-period statuses without account totals or receipt amounts. Photos open in the shared accessible dialog with a full, uncropped view; missing/broken photos have a clear fallback. Owner profile includes animal counts/photos and consolidated links to contact, login, email and password settings. The customer notification dialog adds unread/health/payment filters, refresh, read-on-open and bulk mark-read with pending/error handling. Phone background settings remain available in the bell and customer settings. Native background logic is unchanged from v18; no Firebase was added.

**Backend photo activation is pending.** Attach `APPLY-UPDATE-v19.sql` to the existing Lovable project and ask it to apply the SQL to the existing Cloud database without resetting farm data. This file includes guarded notification migrations 0012/0013 plus the new photo migration 0014. Completed features are skipped; earlier farm migrations are not replayed. The current environment has no production database admin connection, so no live migration was executed here. Existing animal/status records remain usable with a photo warning until photo access is available.

`customer_animal_photos` only returns paths for the current protected customer's assigned animals. The client intersects those paths with its private portal animal IDs, rejects another animal's folder, and signs through owner/customer-scoped Storage RLS for ten minutes. It never uses shared QR records or makes the bucket public. Portal views refresh on focus/native foreground and periodically to renew photos. Changing an assignment revokes new reads; already issued signed links remain usable until their short expiry.

Mobile/desktop visual checks used isolated test fixtures at 320, 390 and 1024 pixels, with no real account data. Checked photo zoom, notification filtering/mark-all-read, password visibility, customer finance exclusion and no page overflow/errors. Live profile saves, real customer photos, backend migration and physical-device/background delivery still require verification after activation. Local source changes do not automatically publish the Lovable website; the APK bundles these screens locally.

## Version 1.18 — Background customer alerts without Firebase

Android version 1.18/code 18 adds native WorkManager polling for customer health, growth, vaccination and payment notices. The worker runs without the SPA/WebView staying open and uses a network constraint plus retry/backoff. Android's periodic minimum is 15 minutes; battery restrictions, Doze and lack of internet can delay it further. Force stop prevents background work until the app is opened again. Existing owner vaccine/payment local alarms remain separate. This is not immediate remote push and uses no Firebase.

**Backend activation is required and has not been performed from this environment.** In the existing Lovable project, attach `APPLY-NOTIFICATIONS-v18.sql` and ask Lovable to execute it on its existing Cloud database, without resetting farm data. It includes only migrations 0012 and 0013, applies missing notification features transactionally, skips already-complete features and stops on a partial schema. Do not replay older migrations. The website need not be republished for the native worker's direct Supabase RPC calls, but the database migration must succeed.

After backend activation, install `Star-Goats-Farm_v18.apk`, sign in as the customer, allow Android notifications, and open the notification bell. **Enable / check background alerts** registers the device and shows enabled/permission state plus last-check/retry feedback. Registration is also attempted automatically for a signed-in customer. Allow background battery use in Android app settings. Background alerts require Android 6+; the existing app/local reminders retain their previous minimum SDK. The owner can use **Customers → Remind unpaid customers**. The worker also generates one daily reminder for connected customers whose server-computed lifetime balance is positive; paid/advance accounts are excluded. Owner clicks and background polls share database-level daily deduplication.

The native store holds only a device-specific, restricted notice capability encrypted with AndroidKeyStore in the no-backup directory. It does not store Auth access/refresh tokens, passwords, health details or finance. The capability expires after 30 days unless renewed by opening/enabling the app. Server polls recheck the protected customer role, live Auth session, account ban, current customer/animal associations and payment debt. Phone notifications contain generic update text; details stay inside the authenticated app. Delivered notices are acknowledged per device without marking the in-app notice read. Stable notification tags replace an unacknowledged retry. Sign-out/account changes erase the native credential, cancel customer work and remove only customer notifications; owner farm alarms are unaffected by this cleanup.

Validation: 57 tests and TypeScript checks; isolated PostgreSQL-compatible tests for registration permissions, cross-account isolation, capability/session expiry, banned users, revoked associations, generic payloads, unpaid-only daily reminders, owner/poll deduplication, retry/ack and migration reruns. Android compilation and lint completed with no lint errors. No physical device was connected, so actual background delivery, reboot/OEM battery behavior and the live backend flow remain unverified. APK signature, package/version, bundled worker and three official logos were verified. The certificate matches this folder's v17 APK, allowing an in-place update of that build.

Optional database regression check: run `node scripts/verify-background-notices.mjs` with `@electric-sql/pglite` available, or point `PGLITE_MODULE` to an external installation's `dist/index.js`. This uses an isolated fixture database and never connects to production. Regenerate the combined deployment SQL with `node scripts/prepare-notification-migration.mjs` after changes to the source migrations.

## Version 1.17 — Reminder refresh and unpaid customer alerts

Delivered as `Star-Goats-Farm_v17.apk` (version code 17). Its signing certificate was compared against this folder's `Star-Goats-Farm_v16.apk` and matches, allowing an in-place update of that APK.

Owner local vaccine/payment alarms rebuild after foreground farm-data refresh, even when the data is unchanged. Permission checks remain retryable. The owner's notification dialog includes **Enable / refresh phone reminders**, scheduled-reminder feedback, and a shortcut for Android exact-time permission. Customer in-app notices refresh on foreground/reconnect, retain visible records during temporary errors, and show a toast for newly received updates. Existing database triggers still generate health, weight and vaccination notices.

The owner Customers page adds **Remind unpaid customers**. Before enabling this feature, apply **only** `drizzle/migrations/0012_customer_payment_reminders.sql` through the existing backend's migration/admin workflow after checking its migration state. This migration has **not** been applied to the live backend from this environment. It computes current customer debt on the server using arrival-date calendar anniversaries and all owner-scoped customer receipts; paid/advance accounts are excluded. Only linked customer accounts receive notices, at most once per customer/recipient/day. Read access rechecks the current connection and hides payment reminders after the balance is settled. No receipt amounts or account totals are exposed to customer accounts. Do not blindly reapply older migrations.

This version deliberately does **not** add Firebase or remote push. Owner alarms already scheduled on the phone can fire with the app closed; new customer health/payment events appear in-app on refresh/realtime, not as immediate closed-app system notifications. Android force-stop and phone notification restrictions can prevent local alarms; actual device delivery remains unverified.

Verified: 50 tests, TypeScript check, `build:android`, Gradle compilation, APK signing/package/version, three bundled branding images and local SPA asset references. The migration was exercised in an isolated PostgreSQL-compatible PGlite database for paid/credit exclusion, partial payments, short-month/sold billing, owner isolation, deduplication, customer/anonymous denial, read access and stale-reminder filtering. Live multi-account flows and physical-device alarm delivery still require verification after deployment.

The Android build now prepares the newest generated SPA from `.output/public` or `dist/client` with a cross-platform Node script before Capacitor sync, avoiding Windows `cp` failures and stale-shell packaging.

## Version 1.16 — Simple customer login

Delivered as `Star-Goats-Farm_v16.apk` with the matching `Star-Goats-Farm_v16-source.zip`. Package ID remains `com.farmcare.app`; signing matches v15, so install the APK over v15 and choose Update.

Includes one Welcome login using phone, email or login ID and password. Owners create customer credentials while adding the customer; assigned animals appear automatically. Customers can change their name, contact details, login ID and password in Settings. Existing permissions and farm records remain unchanged.

**Publish the latest website before using this APK's new login.** The Android screens are local, but credential operations call `https://farmcdash.lovable.app/api/public/accounts`. This endpoint was not published when the APK was prepared; it returned 404. This APK does not publish the website. Customer password changes require the current password; no email-reset flow is provided for internally addressed customer accounts.

The source ZIP excludes private signing keys, login sessions, dependencies, generated builds and repository metadata. Copy `.env.example` to `.env` before building; it contains public browser configuration only. Use Lovable Cloud for server-side credentials—never add private keys to browser configuration. The included database migrations are already applied to the existing backend; do not blindly reapply them there.

Verified: Android compilation, APK signature/version, three packaged official logos and new account controls, 44 tests, and the prior separate owner/customer web flow (creation, animal access, permission restrictions, profile persistence and password login via all three identifiers). Physical-device launch, camera, phone calls and background notifications remain unverified.

Screens are bundled locally inside the APK; no published website URL is required. Sign-in and farm data require internet.

1. On a computer with Android Studio (JDK 17 + Android SDK 34):
   ```
   bun install
   bun run build:android
   cd android && ./gradlew assembleDebug
   ```
2. APK: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Copy it to your phone, open it, allow "Install unknown apps".

Use the same signing key for subsequent updates. Version 1.7 (version code 7) adds the goat farm logo as the Android app icon, login screen and header mark plus favicon, the SCHEDULE_EXACT_ALARM permission for on-time alerts, and alert re-sync whenever the app returns to the foreground. Its debug certificate differs from version 1.5 because the previous key was unavailable: uninstall the old app first, then install and sign in again. Cloud records are retained; local sign-in and scheduled alerts are reset. Open the new app and allow notifications to reschedule alerts.

Verified for version 1.7: Android compilation, APK signature, package/version, local assets and latest payment code, plus 13 billing/privacy/routing tests. The prior signed-in web flow verified payment correction and reload. Physical-device launch and background notification delivery have not been tested in this environment.

Camera permission for QR scanning is already in `android/app/src/main/AndroidManifest.xml`.

## Version 1.9

Includes the updated login/sign-up design and original branding images bundled at their local paths so the Android logo does not depend on a hosted asset route. APK delivered as `FarmCare_v9.apk` (version code 9).

Verified Android compilation, APK signing/package/version, both packaged logos, 16 auth/billing/privacy/routing tests, and the locally bundled login screen on a phone-sized browser with no page errors. Physical-device launch, background notification delivery and successful real-account signup/confirmation/login remain unverified.

The signing certificate differs from v8 because its key is unavailable in this sandbox. Uninstall the older app before installing v9. Cloud records remain; sign in again and allow notifications to restore local reminders.

## Version 1.10

Includes current-account Excel download, improved notification/payment dialogs, and updated animal and customer pages. Delivered as `FarmCare_v10.apk`, version code 10.

Verified Android compilation, APK signature/package/version, both bundled original logos, packaged Excel and notification features, 19 focused tests, and phone-sized bundled login with no page errors. Physical Android launch, native Excel save/share and background notification delivery remain unverified.

The certificate differs from v9 because the prior signing key is unavailable. Uninstall the older app before installing v10; cloud records remain. Sign in again and allow notifications to restore reminders.

## Version 1.11

Includes individual owned-animal/customer Excel downloads and vertically centered login with scrolling on shorter screens. Delivered as `FarmCare_v11.apk`, version code 11. Native Google login is not enabled; the existing web option is unchanged.

Verified Android compilation, APK signature/version, original bundled logos and scoped exports, 22 focused tests, and packaged phone login without page errors. Signed-in individual download flow, physical Android launch, native save/share and background alerts remain unverified.

The certificate differs from v10 because the previous private key is unavailable. Uninstall the older app, install v11, sign in and allow notifications; cloud data remains.

## Version 1.12

Includes the refreshed login, larger official header wordmark, explicit customer login/sign-up, owner invitation sharing with assigned-animal summary, and customer animal connection. Delivered as `FarmCare_v12.apk`, version code 12.

Verified Android compilation, APK signature/package/version, both bundled original logos, packaged customer connection features, 28 tests, and packaged phone login/signup rendering. The browser Android simulation lacks a real App bridge; physical-device launch, notification delivery, native sharing, and a separate customer's authenticated QR/payment flow remain unverified. The prior web check verified invitation, connection, assigned animal visibility and reload with the existing session.

The signing certificate differs from v11 because the previous key is unavailable. Uninstall the older app before installing v12, then sign in again and allow notifications. Cloud records remain; local sign-in and reminders reset. Native Google login remains disabled. Customer invitations open the website; customers may also select Customer in the APK and enter their connection code manually.

## Version 1.13

Rebuilt with the latest app. Delivered as `FarmCare_v13.apk`, version code 13. Signing certificate differs from v12; future builds reuse the saved key. Physical-device testing not done.

## Version 1.14 — Star Goats Farm

Delivered as `Star-Goats-Farm_v14.apk`, version 1.14/code 14. Includes the supplied header logo beside the concise Star Goats Farm name, supplied square app icon, favicon and splash images, plus the latest separate customer/owner views, health histories and in-app customer updates.

The signing certificate matches v13 and the package ID remains unchanged, allowing an in-place update from that version. Open the APK on the phone and choose Update; allow installation from the download source if Android asks. Older differently signed versions may require uninstalling first; cloud records remain.

Verified Android compilation, valid signing, version/package/display name, all three packaged logo assets, 35 existing tests, signed-in web header at phone and desktop widths, and local packaged login/signup logo rendering. Physical-device launch, camera scanning, native sharing, notification delivery and Google sign-in remain unverified; no Google login change was made in this branding update.

## Version 1.15 — Caring and health update

Delivered as `Star-Goats-Farm_v15.apk`, version 1.15/code 15. Caring start uses the registration date for monthly care anniversaries. Personal animals have zero care charges. Daily health entries include temperature, illness-start date, medicines, treatment and recovery. Customers see per-animal care-period payment status without balances or receipt amounts. Customer entry includes address, phone and email; owners can save their farm phone in Profile for connected customer calls. Animal deletion removes dependent health/notification records atomically while preserving receipts as unassigned.

Signing matches v14; open the downloaded APK and choose Update. Verified compilation, certificate, package/version, packaged logos, 41 tests, signed-in registration, health persistence, health-linked deletion, customer contact persistence and phone dialog bounds. Separate customer-session end-to-end checks and physical Android launch/calls/notifications remain unverified. Google login unchanged.


## Version 1.20 ? English interface

All app-controlled reminder, notification and settings text is English. Calendar month dropdowns and background-check timestamps use an English locale. APPLY-UPDATE-v20.sql includes the pending notification/photo updates and converts existing system payment messages to English without changing user-entered records. Apply it through Lovable to activate the server changes.

Delivered as Star-Goats-Farm_v20.apk (version code 20). Physical-device notification delivery has not been tested.
