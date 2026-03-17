import { NextRequest, NextResponse } from "next/server";
import { alertService } from "@/lib/alert-service";

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testando alertas via API...");

    // Criar um alerta de teste
    const testMatch = {
      homeTeam: "Fluxo",
      awayTeam: "Ninjas In Pyjamas",
      startTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos a partir de agora
      tournament: "ESL Challenger League",
      minutesUntilStart: 10,
    };

    // Enviar alerta
    await alertService.sendMatchStartingAlert(testMatch);

    return NextResponse.json({
      success: true,
      message: "Alerta de teste enviado!",
      match: testMatch,
    });
  } catch (error: any) {
    console.error("Erro no teste de alertas:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Verificando alertas via API...");

    // Executar verificação de alertas
    await alertService.checkAndSendAlerts();

    return NextResponse.json({
      success: true,
      message: "Verificação de alertas executada!",
    });
  } catch (error: any) {
    console.error("Erro na verificação de alertas:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
