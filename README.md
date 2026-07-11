# CareTap

A care-logging PWA for elderly family members. Caregivers tap a physical NFC
card at home; the app opens straight to a log screen for that care category,
saves instantly, and shows a calm confirmation screen. Family can watch logs
update in real time from anywhere.

## Stack

React 18 + Vite + TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Realtime, Storage, Edge Functions) · vite-plugin-pwa · React Router v6 ·
Zustand · i18next (EN / 繁體中文 / Bahasa Indonesia) · Recharts · Lucide.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project + VAPID keys
npm run dev
```

Apply the database schema and RLS policies:

```bash
supabase db push        # or run supabase/migrations/001_initial.sql manually
```

Deploy the two Edge Functions (used for push alerts):

```bash
supabase functions deploy send-alert
supabase functions deploy medication-check
```

Schedule `medication-check` to run every 30 minutes from the Supabase
dashboard (Edge Functions → Cron), and set the `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, and `VAPID_EMAIL` function secrets.

### Auth redirect URLs (required)

Password-reset emails send users to `/reset-password`, so Supabase must be
allowed to redirect there. In the Supabase dashboard go to
**Authentication → URL Configuration → Redirect URLs** and add:

```
https://caretap.vercel.app/reset-password
```

(Add your local dev URL too, e.g. `http://localhost:5173/reset-password`,
if you want to test the reset flow locally.)

### Storage buckets & policies (photo uploads)

Log photos and avatars need the `log-photos` and `avatars` buckets plus
their RLS policies (created in `001_initial.sql`). On some hosted Supabase
projects, `supabase db push` cannot create policies on `storage.objects`
("must be owner of table objects"). If photo uploads fail with a
row-level-security error (the app now shows the exact message under the
photo button), recreate the four storage policies from the bottom of
`supabase/migrations/001_initial.sql` via **Dashboard → Storage →
Policies**, and confirm both buckets exist and are public.

## NFC cards

Program each physical card (via the NFC Tools app) with one of:

```
/tap/medications
/tap/blood-pressure
/tap/body-temperature
/tap/blood-sugar
/tap/wound-care
/tap/meal-log
```

## Project structure

```
src/
  components/   shared UI (icons, charts, confirmation screen, ...)
  hooks/        data-fetching hooks (logs, elders, realtime)
  i18n/         translations (en, zh-TW, id)
  lib/          Supabase client, offline queue, photo compression, alerts
  pages/        routed screens, including the /tap/:cardType handler
  store/        Zustand stores (auth, elder selection)
supabase/
  migrations/   schema + RLS + storage policies
  functions/    medication-check, send-alert Edge Functions
```
