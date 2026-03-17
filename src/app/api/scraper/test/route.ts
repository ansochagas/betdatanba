import { NextRequest, NextResponse } from "next/server";
import { HLTVScraper } from "@/services/hltv-scraper";

const scraper = new HLTVScraper();

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testando HLTV Scraper...");

    // Teste 1: Buscar estatísticas de um jogador
    console.log("🎯 Testando busca de estatísticas de jogador...");
    const playerStats = await scraper.getPlayerStats(9216); // Fallen

    return NextResponse.json({
      success: true,
      message: "Scraper testado com sucesso",
      playerStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Erro no teste do scraper:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
