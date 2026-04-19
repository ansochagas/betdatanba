import { NextRequest, NextResponse } from "next/server";

import { getTelegramBot } from "@/lib/telegram-bot";
import { getTelegramWebhookSecret } from "@/lib/telegram-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getTelegramWebhookSecret();

    if (!expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "Telegram webhook nao configurado" },
        { status: 503 }
      );
    }

    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "Webhook Telegram nao autorizado" },
        { status: 401 }
      );
    }

    const update = await request.json();
    const bot = getTelegramBot();
    const handled = await bot.handleUpdate(update);

    if (!handled) {
      return NextResponse.json(
        { ok: false, error: "Falha ao processar update do Telegram" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram-webhook] Erro ao processar webhook:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar webhook do Telegram" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, service: "telegram-webhook", method: "POST" },
    { status: 200 }
  );
}
