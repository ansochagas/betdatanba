import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { SubscriptionManager } from "@/lib/subscription-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verificar se usuário é admin
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é admin
    const adminEmails = [
      "admin@csgoscout.com",
      "andersonchagas45@gmail.com", // Conta admin criada
    ];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    console.log("🔍 Iniciando verificação de integridade das subscriptions...");

    const integrity = await SubscriptionManager.checkIntegrity();

    console.log("✅ Verificação concluída:", integrity);

    return NextResponse.json({
      success: true,
      integrity,
    });
  } catch (error: any) {
    console.error("Erro na verificação de integridade:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
