import { readFile, writeFile } from "node:fs/promises";
const base = await readFile(new URL("../drizzle/migrations/0012_customer_payment_reminders.sql", import.meta.url), "utf8");
const background = await readFile(new URL("../drizzle/migrations/0013_background_customer_notifications.sql", import.meta.url), "utf8");
const sql = `-- Star Goats Farm v18: run on the EXISTING Lovable Cloud database.
-- Includes only the new notification migrations, never earlier farm migrations.
-- Transactional and safe to rerun once fully applied. A partial schema aborts
-- rather than silently assuming success. No Firebase, private keys or data reset.
BEGIN;
DO $install_notifications$
BEGIN
  IF to_regclass('public.customer_notifications') IS NULL THEN
    RAISE EXCEPTION 'Existing farm notification schema is missing. Stop and inspect prior migrations.';
  END IF;
  IF to_regprocedure('public.remind_unpaid_customers()') IS NULL THEN
    EXECUTE $notification_base$${base}$notification_base$;
  ELSIF to_regprocedure('public.customer_has_payment_due(uuid,uuid)') IS NULL
    OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_notifications' AND column_name='kind') THEN
    RAISE EXCEPTION 'Partial v17 notification migration. Stop and inspect schema.';
  END IF;
  IF to_regprocedure('public.register_background_device(uuid,text)') IS NULL THEN
    EXECUTE $notification_background$${background}$notification_background$;
  ELSIF to_regprocedure('public.poll_customer_notifications(uuid,text)') IS NULL
    OR to_regprocedure('public.ack_customer_notifications(uuid,text,uuid[])') IS NULL
    OR to_regprocedure('public.revoke_background_device(uuid,text)') IS NULL
    OR to_regclass('public.customer_payment_one_per_day') IS NULL THEN
    RAISE EXCEPTION 'Partial v18 notification migration. Stop and inspect schema.';
  END IF;
END
$install_notifications$;
COMMIT;
`;
await writeFile(new URL("../APPLY-NOTIFICATIONS-v18.sql", import.meta.url), sql);
const photos = await readFile(new URL("../drizzle/migrations/0014_customer_animal_photos.sql", import.meta.url), "utf8");
const update = sql.replace("-- Star Goats Farm v18:", "-- Star Goats Farm v19:").replace("COMMIT;\n", `DO $install_customer_photos$
BEGIN
  IF to_regprocedure('public.customer_animal_photos()') IS NULL THEN
    EXECUTE $customer_photos$${photos}$customer_photos$;
  END IF;
END
$install_customer_photos$;
COMMIT;
`);
await writeFile(new URL("../APPLY-UPDATE-v19.sql", import.meta.url), update);
console.log("Prepared APPLY-NOTIFICATIONS-v18.sql");
console.log("Prepared APPLY-UPDATE-v19.sql");

const english = await readFile(new URL("../drizzle/migrations/0015_english_notifications.sql", import.meta.url), "utf8");
const englishUpdate = update.replace("-- Star Goats Farm v19:", "-- Star Goats Farm v20:").replace("COMMIT;\n", `${english}\nCOMMIT;\n`);
await writeFile(new URL("../APPLY-UPDATE-v20.sql", import.meta.url), englishUpdate);
console.log("Prepared APPLY-UPDATE-v20.sql");

const growth = await readFile(new URL("../drizzle/migrations/0016_animal_growth_photos.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v21.sql", import.meta.url), englishUpdate.replace("-- Star Goats Farm v20:", "-- Star Goats Farm v21:").replace("COMMIT;\n", () => `${growth}\nCOMMIT;\n`));
console.log("Prepared APPLY-UPDATE-v21.sql");

const healthTimestamp = await readFile(new URL("../drizzle/migrations/0017_health_record_timestamp.sql", import.meta.url), "utf8");
const v21 = await readFile(new URL("../APPLY-UPDATE-v21.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v22.sql", import.meta.url), v21.replace("-- Star Goats Farm v21:", "-- Star Goats Farm v22:").replace("COMMIT;\n", () => `${healthTimestamp}\nCOMMIT;\n`));
console.log("Prepared APPLY-UPDATE-v22.sql");

const usage = await readFile(new URL("../drizzle/migrations/0018_farm_storage_usage.sql", import.meta.url), "utf8");
const v22 = await readFile(new URL("../APPLY-UPDATE-v22.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v23.sql", import.meta.url), v22.replace("-- Star Goats Farm v22:", "-- Star Goats Farm v23:").replace("COMMIT;\n", () => `${usage}\nCOMMIT;\n`));
console.log("Prepared APPLY-UPDATE-v23.sql");

const vaccination = await readFile(new URL("../drizzle/migrations/0019_complete_vaccination_reminder.sql", import.meta.url), "utf8");
const v23 = await readFile(new URL("../APPLY-UPDATE-v23.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v24.sql", import.meta.url), v23.replace("-- Star Goats Farm v23:", "-- Star Goats Farm v24:").replace("COMMIT;\n", () => `${vaccination}\nCOMMIT;\n`));
console.log("Prepared APPLY-UPDATE-v24.sql");

// v25 optimizes client photo loading; backend prerequisites are unchanged.
const v24 = await readFile(new URL("../APPLY-UPDATE-v24.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v25.sql", import.meta.url), v24.replace("-- Star Goats Farm v24:", "-- Star Goats Farm v25:"));
console.log("Prepared APPLY-UPDATE-v25.sql");

// v26 adds camera/gallery selection and resizing UI; backend is unchanged.
const v25 = await readFile(new URL("../APPLY-UPDATE-v25.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v26.sql", import.meta.url), v25.replace("-- Star Goats Farm v25:", "-- Star Goats Farm v26:"));
console.log("Prepared APPLY-UPDATE-v26.sql");

// v27 simplifies Android notification permissions; backend prerequisites are unchanged.
const v26 = await readFile(new URL("../APPLY-UPDATE-v26.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v27.sql", import.meta.url), v26.replace("-- Star Goats Farm v26:", "-- Star Goats Farm v27:"));

// v28 improves notification and summary presentation; backend unchanged.
const v27 = await readFile(new URL("../APPLY-UPDATE-v27.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v28.sql", import.meta.url), v27.replace("-- Star Goats Farm v27:", "-- Star Goats Farm v28:"));

const priority = await readFile(new URL("../drizzle/migrations/0020_priority_background_notices.sql", import.meta.url), "utf8");
const v28 = await readFile(new URL("../APPLY-UPDATE-v28.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v29.sql", import.meta.url), v28.replace("-- Star Goats Farm v28:", "-- Star Goats Farm v29:").replace("COMMIT;", `${priority}\nCOMMIT;`));

// v30 changes client UI, permission status and Android channel defaults only.
const v29 = await readFile(new URL("../APPLY-UPDATE-v29.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v30.sql", import.meta.url), v29.replace("-- Star Goats Farm v29:", "-- Star Goats Farm v30:"));

// v31 fixes the in-page toast banner only; backend unchanged.
const v30 = await readFile(new URL("../APPLY-UPDATE-v30.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v31.sql", import.meta.url), v30.replace("-- Star Goats Farm v30:", "-- Star Goats Farm v31:"));

// v32 changes summary, branding and opening animation; backend unchanged.
const v31 = await readFile(new URL("../APPLY-UPDATE-v31.sql", import.meta.url), "utf8");
await writeFile(new URL("../APPLY-UPDATE-v32.sql", import.meta.url), v31.replace("-- Star Goats Farm v31:", "-- Star Goats Farm v32:"));
