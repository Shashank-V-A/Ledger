import { parseExpenseText } from "@/lib/ai";
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
  deleteExpense,
  deleteLastExpense,
  getExpenseById,
  getExpensesForDateRange,
  updateExpense,
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

function categoryCorrectionKeyboard(
  expenseId: string,
  currentCategory: CategoryId
): InlineKeyboard {
  const buttons = CATEGORY_LIST.filter((c) => c.id !== currentCategory).map(
    (c) => ({
      text: c.shortLabel,
      callback_data: `c:${expenseId}:${c.id}`,
    })
  );

  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  rows.push([{ text: "↩️ Undo", callback_data: `u:${expenseId}` }]);
  return { inline_keyboard: rows };
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

Just type your expense naturally:
• 120 lunch zomato
• fuel 2500
• tea 40
• shoes 3200 myntra
• 380 mobile recharge

Commands:
• today — today's summary
• this week — weekly summary
• undo — delete last entry
• help — show this message

After logging, tap a category button to reclassify, or Undo to remove.

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

  if (data.startsWith("u:")) {
    const id = data.slice(2);
    const expense = await getExpenseById(id);
    if (!expense) {
      await answerCallbackQuery(callback.id, "Already removed");
      await editTelegramMessage(chatId, messageId, "↩️ Entry already removed");
      return;
    }
    await deleteExpense(id);
    await answerCallbackQuery(callback.id, "Removed");
    await editTelegramMessage(
      chatId,
      messageId,
      `↩️ Removed: ${formatCurrency(Number(expense.amount))} — ${getCategoryLabel(expense.category)} (${expense.description ?? "no description"})`
    );
    return;
  }

  if (data.startsWith("c:")) {
    const parts = data.split(":");
    const id = parts[1];
    const category = parts[2];
    if (!id || !isValidCategory(category)) {
      await answerCallbackQuery(callback.id, "Invalid category");
      return;
    }

    const expense = await getExpenseById(id);
    if (!expense) {
      await answerCallbackQuery(callback.id, "Entry not found");
      await editTelegramMessage(chatId, messageId, "↩️ Entry no longer exists");
      return;
    }

    const updated = await updateExpense(id, { category });
    await answerCallbackQuery(
      callback.id,
      `Moved to ${getCategoryLabel(category)}`
    );
    await editTelegramMessage(
      chatId,
      messageId,
      loggedMessage(
        Number(updated.amount),
        updated.category,
        updated.description ?? "Expense",
        updated.expense_date
      ),
      { reply_markup: categoryCorrectionKeyboard(id, category) }
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
    const parsed = await parseExpenseText(text);
    const expense = await createExpense({
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      source: "telegram",
      telegram_user_id: userId,
    });

    await sendTelegramMessage(
      chatId,
      loggedMessage(
        parsed.amount,
        parsed.category,
        parsed.description,
        expense.expense_date
      ),
      {
        reply_markup: categoryCorrectionKeyboard(expense.id, parsed.category),
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not parse expense";
    await sendTelegramMessage(
      chatId,
      `❌ ${msg}\n\nTry: "120 lunch zomato" or type help`
    );
  }
}
