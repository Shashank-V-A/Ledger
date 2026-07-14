# Expense Automation

Personal expense tracker with a web dashboard, Telegram logging, AI insights, and automated monthly PDF reports.

## Features

- **8 categories** tailored for living at home with parents:
  - Dining Out
  - Ordering In
  - Tea, Coffee & Snacks
  - Investments (tracked separately from spending)
  - Entertainment (includes mobile recharge)
  - Fuel / Transport
  - Clothing & Accessories
  - Miscellaneous
- **Telegram bot** — log expenses in natural language (`120 lunch zomato`, `tea 40`, `fuel 2500`)
- **Inline category corrections** — reclassify or undo right after logging
- **Commands**: `today`, `this week`, `undo`, `help`
- **Web dashboard** — charts, spent vs invested split, expense list with edit/search, month picker
- **Password lock** — optional `DASHBOARD_PASSWORD` for the web UI
- **AI insights** — month-over-month analysis
- **PDF reports** — download from the dashboard, or auto-sent to Telegram on the 1st of each month

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

Set `DASHBOARD_PASSWORD` to lock the web dashboard. Leave it empty for open local access.

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
| `120 lunch zomato` | Log ₹120 under Ordering In |
| `tea 40` | Log ₹40 under Tea, Coffee & Snacks |
| `sip 5000 groww` | Log under Investments |
| `380 mobile recharge` | Log under Entertainment |
| Tap category buttons | Reclassify the just-logged expense |
| `today` | Today's spending summary (spent vs invested) |
| `this week` | Weekly summary |
| `undo` | Delete last entry |
| `help` | Show commands |

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables (including `DASHBOARD_PASSWORD` if you want a lock)
4. Deploy
5. Visit `/api/telegram/setup` to register webhook
6. Vercel Cron runs monthly report on the 1st at 6:00 UTC (configure in `vercel.json`)

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
