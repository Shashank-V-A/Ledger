import { parseAmountAndDescription } from "@/lib/ai";
import {
  CATEGORY_LIST,
  formatCurrency,
  getCategoryLabel,
  isInvestmentCategory,
  isValidCategory,
  type CategoryId,
} from "@/lib/categories";
import {
  createExpense,
  deleteLastExpense,
  getExpensesForDateRange,
} from "@/lib/expenses";
import {
  answerCallbackQuery,
  editTelegramMessage,
  isAllowedUser,
  sendTelegramMessage,
  type InlineKeyboard,
} from "@/lib/telegram";
import {
  getAppUrl,
  getUserByTelegramId,
  refreshSetupToken,
  upsertUserFromTelegram,
  type LedgerUser,
} from "@/lib/users";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; username?: string };
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
  };
}

type PendingExpense = {
  amount: number;
  description: string;
  ledgerUserId: string;
  createdAt: number;
};

const PENDING_TTL_MS = 15 * 60 * 1000;
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

const pendingByUser =
  (globalThis as unknown as { __ledgerPending?: Map<number, PendingExpense> })
    .__ledgerPending ?? new Map<number, PendingExpense>();

(
  globalThis as unknown as { __ledgerPending?: Map<number, PendingExpense> }
).__ledgerPending = pendingByUser;

const userCacheByTelegram =
  (
    globalThis as unknown as {
      __ledgerUserCache?: Map<number, { user: LedgerUser; at: number }>;
    }
  ).__ledgerUserCache ?? new Map<number, { user: LedgerUser; at: number }>();

(
  globalThis as unknown as {
    __ledgerUserCache?: Map<number, { user: LedgerUser; at: number }>;
  }
).__ledgerUserCache = userCacheByTelegram;

function cacheLedgerUser(telegramUserId: number, user: LedgerUser) {
  userCacheByTelegram.set(telegramUserId, { user, at: Date.now() });
}

function getCachedLedgerUser(telegramUserId: number): LedgerUser | null {
  const hit = userCacheByTelegram.get(telegramUserId);
  if (!hit) return null;
  if (Date.now() - hit.at > USER_CACHE_TTL_MS) {
    userCacheByTelegram.delete(telegramUserId);
    return null;
  }
  return hit.user;
}

function setPending(
  telegramUserId: number,
  pending: Omit<PendingExpense, "createdAt">
) {
  pendingByUser.set(telegramUserId, { ...pending, createdAt: Date.now() });
}

function getPending(telegramUserId: number): PendingExpense | null {
  const pending = pendingByUser.get(telegramUserId);
  if (!pending) return null;
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    pendingByUser.delete(telegramUserId);
    return null;
  }
  return pending;
}

function clearPending(telegramUserId: number) {
  pendingByUser.delete(telegramUserId);
}

