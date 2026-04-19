import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { linkTelegramAccount } from "@/lib/telegram-account";
import { getTelegramBotIdentity } from "@/lib/telegram-config";

export async function POST(_request: NextRequest) {
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
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    await prisma.telegramLinkCode.deleteMany({
      where: { userId: user.id },
    });

    const linkCode = `LINK_${randomBytes(4).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.telegramLinkCode.create({
      data: {
        code: linkCode,
        userId: user.id,
        expiresAt,
      },
    });

    const bot = await getTelegramBotIdentity();

    return NextResponse.json({
      success: true,
      data: {
        linkCode,
        expiresAt: expiresAt.toISOString(),
        bot,
        instructions: bot.url
          ? `Abra ${bot.url} e envie este codigo ao bot.`
          : "Abra o bot oficial da BETDATA NBA e envie este codigo.",
      },
    });
  } catch (error) {
    console.error("[telegram-link] Erro ao gerar codigo:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { linkCode, telegramId, chatId } = await request.json();
    const result = await linkTelegramAccount({
      linkCode,
      telegramId,
      chatId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Conta vinculada com sucesso",
      data: result.data,
    });
  } catch (error) {
    console.error("[telegram-link] Erro ao vincular conta:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
