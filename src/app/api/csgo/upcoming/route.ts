import { NextRequest, NextResponse } from "next/server";
import { CSGOBatchCollector } from "@/lib/services/csgoBatchCollector";

export const dynamic = "force-dynamic";

let batchCollector: CSGOBatchCollector | null = null;

// Inicializar Batch Collector (singleton)
function getBatchCollector(): CSGOBatchCollector {
  if (!batchCollector) {
    const apiKey = process.env.SPRO_API_KEY;
    if (!apiKey || apiKey === "your-spro-api-key-here") {
      throw new Error("SPRO_API_KEY não configurada");
    }
    batchCollector = new CSGOBatchCollector(apiKey);
  }
  return batchCollector;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "2");

    console.log(`📅 Buscando jogos CS:GO dos próximos ${days} dias...`);

    const collector = getBatchCollector();
    const matches = await collector.getUpcomingMatches(days);

    console.log(`✅ Encontrados ${matches.length} jogos`);

    // Formatar resposta
    const formattedMatches = matches.map((match: any) => ({
      id: match.id,
      externalId: match.externalId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      tournament: match.tournament,
      scheduledAt: match.scheduledAt.toISOString(),
      status: match.status,
      gameName: match.gameName,
      odds:
        match.odds?.map((odd: any) => ({
          sportsbook: odd.sportsbook,
          market: odd.market,
          outcomeName: odd.outcomeName,
          outcomeTarget: odd.outcomeTarget,
          odds: odd.odds,
          impliedProbability: odd.impliedProbability,
          timestamp: odd.timestamp.toISOString(),
        })) || [],
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatches,
      count: formattedMatches.length,
      days,
    });
  } catch (error) {
    console.error("❌ Erro na API upcoming matches:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}

// Endpoint para executar coleta batch manualmente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const collector = getBatchCollector();

    if (action === "collect") {
      console.log("🎮 Executando coleta batch manual...");
      const result = await collector.collectUpcomingMatches();

      return NextResponse.json({
        success: result.success,
        collected: result.collected,
        updated: result.updated,
        errors: result.errors,
        message: result.success
          ? `✅ Coleta concluída: ${result.collected} jogos coletados`
          : "❌ Erro na coleta",
      });
    } else if (action === "status") {
      // Status do coletor (sempre disponível para batch)
      return NextResponse.json({
        success: true,
        collecting: false, // Batch não fica "coletando" continuamente
        type: "batch",
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida. Use "collect" ou "status"' },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Erro na API batch collector:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}
