import { parseExpenseText } from "@/lib/ai";
import {
  CATEGORIES,
  formatCurrency,
  getCategoryLabel,
} from "@/lib/categories";
import {
  createExpense,
  deleteLastExpense,
  getExpensesForDateRange,
} from "@/lib/expenses";
import { isAllowedUser, sendTelegramMessage } from "@/lib/telegram";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string };
  };
}

function summarizeRange(expenses: Awaited<ReturnType<typeof getExpensesForDateRange>>, label: string) {
  if (!expenses.length) return `No expenses for ${label}.`;

  let totalSpent = 0;
  let totalInvested = 0;
  const byCat = new Map<string, number>();

  for (const e of expenses) {
    const amt = Number(e.amount);
    if (CATEGORIES[e.category].isInvestment) totalInvested += amt;
    else totalSpent += amt;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + amt);
  }

  const lines = [
    `📊 ${label}`,
    `Spent: ${formatCurrency(totalSpent)}`,
    `Invested: ${formatCurrency(totalInvested)}`,
    "",
    ...Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• ${getCategoryLabel(cat)}: ${formatCurrency(amt)}`),
  ];
  return lines.join("\n");
}

const HELP_TEXT = `💰 Expense Tracker Bot

Just type your expense naturally:
• 120 lunch zomato
• fuel 2500
• tea 40
• shoes 3200 myntra

Commands:
• today — today's summary
• this week — weekly summary
• undo — delete last entry
• help — show this message

Categories: Dining Out, Ordering In, Tea & Snacks, Investments, Entertainment, Fuel/Transport, Clothing, Miscellaneous`;

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
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
      `✅ Logged ${formatCurrency(parsed.amount)} under ${getCategoryLabel(parsed.category)}\n📝 ${parsed.description}\n📅 ${expense.expense_date}`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not parse expense";
    await sendTelegramMessage(
      chatId,
      `❌ ${msg}\n\nTry: "120 lunch zomato" or type help`
    );
  }
}
