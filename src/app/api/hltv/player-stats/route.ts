import { NextRequest, NextResponse } from "next/server";
import { HLTVScraper } from "@/services/hltv-scraper";

export const dynamic = "force-dynamic";

const scraper = new HLTVScraper();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro playerId obrigatório",
        },
        { status: 400 }
      );
    }

    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) {
      return NextResponse.json(
        {
          success: false,
          error: "playerId deve ser um número válido",
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Buscando stats do player ${playerIdNum} via HLTV...`);

    const playerStats = await scraper.getPlayerStats(playerIdNum);

    if (!playerStats) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível obter stats do jogador",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: playerStats,
      metadata: {
        source: "HLTV.org",
        cached: false,
        playerId: playerIdNum,
        matchesAnalyzed: playerStats.recentMatches.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro na API player-stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno",
      },
      { status: 500 }
    );
  }
}
