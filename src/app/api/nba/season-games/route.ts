import { NextRequest, NextResponse } from "next/server";
import {
  fetchNbaEndedGamesFromBetsApi,
  getBetsApiFriendlyMessage,
} from "@/modules/nba/adapters/betsapi/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);

  const rawDaysBack = Number(searchParams.get("daysBack") ?? "30");
  const rawPageLimit = Number(searchParams.get("pageLimit") ?? "5");
  const includeRaw = searchParams.get("includeRaw") === "true";

  const daysBack = Number.isFinite(rawDaysBack) ? Math.min(Math.max(rawDaysBack, 1), 365) : 30;
  const pageLimit = Number.isFinite(rawPageLimit)
    ? Math.min(Math.max(rawPageLimit, 1), 20)
    : 5;

  try {
    const games = await fetchNbaEndedGamesFromBetsApi(daysBack, pageLimit);

    return NextResponse.json({
      success: true,
      data: includeRaw
        ? games
        : games.map(({ raw, ...game }) => ({
            ...game,
            hasRawPayload: Boolean(raw),
          })),
      source: "feed",
      cached: false,
      responseTimeMs: Date.now() - startedAt,
      metadata: {
        daysBack,
        pageLimit,
        totalGames: games.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: getBetsApiFriendlyMessage(error),
        source: "fallback",
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 502 }
    );
  }
}
