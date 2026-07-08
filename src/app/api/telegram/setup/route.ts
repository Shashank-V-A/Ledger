import { NextResponse } from "next/server";

export async function GET() {
  const appUrl = process.env.APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!appUrl || !token) {
    return NextResponse.json(
      { error: "Set APP_URL and TELEGRAM_BOT_TOKEN" },
      { status: 400 }
    );
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      ...(secret ? { secret_token: secret } : {}),
    }),
  });

  const data = await res.json();
  return NextResponse.json({ webhookUrl, telegram: data });
}
