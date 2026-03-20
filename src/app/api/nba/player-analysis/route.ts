import { NextRequest, NextResponse } from "next/server";
import { advancedCache } from "@/services/advanced-cache-service";
import {
  fetchNbaPlayerAnalysisFromProvider,
  getNbaProvider,
  getNbaProviderFriendlyMessage,
} from "@/modules/nba/provider";
import { NbaPlayerAnalysisResponse } from "@/modules/nba/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);

  const matchId = (searchParams.get("matchId") || "").trim();
  const homeTeam = (searchParams.get("homeTeam") || "").trim();
  const awayTeam = (searchParams.get("awayTeam") || "").trim();
  const scheduledAt = (searchParams.get("scheduledAt") || "").trim();
  const league = (searchParams.get("league") || "").trim();
  const force = searchParams.get("force") === "true";
  const provider = getNbaProvider();

  if (!matchId) {
    return NextResponse.json(
      {
        success: false,
        error: "Parametro matchId e obrigatorio.",
      },
      { status: 400 }
    );
  }

  const cacheKey = `player-analysis-v2-${provider}-${matchId}`;
  const backupKey = `player-analysis-v2-backup-${provider}-${matchId}`;

  if (!force) {
    const cached = await advancedCache.get<NbaPlayerAnalysisResponse>("nba", cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        source: "cache",
        cached: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }
  }

  try {
    const result = await fetchNbaPlayerAnalysisFromProvider(
      matchId,
      {
        homeTeam: homeTeam || null,
        awayTeam: awayTeam || null,
        scheduledAt: scheduledAt || null,
        league: league || null,
      },
      provider
    );

    await advancedCache.set("nba", cacheKey, result, {
      memory: 900,
      redis: 1800,
    });

    await advancedCache.set("nba", backupKey, result, {
      memory: 21600,
      redis: 21600,
    });

    return NextResponse.json({
      success: true,
      data: result,
      source: "feed",
      cached: false,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    const warning = getNbaProviderFriendlyMessage(error, provider);
    const backup = await advancedCache.get<NbaPlayerAnalysisResponse>("nba", backupKey);

    if (backup) {
      return NextResponse.json({
        success: true,
        data: {
          ...backup,
          warnings: [...backup.warnings, warning],
        },
        source: "fallback",
        cached: true,
        fallback: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: warning,
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 502 }
    );
  }
}
