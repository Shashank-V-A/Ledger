# Expense Automation

Personal expense tracker with a multi-user web dashboard, Telegram logging, AI insights, and automated monthly PDF reports.

## How multi-user works

1. Message the Telegram bot with **`/start`**
2. Bot creates **your private ledger**, shows your **Login ID**, and a link to set a website password
3. Log expenses on Telegram (only your data)
4. Open the website → log in with Login ID + password → see **only your** expenses

## Features

- **Per-user ledgers** — Telegram `/start` registers a private account
- **Web password** — each user sets their own password to protect the dashboard
- **9 categories** (Dining Out, Ordering In, Tea & Snacks, Investments, Entertainment and Subscriptions, Gym and Fitness, Fuel/Transport, Clothing, Misc)
- **Telegram bot** — amount → pick category → log
- **Commands**: `today`, `this week`, `undo`, `password`, `help`
- **Web dashboard** — charts, spent vs invested, category breakdowns, PDF download
- **AI insights** — actionable money-management advice
- **Monthly PDF** — one report per user to their Telegram

## Tech Stack

- Next.js 16 (App Router)
- Supabase (PostgreSQL)
- Groq (parsing + insights)
- Telegram Bot API
- Recharts + jsPDF

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/migrations/001_initial.sql` in the SQL Editor
3. Copy your project URL and API keys

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` (see `.env.example` for details).

Set `APP_URL` to your public URL. Optionally set `SESSION_SECRET` to a long random string.

**After deploy / locally**, run the SQL migrations in Supabase (in order):

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_multi_user.sql`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Set up Telegram webhook

For local dev, use [ngrok](https://ngrok.com) to expose port 3000, then:

```bash
# Set APP_URL=https://your-ngrok-url.ngrok.io in .env.local
curl http://localhost:3000/api/telegram/setup
```

Or manually:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.com/api/telegram/webhook","secret_token":"your-secret"}'
```

## Telegram Usage

| Message | Action |
|---------|--------|
| `/start` | Create/open your private ledger + password setup link |
| `200` or `200/- Snack` | Choose category, then log (your ledger only) |
| `password` | Get web password setup/reset link |
| `today` / `this week` | Your summaries only |
| `undo` | Delete your last entry |
| `help` | Commands |

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables (including `SESSION_SECRET`, `APP_URL`)
4. Run **both** SQL migrations in the Supabase SQL editor
5. Deploy
6. Visit `/api/telegram/setup` to register webhook
7. Send `/start` to the bot, set your web password, then log expenses

### Manual monthly report

From the dashboard: use **Download PDF** on Overview.

Or via cron endpoint:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  "https://your-domain.com/api/cron/monthly-report?month=2026-06"
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── expenses/page.tsx     # Expense list (edit / search / delete)
│   ├── login/                # Dashboard password gate
│   ├── budgets/page.tsx      # Budget management (scaffold)
│   └── api/
│       ├── telegram/webhook  # Telegram bot + callback buttons
│       ├── cron/monthly-report
│       ├── report/           # Manual PDF download
│       ├── expenses/
│       ├── budgets/
│       └── insights/
├── components/
├── middleware.ts             # Dashboard auth
└── lib/
    ├── auth.ts
    ├── categories.ts
    ├── expenses.ts
    ├── ai.ts
    ├── telegram.ts
    └── pdf.ts
```

## Categories

**Investments are not counted in "Total spent"** — they appear as a separate "Invested" total on the dashboard, in Telegram summaries, and in PDF reports.
