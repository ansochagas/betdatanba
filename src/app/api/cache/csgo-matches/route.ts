import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "@/services/cache-service";

export const dynamic = "force-dynamic";

const cacheService = new CacheService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    let matches;

    if (forceRefresh) {
      console.log("🔄 Forçando atualização do cache...");
      const result = await cacheService.refreshCache();
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.message },
          { status: 500 }
        );
      }
      matches = await cacheService.getCsgoMatches();
    } else {
      matches = await cacheService.getCsgoMatches();
    }

    // Formatar resposta
    const formattedMatches = matches.map((match) => ({
      id: match.id,
      league: "CS:GO",
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: new Date(match.startTime).toISOString(),
      odds: match.odds,
      status: "scheduled",
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatches,
      total: formattedMatches.length,
      metadata: {
        source: "Cache Service (Pinnacle API)",
        cached: !forceRefresh,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Cache API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Força atualização do cache
    console.log("🔄 POST: Forçando atualização do cache via API...");

    const result = await cacheService.refreshCache();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      collected: result.collected,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cache refresh API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro ao atualizar cache",
      },
      { status: 500 }
    );
  }
}
