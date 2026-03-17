import { NextRequest, NextResponse } from "next/server";
import { getEnrichedMatches } from "@/lib/matches";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const matches = await getEnrichedMatches(
      type === "live" ? "live" : "today",
    );

    return NextResponse.json({
      success: true,
      type: type ?? "today",
      total: matches.length,
      matches,
      metadata: {
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Matches API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro ao buscar jogos",
      },
      { status: 500 },
    );
  }
}
