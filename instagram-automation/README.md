# Instagram Comment-to-DM Automation

Self-hosted replacement for ManyChat's comment-to-DM flows. Next.js (App
Router, TypeScript) on Vercel's free tier, with a Google Sheet as the
database via a service account. **No paid services anywhere in the stack.**

## How it works

1. Someone comments a trigger keyword on one of your posts.
2. Meta delivers a webhook to `/api/webhook` (signature-verified against
   `META_APP_SECRET`).
3. The rule engine matches the comment against the `Rules` tab
   (post-specific rules beat `ANY` rules; keywords are case-insensitive,
   comma-separated).
4. A public reply is posted under the comment (random pick from the rule's
   pipe-separated variants).
5. A Private Reply (the opening DM) goes to the commenter — only inside
   Meta's 7-day private-reply window.
6. If the rule requires a follow, follow status is checked and the flow
   branches: link now, or a "please follow first" prompt with a quick-reply
   button that re-checks when tapped.
7. Every subscriber's stage (`new` / `awaiting_follow` / `link_sent`) is
   stored in the `Subscribers` tab, so a user replying later resumes where
   they left off.
8. Every action is appended to the `Events` tab with a timestamp.

## Google Sheet layout

Create one spreadsheet with three tabs. **Header names are read
case-insensitively and column order doesn't matter**, but the names must
match the constants in `lib/sheets.ts` (we'll rename these to match your
existing sheet before going live).

### `Rules` tab

| header            | example                                        | notes                                    |
| ----------------- | ---------------------------------------------- | ---------------------------------------- |
| `rule_id`         | `guide-1`                                      | unique, stable ID for the rule           |
| `post_id`         | `17900000000000000` or `ANY`                   | IG media ID, or `ANY` for all posts      |
| `keywords`        | `guide, link, send`                            | comma-separated, case-insensitive        |
| `comment_replies` | `Check your DMs! 📬\|Sent — look at your inbox!` | pipe-separated public reply variants     |
| `dm_message`      | `Hey! Want the guide? Tap below 👇`             | opening DM; leave blank to skip straight to the link |
| `require_follow`  | `TRUE`                                         | `TRUE`/`FALSE`                           |
| `follow_prompt`   | `Follow us first, then tap the button!`        | used when `require_follow` and not following |
| `link_message`    | `Here you go: https://example.com/guide`       | the final DM with the deliverable        |
| `enabled`         | `TRUE`                                         | blank counts as enabled                  |

### `Subscribers` tab (managed by the app — just create the headers)

`ig_user_id`, `username`, `rule_id`, `stage`, `post_id`, `last_comment_id`,
`created_at`, `updated_at`

### `Events` tab (append-only log — just create the headers)

`timestamp`, `event_type`, `status`, `ig_user_id`, `username`, `post_id`,
`comment_id`, `rule_id`, `detail`

## Setup

### 1. Google service account (free)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project (or reuse one) and enable the **Google Sheets API**.
2. IAM & Admin → Service Accounts → **Create service account** (no roles
   needed). Then Keys → **Add key → JSON** and download it.
3. Share your spreadsheet with the service account's `client_email`
   (Editor).
4. The whole JSON file becomes the `GOOGLE_SERVICE_ACCOUNT_KEY` env var —
   paste it as-is, or base64-encode it first (both work):
   `base64 -w0 service-account.json`

### 2. Meta App

1. At [developers.facebook.com](https://developers.facebook.com/) create an
   app (type **Business**).
2. Add the **Messenger** product and the **Webhooks** product.
3. Your Instagram account must be a **professional account** linked to a
   Facebook Page.
4. Generate a **Page access token** with these permissions:
   `instagram_basic`, `instagram_manage_comments`,
   `instagram_manage_messages`, `pages_manage_metadata`. Exchange it for a
   long-lived token (Graph API Explorer or the token debugger makes this
   easy). This is `META_ACCESS_TOKEN`.
5. App settings → Basic → **App Secret** is `META_APP_SECRET`.
6. Find your IDs: `PAGE_ID` from your Facebook Page's About section, and
   `IG_BUSINESS_ACCOUNT_ID` via
   `GET /me/accounts?fields=instagram_business_account` in the Graph API
   Explorer.

### 3. Deploy to Vercel (free tier)

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com/) → **Add New Project** → import the
   repo.
3. **Set "Root Directory" to `instagram-automation/`** (this app lives in a
   subdirectory). Framework preset: Next.js.
4. Add every variable from `.env.example` under Project → Settings →
   Environment Variables. For `VERIFY_TOKEN`, invent any random string
   (e.g. `openssl rand -hex 16`) — you'll enter the same string in the Meta
   dashboard next.
5. Deploy. Your webhook URL is:
   `https://<your-project>.vercel.app/api/webhook`

### 4. Register the webhook with Meta

1. Meta App dashboard → **Webhooks** → choose the **Instagram** object →
   **Subscribe to this object**.
2. Callback URL: `https://<your-project>.vercel.app/api/webhook`
   Verify token: the exact `VERIFY_TOKEN` value you set in Vercel.
3. Click **Verify and save** — Meta sends a GET request; this app echoes
   the challenge when the token matches.
4. Subscribe to the **`comments`** and **`messages`** fields.
5. Also subscribe your Page to the app:
   `POST /{PAGE_ID}/subscribed_apps?subscribed_fields=feed` (Graph API
   Explorer), and make sure "Allow access to messages" is enabled in the
   Instagram app under Settings → Privacy → Messages → Connected tools.

### 5. Test end-to-end

1. Add a rule row with `post_id = ANY`, a keyword, and messages.
2. From a *different* IG account, comment the keyword on any of your posts.
3. Watch the `Events` tab fill in, the public reply appear, and the DM
   arrive.

## Local development

```bash
cd instagram-automation
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Expose your local server to Meta with a free tunnel (e.g.
`cloudflared tunnel --url http://localhost:3000`) and register that URL as
a webhook in a **test app** to iterate safely.

## Notes & limits

- **App Review:** to message users who aren't testers/admins of your Meta
  app, the app needs Advanced Access for `instagram_manage_messages` (a
  one-time free App Review submission with a screen recording).
- **Private replies** can only be sent once per comment, within 7 days of
  the comment. Follow-up messages use the standard 24-hour messaging
  window, which the user's reply/button tap opens.
- **Follow check** uses the `is_user_follow_business` field of the
  messaging user profile. When Meta won't reveal it, the app fails safe and
  shows the follow prompt.
- **Rules caching:** the Rules tab is cached in memory for 60 seconds per
  serverless instance — sheet edits go live within a minute.
- **Sheets scale:** subscriber lookups read the whole tab; fine into the
  thousands of rows. Past that, swap `lib/subscribers.ts` for a real store.
