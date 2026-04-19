import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTelegramAlertTypes } from "@/lib/telegram-account";
import { getTelegramBotIdentity } from "@/lib/telegram-config";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Usuario nao autenticado" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        telegramConfig: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    const bot = await getTelegramBotIdentity();
    const linked = Boolean(user.telegramId && user.telegramConfig?.chatId);

    return NextResponse.json({
      success: true,
      linked,
      bot,
      data: {
        telegramId: user.telegramId,
        chatId: user.telegramConfig?.chatId || null,
        alertsEnabled: Boolean(user.telegramConfig?.alertsEnabled),
        alertTypes: parseTelegramAlertTypes(user.telegramConfig?.alertTypes),
      },
    });
  } catch (error) {
    console.error("[telegram-status] Erro ao verificar status:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
