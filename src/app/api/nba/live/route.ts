import { NextRequest, NextResponse } from "next/server";
import {
  fetchNbaLiveGamesFromBetsApi,
  getBetsApiFriendlyMessage,
} from "@/modules/nba/adapters/betsapi/client";
import { advancedCache } from "@/services/advanced-cache-service";
import {
  NbaMatch,
  NbaTeamSeasonStatsResponse,
} from "@/modules/nba/types";
import { getCurrentNbaSeasonRange } from "@/modules/nba/season-stats";
import { fetchNbaMatchesFromProvider, getNbaProvider } from "@/modules/nba/provider";

export const dynamic = "force-dynamic";

const normalizeTeam = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const cacheKey = "live-v3";

  if (!force) {
    const cached = await advancedCache.get<Record<string, unknown>>("nba", cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        source: "cache",
        cached: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }
  }

  try {
    const games = await fetchNbaLiveGamesFromBetsApi();
    const provider = getNbaProvider();
    const seasonLabel = getCurrentNbaSeasonRange().seasonLabel;
    const statsCacheKey = `team-stats-v1-${seasonLabel}`;
    const cachedSeasonStats = await advancedCache.get<NbaTeamSeasonStatsResponse>(
      "nba",
      statsCacheKey
    );
    const matchesCacheKey = `matches-v2-${provider}-2`;
    const matchesBackupKey = `matches-v2-backup-${provider}-2`;
    const pregameMatches =
      (await advancedCache.get<NbaMatch[]>("nba", matchesCacheKey)) ||
      (await advancedCache.get<NbaMatch[]>("nba", matchesBackupKey)) ||
      (await fetchNbaMatchesFromProvider(2, provider).then((result) => result.matches).catch(() => []));

    const statsByTeam = new Map<string, NbaTeamSeasonStatsResponse["teams"][number]>();
    for (const team of cachedSeasonStats?.teams || []) {
      statsByTeam.set(normalizeTeam(team.teamName), team);
    }

    const pregameByGameId = new Map<string, NbaMatch>();
    for (const match of pregameMatches || []) {
      pregameByGameId.set(String(match.id), match);
    }

    const data = games.map((game) => ({
      ...game,
      homeSeasonSnapshot: statsByTeam.get(normalizeTeam(game.homeTeam))
        ? {
            record: statsByTeam.get(normalizeTeam(game.homeTeam))?.record,
            rank: statsByTeam.get(normalizeTeam(game.homeTeam))?.rank.overall,
            averagePointsFor: statsByTeam.get(normalizeTeam(game.homeTeam))?.averagePointsFor,
            averagePointsAgainst:
              statsByTeam.get(normalizeTeam(game.homeTeam))?.averagePointsAgainst,
            pointDifferential:
              statsByTeam.get(normalizeTeam(game.homeTeam))?.pointDifferential,
          }
        : null,
      awaySeasonSnapshot: statsByTeam.get(normalizeTeam(game.awayTeam))
        ? {
            record: statsByTeam.get(normalizeTeam(game.awayTeam))?.record,
            rank: statsByTeam.get(normalizeTeam(game.awayTeam))?.rank.overall,
            averagePointsFor: statsByTeam.get(normalizeTeam(game.awayTeam))?.averagePointsFor,
            averagePointsAgainst:
              statsByTeam.get(normalizeTeam(game.awayTeam))?.averagePointsAgainst,
            pointDifferential:
              statsByTeam.get(normalizeTeam(game.awayTeam))?.pointDifferential,
          }
        : null,
      pregameReference: pregameByGameId.get(String(game.id))
        ? {
            moneyline: pregameByGameId.get(String(game.id))?.odds.moneyline,
            scheduledAt: pregameByGameId.get(String(game.id))?.scheduledAt,
          }
        : null,
    }));

    const payload = {
      success: true,
      data,
      source: "betsapi",
      cached: false,
      metadata: {
        totalLiveGames: games.length,
        seasonStatsAttached: Boolean(cachedSeasonStats),
        timestamp: new Date().toISOString(),
      },
    };

    await advancedCache.set("nba", cacheKey, payload, {
      memory: 20,
      redis: 20,
    });

    return NextResponse.json({
      ...payload,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: getBetsApiFriendlyMessage(error),
        source: "betsapi",
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 502 }
    );
  }
}
