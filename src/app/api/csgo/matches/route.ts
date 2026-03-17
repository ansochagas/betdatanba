import { NextResponse } from "next/server";
import { DataCollectorService } from "@/services/data-collector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataCollector = new DataCollectorService();

    // Busca jogos armazenados
    const matches = await dataCollector.getStoredMatches(20);

    return NextResponse.json({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    console.error("Erro na API de matches:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const dataCollector = new DataCollectorService();

    // Coleta dados da API SofaSport
    const result = await dataCollector.collectAndStoreMatches();

    return NextResponse.json({
      success: result.success,
      collected: result.collected,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Erro na coleta de dados:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro na coleta de dados",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}
