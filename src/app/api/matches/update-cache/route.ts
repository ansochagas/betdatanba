import { NextRequest, NextResponse } from "next/server";
import { DataCollectorService } from "@/services/data-collector";

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Iniciando atualização diária do cache de jogos CS:GO");

    const dataCollector = new DataCollectorService();

    // Buscar e armazenar jogos da API Pinnacle
    const result = await dataCollector.collectAndStoreMatches();

    if (result.success) {
      console.log(`✅ Cache atualizado: ${result.collected} jogos armazenados`);

      return NextResponse.json({
        success: true,
        message: `Cache atualizado com ${result.collected} jogos`,
        collected: result.collected,
        errors: result.errors,
      });
    } else {
      console.error("❌ Falha na atualização do cache");

      return NextResponse.json(
        {
          success: false,
          message: "Falha na atualização do cache",
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro na atualização do cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