function summarizeRange(
  expenses: Awaited<ReturnType<typeof getExpensesForDateRange>>,
  label: string
) {
  if (!expenses.length) return `No expenses for ${label}.`;

  let spent = 0;
  let invested = 0;
  const byCat = new Map<string, number>();

  for (const e of expenses) {
    const amt = Number(e.amount);
    if (isInvestmentCategory(e.category)) {
      invested += amt;
    } else {
      spent += amt;
    }
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + amt);
  }

  const lines = [
    `📊 ${label}`,
    `Spent: ${formatCurrency(spent)}`,
    ...(invested > 0 ? [`Invested: ${formatCurrency(invested)}`] : []),
    "",
    ...Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• ${getCategoryLabel(cat)}: ${formatCurrency(amt)}`),
  ];
  return lines.join("\n");
}

/** Built once — category list does not change at runtime. */
const CATEGORY_KEYBOARD: InlineKeyboard = {
  inline_keyboard: [
    ...CATEGORY_LIST.map((c) => [{ text: c.label, callback_data: `pick:${c.id}` }]),
    [{ text: "✕ Cancel", callback_data: "cancel" }],
  ],
};

function categoryPickKeyboard(): InlineKeyboard {
  return CATEGORY_KEYBOARD;
}

function chooseCategoryMessage(amount: number, description: string) {
  return `💰 ${formatCurrency(amount)}${description !== "Expense" ? `\n📝 ${description}` : ""}\n\nPick a category:`;
}

function loggedMessage(
  amount: number,
  category: CategoryId,
  description: string,
  date: string
) {
  return `✅ Logged ${formatCurrency(amount)} under ${getCategoryLabel(category)}\n📝 ${description}\n📅 ${date}`;
}

const HELP_TEXT = `💰 Ledger Bot

Type an amount (optional note), then pick a category:
• 200
• 200/- Snack
• fuel 2500

Commands:
• today — your spending today
• this week — your week so far
• undo — remove your last entry
• password — get link to set/change web password
• help — this message

Web dashboard needs your Login ID + password (from /start).`;

/**
 * Fast path for logging: read-only lookup. Only creates a user if missing
 * (first message without /start). Avoids a DB write on every expense.
 */
async function resolveLedgerUser(from: {
  id: number;
  first_name?: string;
  username?: string;
}): Promise<LedgerUser | null> {
  if (!isAllowedUser(from.id)) return null;

  const cached = getCachedLedgerUser(from.id);
  if (cached) return cached;

  const existing = await getUserByTelegramId(from.id);
  if (existing) {
    cacheLedgerUser(from.id, existing);
    return existing;
  }

  const { user } = await upsertUserFromTelegram({
    telegramUserId: from.id,
    firstName: from.first_name,
    username: from.username,
  });
  cacheLedgerUser(from.id, user);
  return user;
}

async function ensureLedgerUserOrReject(
  chatId: number,
  from: { id: number; first_name?: string; username?: string }
): Promise<LedgerUser | null> {
  if (!isAllowedUser(from.id)) {
    await sendTelegramMessage(
      chatId,
      `⛔ Unauthorized. Your Telegram user ID is ${from.id}. Ask the admin to add it to TELEGRAM_ALLOWED_USER_IDS (or leave that list empty to allow anyone).`
    );
    return null;
  }
  return resolveLedgerUser(from);
}

function startMessage(user: LedgerUser, isNew: boolean): string {
  const appUrl = getAppUrl();
  const setupUrl = user.setup_token
    ? `${appUrl}/setup?token=${user.setup_token}`
    : null;

  const lines = [
    isNew
      ? `✅ Welcome ${user.display_name || "there"}! Your personal ledger is ready.`
      : `👋 Welcome back, ${user.display_name || user.login_id}.`,
    "",
    `🔑 Login ID: ${user.login_id}`,
    `🌐 Dashboard: ${appUrl}/login`,
  ];

  if (setupUrl) {
    lines.push(
      "",
      user.password_hash
        ? `Reset password: ${setupUrl}`
        : `Set a web password (keeps your ledger private):\n${setupUrl}`
    );
  } else {
    lines.push(
      "",
      "Web password already set. Send password to get a reset link."
    );
  }

  lines.push("", "Start logging: try “200 tea” or type help");
  return lines.join("\n");
}

async function handleCallbackQuery(
  callback: NonNullable<TelegramUpdate["callback_query"]>
): Promise<void> {
  const telegramUserId = callback.from.id;
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  if (!chatId || !messageId) {
    await answerCallbackQuery(callback.id, "Expired action");
    return;
  }

  if (!isAllowedUser(telegramUserId)) {
    await answerCallbackQuery(callback.id, "Unauthorized");
    return;
  }

  // Cancel: respond immediately — no DB needed
  if (data === "cancel") {
    clearPending(telegramUserId);
    await Promise.all([
      answerCallbackQuery(callback.id, "Cancelled"),
      editTelegramMessage(chatId, messageId, "✕ Cancelled — nothing logged"),
    ]);
    return;
  }

  if (data.startsWith("pick:")) {
    const category = data.slice(5);
    if (!isValidCategory(category)) {
      await answerCallbackQuery(callback.id, "Invalid category");
      return;
    }

    // Pending lives in memory — validate before touching the DB
    const pending = getPending(telegramUserId);
    if (!pending) {
      await Promise.all([
        answerCallbackQuery(callback.id, "Expired — send amount again"),
        editTelegramMessage(
          chatId,
          messageId,
          "⏱ Session expired. Send the amount again to log."
        ),
      ]);
      return;
    }

    // Ack the tap immediately so Telegram stops the loading spinner,
    // then write the expense and update the message.
    const expenseDate = format(new Date(), "yyyy-MM-dd");
    await answerCallbackQuery(
      callback.id,
      `Logged under ${getCategoryLabel(category)}`
    );

    clearPending(telegramUserId);

    try {
      const expense = await createExpense({
        amount: pending.amount,
        category,
        description: pending.description,
        expense_date: expenseDate,
        source: "telegram",
        telegram_user_id: telegramUserId,
        userId: pending.ledgerUserId,
      });

      await editTelegramMessage(
        chatId,
        messageId,
        loggedMessage(
          pending.amount,
          category,
          pending.description,
          expense.expense_date
        )
      );
    } catch (err) {
      // Put pending back so they can tap again if the write failed
      setPending(telegramUserId, {
        amount: pending.amount,
        description: pending.description,
        ledgerUserId: pending.ledgerUserId,
      });
      console.error("Telegram log expense failed:", err);
      await editTelegramMessage(
        chatId,
        messageId,
        chooseCategoryMessage(pending.amount, pending.description),
        { reply_markup: categoryPickKeyboard() }
      );
      throw err;
    }
    return;
  }

  await answerCallbackQuery(callback.id);
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.text || !message.from) return;

  const chatId = message.chat.id;
  const telegramUserId = message.from.id;
  const text = message.text.trim();
  const lower = text.toLowerCase();

  // /start always upserts so new users can join
  if (lower === "/start" || lower.startsWith("/start ")) {
    if (!isAllowedUser(telegramUserId)) {
      await sendTelegramMessage(
        chatId,
        `⛔ Unauthorized. Your Telegram user ID is ${telegramUserId}.`
      );
      return;
    }
    const { user, created } = await upsertUserFromTelegram({
      telegramUserId,
      firstName: message.from.first_name,
      username: message.from.username,
    });
    cacheLedgerUser(telegramUserId, user);
    // Ensure a setup token if password not set
    if (!user.password_hash && !user.setup_token) {
      await refreshSetupToken(user.id);
      const refreshed = await upsertUserFromTelegram({
        telegramUserId,
        firstName: message.from.first_name,
        username: message.from.username,
      });
      cacheLedgerUser(telegramUserId, refreshed.user);
      await sendTelegramMessage(chatId, startMessage(refreshed.user, created));
      return;
    }
    await sendTelegramMessage(chatId, startMessage(user, created));
    return;
  }

  const ledgerUser = await ensureLedgerUserOrReject(chatId, message.from);
  if (!ledgerUser) return;

  if (lower === "help") {
    await sendTelegramMessage(chatId, HELP_TEXT);
    return;
  }

  if (lower === "/myid" || lower === "myid") {
    await sendTelegramMessage(
      chatId,
      `🆔 Telegram ID: ${telegramUserId}\n🔑 Login ID: ${ledgerUser.login_id}`
    );
    return;
  }

  if (lower === "password" || lower === "/password") {
    const token = await refreshSetupToken(ledgerUser.id);
    const url = `${getAppUrl()}/setup?token=${token}`;
    await sendTelegramMessage(
      chatId,
      `🔐 Set or change your web password:\n${url}\n\nLogin ID: ${ledgerUser.login_id}\nDashboard: ${getAppUrl()}/login`
    );
    return;
  }

  if (lower === "undo" || lower === "delete last") {
    const deleted = await deleteLastExpense(telegramUserId, ledgerUser.id);
    if (!deleted) {
      await sendTelegramMessage(chatId, "Nothing to undo.");
      return;
    }
    await sendTelegramMessage(
      chatId,
      `↩️ Removed: ${formatCurrency(Number(deleted.amount))} — ${getCategoryLabel(deleted.category)} (${deleted.description ?? "no description"})`
    );
    return;
  }

  if (lower === "today") {
    const today = format(new Date(), "yyyy-MM-dd");
    const expenses = await getExpensesForDateRange(today, today, ledgerUser.id);
    await sendTelegramMessage(chatId, summarizeRange(expenses, "Today"));
    return;
  }

  if (lower === "this week") {
    const now = new Date();
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const expenses = await getExpensesForDateRange(start, end, ledgerUser.id);
    await sendTelegramMessage(chatId, summarizeRange(expenses, "This week"));
    return;
  }

  try {
    const draft = parseAmountAndDescription(text);
    if (!draft) {
      await sendTelegramMessage(
        chatId,
        `❌ Could not detect an amount.\n\nTry: "200" or "200/- Snack" or type help`
      );
      return;
    }

    setPending(telegramUserId, {
      amount: draft.amount,
      description: draft.description,
      ledgerUserId: ledgerUser.id,
    });
    await sendTelegramMessage(
      chatId,
      chooseCategoryMessage(draft.amount, draft.description),
      { reply_markup: categoryPickKeyboard() }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not parse expense";
    await sendTelegramMessage(
      chatId,
      `❌ ${msg}\n\nTry: "200" or "200/- Snack" or type help`
    );
  }
}
