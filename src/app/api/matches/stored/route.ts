import { NextRequest, NextResponse } from "next/server";
import { DataCollectorService } from "@/services/data-collector";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const collector = new DataCollectorService();
    const matches = await collector.getStoredMatches(limit);

    return NextResponse.json({
      success: true,
      total: matches.length,
      matches,
      metadata: {
        requestedAt: new Date().toISOString(),
        source: "Pinnacle API (stored)",
      },
    });
  } catch (error: any) {
    console.error("Stored matches API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro ao buscar jogos armazenados",
      },
      { status: 500 }
    );
  }
}
