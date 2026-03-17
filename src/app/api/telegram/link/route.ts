import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Verificar se usuário está logado
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Gerar código único de vinculação
    const linkCode = `LINK_${randomBytes(4).toString("hex").toUpperCase()}`;

    // Armazenar código temporário com expiração (5 minutos)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await prisma.telegramLinkCode.create({
      data: {
        code: linkCode,
        userId: user.id,
        expiresAt,
      },
    });

    // Retornar código para o usuário
    return NextResponse.json({
      success: true,
      data: {
        linkCode,
        instructions: "Envie este código para o bot @CsgoScoutBot no Telegram",
        expiresIn: "5 minutos",
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar código de vinculação:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ❌ REMOVIDO: Não verificar sessão aqui - o bot não tem sessão válida
    // A validação é feita apenas pelo código de vinculação

    const { linkCode, telegramId, chatId } = await request.json();

    if (!linkCode || !telegramId || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: linkCode, telegramId, chatId",
        },
        { status: 400 }
      );
    }

    // Buscar código de vinculação válido e não expirado
    const linkCodeRecord = await prisma.telegramLinkCode.findUnique({
      where: { code: linkCode },
      include: { user: true },
    });

    if (!linkCodeRecord) {
      return NextResponse.json(
        { success: false, error: "Código de vinculação inválido ou expirado" },
        { status: 400 }
      );
    }

    // Verificar se o código não expirou
    if (linkCodeRecord.expiresAt < new Date()) {
      // Remover código expirado
      await prisma.telegramLinkCode.delete({
        where: { id: linkCodeRecord.id },
      });
      return NextResponse.json(
        {
          success: false,
          error: "Código de vinculação expirado. Gere um novo código.",
        },
        { status: 400 }
      );
    }

    const user = linkCodeRecord.user;

    // ❌ REMOVIDO: Não verificar se usuário logado é o mesmo - o bot não tem sessão

    // ✅ CORREÇÃO: Verificar se já está vinculado
    if (user.telegramId) {
      return NextResponse.json(
        { success: false, error: "Conta já vinculada ao Telegram" },
        { status: 400 }
      );
    }

    // ✅ CORREÇÃO: Verificar se o telegramId já está vinculado a outro usuário
    const existingTelegramUser = await prisma.user.findFirst({
      where: { telegramId: telegramId.toString() },
    });

    if (existingTelegramUser && existingTelegramUser.id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Este Telegram já está vinculado a outra conta",
        },
        { status: 400 }
      );
    }

    // Vincular conta
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: telegramId.toString() },
    });

    // Criar ou atualizar configuração do Telegram
    await prisma.telegramConfig.upsert({
      where: { userId: user.id },
      update: {
        chatId: chatId.toString(),
        alertsEnabled: true,
        favoriteTeams: JSON.stringify([]),
        alertTypes: JSON.stringify(["games", "odds", "analysis"]),
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
      },
      create: {
        userId: user.id,
        chatId: chatId.toString(),
        alertsEnabled: true,
        favoriteTeams: JSON.stringify([]),
        alertTypes: JSON.stringify(["games", "odds", "analysis"]),
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
      },
    });

    // Remover código usado
    await prisma.telegramLinkCode.delete({
      where: { id: linkCodeRecord.id },
    });

    return NextResponse.json({
      success: true,
      message: "Conta vinculada com sucesso!",
      data: {
        telegramId,
        chatId,
      },
    });
  } catch (error: any) {
    console.error("Erro ao vincular conta:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
