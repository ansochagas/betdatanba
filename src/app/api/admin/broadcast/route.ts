import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BroadcastRequest {
  title: string;
  message: string;
  target: "all" | "active" | "trial";
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se usuario e admin
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Nao autenticado" },
        { status: 401 }
      );
    }

    // Verificar se e admin
    const adminEmails = [
      "admin@csgoscout.com",
      "andersonchagas45@gmail.com",
    ];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { title, message, target }: BroadcastRequest = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Titulo e mensagem sao obrigatorios" },
        { status: 400 }
      );
    }

    // Construir filtro baseado no target (aceitando maiusculas/minusculas)
    let subscriptionFilter: any = {};

    switch (target) {
      case "active":
        subscriptionFilter = { status: { in: ["ACTIVE", "active"] } };
        break;
      case "trial":
        subscriptionFilter = { status: { in: ["TRIALING", "trialing"] } };
        break;
      case "all":
      default:
        // Para "all", nao aplicamos filtro de subscription
        break;
    }

    // Buscar usuarios com Telegram vinculado baseado no target
    let usersWithTelegram;

    if (target === "all") {
      usersWithTelegram = await prisma.user.findMany({
        where: {
          telegramId: { not: null },
        },
        include: {
          telegramConfig: true,
          subscription: true,
        },
      });
    } else {
      usersWithTelegram = await prisma.user.findMany({
        where: {
          telegramId: { not: null },
          subscription: subscriptionFilter,
        },
        include: {
          telegramConfig: true,
          subscription: true,
        },
      });
    }

    console.log(
      `Broadcast para ${usersWithTelegram.length} usuarios (${target})`
    );

    if (usersWithTelegram.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Nenhum usuario encontrado para o target "${target}"`,
      });
    }

    // Criar mensagem simples (sem Markdown) para evitar falhas de parse
    const formattedMessage =
      "CS2 BETDATA | ALERTA\n\n" +
      title +
      "\n\n" +
      message +
      "\n\nCS2 BETDATA | Bot: @CSGOScoutbot";

    // Enviar para cada usuario
    let successCount = 0;
    let errorCount = 0;

    // Importar telegramBot dinamicamente para evitar problemas de inicializacao
    const { getTelegramBot } = await import("@/lib/telegram-bot");
    const telegramBot = getTelegramBot();

    for (const user of usersWithTelegram) {
      try {
        const chatId =
          (user as any)?.telegramConfig?.chatId || (user as any)?.telegramId || null;

        if (!chatId) {
          console.log(
            `[broadcast] usuario ${user.email} sem chatId/telegramId`
          );
          errorCount++;
          continue;
        }

        const sent = await telegramBot.sendMessage(chatId, formattedMessage);

        if (sent) {
          successCount++;
        } else {
          errorCount++;
        }

        // Pequena pausa para nao sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        errorCount++;
        console.error(`Erro ao enviar broadcast para ${user.name}:`, error);
      }
    }

    console.log(
      `Broadcast concluido: ${successCount} sucesso, ${errorCount} erros`
    );

    return NextResponse.json({
      success: true,
      sentCount: successCount,
      errorCount,
      totalTargeted: usersWithTelegram.length,
      message: `Mensagem enviada para ${successCount} de ${usersWithTelegram.length} usuarios`,
    });
  } catch (error: any) {
    console.error("Erro no broadcast:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
