# Expense Automation

Personal expense tracker with a web dashboard, Telegram logging, AI insights, and automated monthly PDF reports.

## Features

- **7 categories** tailored for living at home with parents:
  - Ordering / Dining Out
  - Tea, Coffee & Snacks
  - Investments (tracked separately from spending)
  - Entertainment
  - Fuel / Transport
  - Clothing & Accessories
  - Miscellaneous
- **Telegram bot** — log expenses in natural language (`120 lunch zomato`, `tea 40`, `fuel 2500`)
- **Commands**: `today`, `this week`, `undo`, `help`
- **Web dashboard** — charts, monthly totals, expense list, budgets
- **AI insights** — month-over-month analysis and budget alerts
- **Monthly PDF report** — auto-sent to Telegram on the 1st of each month

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
| `120 lunch zomato` | Log ₹120 under Ordering/Dining |
| `tea 40` | Log ₹40 under Tea, Coffee & Snacks |
| `sip 5000 groww` | Log under Investments |
| `today` | Today's spending summary |
| `this week` | Weekly summary |
| `undo` | Delete last entry |
| `help` | Show commands |

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy
5. Visit `/api/telegram/setup` to register webhook
6. Vercel Cron runs monthly report on the 1st at 6:00 UTC (configure in `vercel.json`)

### Manual monthly report

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  "https://your-domain.com/api/cron/monthly-report?month=2026-06"
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── expenses/page.tsx     # Expense list
│   ├── budgets/page.tsx      # Budget management
│   └── api/
│       ├── telegram/webhook  # Telegram bot
│       ├── cron/monthly-report
│       ├── expenses/
│       ├── budgets/
│       └── insights/
├── components/
└── lib/
    ├── categories.ts
    ├── expenses.ts
    ├── ai.ts
    ├── telegram.ts
    └── pdf.ts
```

## Categories

Investments are **not** counted in "Total Spent" — they appear separately so you can see both spending and allocation.
