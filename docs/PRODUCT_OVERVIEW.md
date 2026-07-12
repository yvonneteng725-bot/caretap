# CareTap — Product Overview

_Last updated: 2026-07-12. This document describes the product as currently
built and deployed at https://caretap.vercel.app. It is written to be
self-contained so it can be used as source material for user guides,
onboarding material, or a business plan._

## What CareTap is

CareTap is a care-logging web app (PWA) for families looking after an
elderly relative. Physical NFC cards are placed around the home (on the
medicine cabinet, by the blood pressure monitor, in the kitchen). When the
caregiver finishes a task, they tap the matching card with their phone; the
app opens directly on the right logging screen, saves the entry in one or
two taps, and shows a calm animated confirmation. Family members anywhere
in the world see the log appear in real time and get push alerts when a
reading crosses a clinical threshold.

The design goal: logging a care task should take under 10 seconds and be
doable by a non-technical caregiver, in their own language.

## Who uses it (roles)

- **Elder** — the person being cared for (e.g. grandma). Has a profile with
  name, birth date, and photo. Can also have their own account if able.
- **Admin** — whoever created the elder in the app (usually the family
  organizer). Can edit the elder's details, set medication schedules,
  invite/remove family members, and everything caregivers can do.
- **Caregiver** — logs care tasks day-to-day.
- **Family member** — watches logs, gets alerts, can also log.

Any number of accounts can be linked to the same elder. Linking happens via
**invite links**: an admin generates a link in Settings (or during
onboarding), shares it in the family group chat, and anyone who opens it
within 48 hours — signing up or logging in — is attached to the same
elder's care circle. One link works for multiple people.

## The six care categories (one NFC card each)

| Category | Input | Extras |
|---|---|---|
| 💊 Medications | none — tap = logged | undo, note |
| ❤️ Blood pressure | SYS, DIA (+ optional pulse, optional SpO₂ 血氧) | camera scan of the monitor (AI reads the numbers), alerts |
| 🌡️ Body temperature | °C or °F (stored as °C) | alerts |
| 🩸 Blood sugar | mmol/L or mg/dL + timing (before/after meal, fasting) | alerts |
| 🩹 Wound care | none — tap = logged | photo |
| 🍽️ Meal log | intake amount + hydration | photo, refused-meal alert |

NFC cards are ordinary NTAG stickers programmed (e.g. with the NFC Tools
app) to open `https://caretap.vercel.app/tap/<category>`, where category is
one of: `medications`, `blood-pressure`, `body-temperature`, `blood-sugar`,
`wound-care`, `meal-log`. Tapping works natively on both iPhone (iOS reads
NFC URL tags in the background) and Android (Chrome opens the URL). Users
can also log without cards from the in-app **Log** tab, which shows the six
categories as buttons.

## Clinical alert thresholds

A log triggers an in-app badge and a push notification to every member of
the care circle (in each person's own language) when:

- Systolic > 140 or diastolic > 90 (high BP) · systolic < 90 (low BP)
- SpO₂ < 92% (low blood oxygen)
- Temperature > 37.5°C (fever) or < 36.0°C (low)
- Glucose > 7.0 mmol/L fasting or > 11.1 mmol/L after meal
- Meal refused

## Screens & features

### Login / account
- Email + password sign-in, create account, forgot-password flow with a
  reset-email page. Sessions persist on the device, so an NFC tap goes
  straight to logging, no re-login.
- If a logged-out user taps a card, the destination is remembered and they
  land back on the right logging screen after signing in.

### Onboarding (first login)
Four steps: who are you caring for (name, birth date, photo) → your role →
medication reminder times → invite family (shareable link).

### Tap / logging screen
Category-specific input (or instant save), then an animated confirmation:
the category icon pops in, a checkmark draws itself, and the time/date
appear — with a note field, optional photo, today's count, a prominent
"Back to home" button, and a "Wrong entry? Undo & delete" escape hatch.
Blood pressure additionally offers **"Scan monitor with camera"**: photograph
the BP machine display and AI (Google Gemini) fills in the numbers for the
user to confirm — manual typing always remains available.

### Today tab
Elder header with photo and a per-category count strip for today, a
medication-due banner when a scheduled dose looks missed, and today's log
feed. Every row shows the recorded values; tapping a row expands full
details with **edit** and **delete**.

### History tab
30 days of data. "Last 30 days" shows the full feed with dates and values
(same edit/delete). Per-category sub-tabs show: line charts for BP (SYS/DIA),
temperature, and blood sugar; a meal chart; and a calendar heatmap (with
day numbers) for medications and wound care.

**Export for doctor** generates a printable report in the user's selected
language, styled like the app: medication-adherence donut, BP and
temperature trendlines with dated axes, a chronological vitals matrix
(SYS/DIA/pulse/SpO₂/temp/glucose/notes), and notable alerts.

### Settings
Profile (name, photo, display language), elder management (admin), 
medication schedule times (admin), family members list with invite link
generation and member removal (admin), push notification toggle, sign out.

## Languages

Full UI, alerts, push notifications, and the doctor report in:
**English**, **繁體中文 (Traditional Chinese)**, **Bahasa Indonesia**.
Language is a per-account preference; the app follows it everywhere.

## Device compatibility

CareTap is a Progressive Web App — no app store install:

- **iPhone**: works in Safari; can be added to the Home Screen
  (Share → Add to Home Screen) for a full-screen app feel. iOS reads NFC
  tags natively (iPhone XS and newer) — a tap shows a banner that opens
  the app.
- **Android**: works in Chrome; Chrome offers "Install app" / Add to Home
  screen. NFC tag taps open the URL directly (NFC must be enabled in
  system settings).
- **Desktop**: works in any modern browser (useful for family members
  checking in from a computer).

Offline: if the phone has no signal when a card is tapped, the entry is
queued on the device and syncs automatically when connectivity returns.

## Technical summary

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS,
  vite-plugin-pwa (service worker, installable), Zustand state,
  react-i18next, Recharts for in-app charts. Hosted on **Vercel**.
- **Backend**: **Supabase** — Postgres with row-level security (care-circle
  membership via an `elder_access` table), email/password auth (PKCE),
  Storage for photos, Realtime for live feed updates, Edge Functions:
  - `send-alert` — push notifications (Web Push/VAPID) on threshold alerts
  - `medication-check` — cron: reminds when scheduled doses look missed
  - `upload-photo` — service-role photo upload fallback
  - `read-bp` — Gemini vision OCR for the BP monitor scan
- **Data model**: `profiles`, `elders`, `elder_access` (role per
  member↔elder link), `logs` (one row per care event, typed columns per
  vital), `medication_schedules`, `invites`, `push_subscriptions`.
- **Security**: every table protected by RLS — users can only read/write
  data for elders they are explicitly linked to; invites expire after 48h;
  photos validated server-side before upload.

## Known limitations / candidate roadmap

- Medication adherence % in the report uses a conservative one-dose-per-day
  baseline rather than the actual configured schedule.
- One medication schedule per elder (no per-drug tracking or dose names).
- Blood-sugar scan (camera OCR) exists only for blood pressure so far.
- No web dashboard specifically for clinicians; the doctor hand-over is the
  printable report.
- Free-tier Gemini quota limits the number of camera scans per day.
- Push notifications on iPhone require the app to be added to the Home
  Screen first (an iOS platform restriction).
- Planned v2 ideas already stubbed in code comments: AI wound-healing
  progression from photo series, AI nutrition analysis from meal photos.
