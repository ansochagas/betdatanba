import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { SubscriptionAlerts } from "@/lib/subscription-alerts";

export async function GET(request: NextRequest) {
  try {
    // Verificar se é admin
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const adminEmails = ["admin@csgoscout.com", "andersonchagas45@gmail.com"];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    console.log("📢 Buscando usuários que precisam de alertas de expiração...");

    const alerts = await SubscriptionAlerts.getUsersNeedingAlerts();

    console.log(
      `📊 Encontrados ${alerts.length} usuários precisando de alertas`
    );

    // Agrupar por tipo de alerta
    const grouped = {
      critical: alerts.filter((a) => a.alertType === "critical"),
      warning: alerts.filter((a) => a.alertType === "warning"),
      expired: alerts.filter((a) => a.alertType === "expired"),
    };

    return NextResponse.json({
      success: true,
      alerts,
      grouped,
      summary: {
        total: alerts.length,
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        expired: grouped.expired.length,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar alertas:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se é admin
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const adminEmails = ["admin@csgoscout.com", "andersonchagas45@gmail.com"];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === "send") {
      console.log("🚀 Enviando alertas de expiração...");

      const result = await SubscriptionAlerts.sendExpirationAlerts();

      return NextResponse.json({
        success: true,
        result,
        message: `Alertas enviados: ${result.sent} sucesso, ${result.failed} falha`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao processar alertas:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
