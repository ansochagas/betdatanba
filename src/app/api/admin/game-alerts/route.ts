import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { gameAlertsService } from "@/lib/game-alerts";

const adminEmails = ["admin@csgoscout.com", "andersonchagas45@gmail.com"];

function isAdmin(email?: string | null) {
  return !!email && adminEmails.includes(email);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    console.log("🔎 Verificando status dos alertas de jogos...");

    const status = gameAlertsService.getStatus();

    return NextResponse.json({
      success: true,
      status: {
        serviceActive: status.isRunning,
        alertsSent: status.alertsSent,
        nextCheck: status.nextCheck,
        lastCheck: new Date().toISOString(),
        message: "Sistema de alertas de jogos ativo",
      },
    });
  } catch (error: any) {
    console.error("Erro ao verificar alertas de jogos:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === "check") {
      console.log("🔎 Executando verificação manual de alertas de jogos...");

      const result = await gameAlertsService.checkAndSendAlerts();

      return NextResponse.json({
        success: true,
        result,
        message: `Verificação concluída: ${result.alertsSent} alertas enviados`,
      });
    } else if (action === "clear-cache") {
      console.log("🧹 Limpando cache de alertas enviados...");

      gameAlertsService.clearSentAlertsCache();

      return NextResponse.json({
        success: true,
        message: "Cache de alertas limpo com sucesso",
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao processar alertas de jogos:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
