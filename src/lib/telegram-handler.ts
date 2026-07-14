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
import { format, startOfWeek, endOfWeek } from "date-fns";

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
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
  createdAt: number;
};

const PENDING_TTL_MS = 15 * 60 * 1000;

const pendingByUser =
  (globalThis as unknown as { __ledgerPending?: Map<number, PendingExpense> })
    .__ledgerPending ?? new Map<number, PendingExpense>();

(
  globalThis as unknown as { __ledgerPending?: Map<number, PendingExpense> }
).__ledgerPending = pendingByUser;

function setPending(userId: number, pending: Omit<PendingExpense, "createdAt">) {
  pendingByUser.set(userId, { ...pending, createdAt: Date.now() });
}

function getPending(userId: number): PendingExpense | null {
  const pending = pendingByUser.get(userId);
  if (!pending) return null;
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    pendingByUser.delete(userId);
    return null;
  }
  return pending;
}

function clearPending(userId: number) {
  pendingByUser.delete(userId);
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

function categoryPickKeyboard(): InlineKeyboard {
  // One row per category so full website labels fit clearly on mobile
  const rows = CATEGORY_LIST.map((c) => [
    { text: c.label, callback_data: `pick:${c.id}` },
  ]);
  rows.push([{ text: "✕ Cancel", callback_data: "cancel" }]);
  return { inline_keyboard: rows };
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

const HELP_TEXT = `💰 Expense Tracker Bot

Type an amount (optional note), then pick a category:
• 200
• 200/- Snack
• 120 lunch zomato
• fuel 2500

Commands:
• today — today's summary
• this week — weekly summary
• undo — delete last entry
• help — show this message

Categories: Dining Out, Ordering In, Tea & Snacks, Investments, Entertainment, Fuel/Transport, Clothing, Miscellaneous`;

async function handleCallbackQuery(
  callback: NonNullable<TelegramUpdate["callback_query"]>
): Promise<void> {
  const userId = callback.from.id;
  const chatId = callback.message?.chat.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  if (!chatId || !messageId) {
    await answerCallbackQuery(callback.id, "Expired action");
    return;
  }

  if (!isAllowedUser(userId)) {
    await answerCallbackQuery(callback.id, "Unauthorized");
    return;
  }

  if (data === "cancel") {
    clearPending(userId);
    await answerCallbackQuery(callback.id, "Cancelled");
    await editTelegramMessage(chatId, messageId, "✕ Cancelled — nothing logged");
    return;
  }

  if (data.startsWith("pick:")) {
    const category = data.slice(5);
    if (!isValidCategory(category)) {
      await answerCallbackQuery(callback.id, "Invalid category");
      return;
    }

    const pending = getPending(userId);
    if (!pending) {
      await answerCallbackQuery(callback.id, "Expired — send amount again");
      await editTelegramMessage(
        chatId,
        messageId,
        "⏱ Session expired. Send the amount again to log."
      );
      return;
    }

    const expense = await createExpense({
      amount: pending.amount,
      category,
      description: pending.description,
      source: "telegram",
      telegram_user_id: userId,
    });

    clearPending(userId);
    await answerCallbackQuery(
      callback.id,
      `Logged under ${getCategoryLabel(category)}`
    );
    // Edit message to confirmation and clear the category buttons
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
  const userId = message.from.id;
  const text = message.text.trim();

  if (!isAllowedUser(userId)) {
    await sendTelegramMessage(
      chatId,
      `⛔ Unauthorized. Your Telegram user ID is ${userId}. Ask the admin to add it to TELEGRAM_ALLOWED_USER_IDS.`
    );
    return;
  }

  const lower = text.toLowerCase();

  if (lower === "/start") {
    await sendTelegramMessage(
      chatId,
      `${HELP_TEXT}\n\n🆔 Your Telegram ID: ${userId}`
    );
    return;
  }

  if (lower === "help") {
    await sendTelegramMessage(chatId, HELP_TEXT);
    return;
  }

  if (lower === "/myid" || lower === "myid") {
    await sendTelegramMessage(chatId, `🆔 Your Telegram ID: ${userId}`);
    return;
  }

  if (lower === "undo" || lower === "delete last") {
    const deleted = await deleteLastExpense(userId);
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
    const expenses = await getExpensesForDateRange(today, today);
    await sendTelegramMessage(chatId, summarizeRange(expenses, "Today"));
    return;
  }

  if (lower === "this week") {
    const now = new Date();
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const expenses = await getExpensesForDateRange(start, end);
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

    setPending(userId, draft);
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
