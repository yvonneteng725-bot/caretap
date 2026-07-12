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

Deploy the Edge Functions (push alerts, photo-upload fallback, BP scan):

```bash
supabase functions deploy send-alert
supabase functions deploy medication-check
supabase functions deploy upload-photo
supabase functions deploy read-bp
```

`upload-photo` matters even if you skip push notifications: it is the
fallback path for saving log photos and profile pictures when the storage
RLS policies couldn't be created by migrations (see "Storage buckets &
policies" below).

`read-bp` powers "scan the blood pressure monitor with the camera" — it
sends the photo to Google Gemini to extract SYS/DIA/pulse/SpO₂ and
prefills the input fields (the user always confirms before saving). It
needs a Gemini API key (free tier available at
https://aistudio.google.com/apikey):

```bash
supabase secrets set GEMINI_API_KEY=your-key-here
```

Without the key the scan button shows a clear error and manual entry
keeps working.

Free-tier Gemini keys have small per-model quotas, and some models have no
free quota at all. `read-bp` therefore starts with the cheapest lite model
and automatically falls through `gemini-2.0-flash-lite` →
`gemini-2.5-flash-lite` → `gemini-2.0-flash` on quota/availability errors.
Images are downscaled to ~900px before upload and each scan is exactly one
request. To pin a specific model:

```bash
supabase secrets set GEMINI_MODEL=gemini-2.0-flash-lite
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
