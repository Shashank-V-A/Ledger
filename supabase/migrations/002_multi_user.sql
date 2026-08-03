-- Multi-user personal ledgers (Telegram /start + web password)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL UNIQUE,
  login_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  telegram_username TEXT,
  password_hash TEXT,
  setup_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users (login_id);
CREATE INDEX IF NOT EXISTS idx_users_setup_token ON users (setup_token);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, expense_date DESC);

-- Budgets: one set of limits per user per category
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budgets_category_key'
  ) THEN
    ALTER TABLE budgets DROP CONSTRAINT budgets_category_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budgets_user_category_key'
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_user_category_key UNIQUE (user_id, category);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);

-- Monthly reports: one row per user per month
ALTER TABLE monthly_reports
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_reports_report_month_key'
  ) THEN
    ALTER TABLE monthly_reports DROP CONSTRAINT monthly_reports_report_month_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_reports_user_month_key'
  ) THEN
    ALTER TABLE monthly_reports
      ADD CONSTRAINT monthly_reports_user_month_key UNIQUE (user_id, report_month);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monthly_reports_user_id ON monthly_reports (user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Service role still used by the app; no public policies.
