const TELEGRAM_API = "https://api.telegram.org/bot";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

export function getAllowedUserIds(): number[] {
  const raw = process.env.TELEGRAM_ALLOWED_USER_IDS ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number)
    .filter((id) => !Number.isNaN(id));
}

export function isAllowedUser(userId: number): boolean {
  const allowed = getAllowedUserIds();
  if (!allowed.length) return true;
  return allowed.includes(userId);
}

export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: InlineKeyboard;
  }
): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode,
      reply_markup: options?.reply_markup,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${body}`);
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram answerCallbackQuery failed: ${body}`);
  }
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: { reply_markup?: InlineKeyboard | { inline_keyboard: never[] } }
): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: options?.reply_markup ?? { inline_keyboard: [] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram editMessageText failed: ${body}`);
  }
}

export async function sendTelegramDocument(
  chatId: number | string,
  file: Buffer,
  filename: string,
  caption?: string
): Promise<void> {
  const token = getBotToken();
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new Blob([new Uint8Array(file)]), filename);
  if (caption) form.append("caption", caption);

  const res = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendDocument failed: ${body}`);
  }
}

export async function setWebhook(url: string): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`setWebhook failed: ${body}`);
  }
}
