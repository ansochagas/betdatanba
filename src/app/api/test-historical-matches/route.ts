import { NextRequest, NextResponse } from "next/server";
import { CacheService } from "@/services/cache-service";

const cacheService = new CacheService();

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testando nova função getHistoricalMatches...");

    const matches = await cacheService.getHistoricalMatches();

    return NextResponse.json({
      success: true,
      message: "Teste da função getHistoricalMatches",
      data: matches,
      count: matches.length,
      source: "PandaScore API",
    });
  } catch (error: any) {
    console.error("Erro no teste:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
