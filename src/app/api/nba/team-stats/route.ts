import { NextRequest, NextResponse } from "next/server";
import { advancedCache } from "@/services/advanced-cache-service";
import {
  fetchNbaCurrentSeasonTeamStatsFromBetsApi,
  getCurrentNbaSeasonRange,
} from "@/modules/nba/season-stats";
import { getBetsApiFriendlyMessage } from "@/modules/nba/adapters/betsapi/client";
import { NbaTeamSeasonStatsResponse } from "@/modules/nba/types";

export const dynamic = "force-dynamic";

const normalizeSearch = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const toTeamStatsWarning = (message: string): string => {
  return message.replace(
    "os jogos da NBA",
    "as estatisticas da temporada da NBA"
  );
};

const buildEmptyFallback = (
  season: ReturnType<typeof getCurrentNbaSeasonRange>,
  warning: string
): NbaTeamSeasonStatsResponse => {
  return {
    teams: [],
    snapshot: {
      seasonLabel: season.seasonLabel,
      seasonStart: season.seasonStart.toISOString(),
      seasonEnd: season.seasonEnd.toISOString(),
      totalTeams: 0,
      totalGames: 0,
      averageGamesPerTeam: 0,
      generatedAt: new Date().toISOString(),
      warnings: [
        warning,
        "Pre-jogo exibido sem estatisticas completas da temporada no momento.",
      ],
    },
  };
};

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);

  const force = searchParams.get("force") === "true";
  const searchTeam = (searchParams.get("team") || "").trim();
  const rawLimit = Number(searchParams.get("limit") || "30");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 30) : 30;

  const season = getCurrentNbaSeasonRange(new Date());
  const cacheKey = `team-stats-v1-${season.seasonLabel}`;
  const backupKey = `team-stats-v1-backup-${season.seasonLabel}`;

  if (!force) {
    const cached = await advancedCache.get<NbaTeamSeasonStatsResponse>("nba", cacheKey);
    if (cached) {
      const filteredTeams = searchTeam
        ? cached.teams.filter((team) =>
            normalizeSearch(team.teamName).includes(normalizeSearch(searchTeam))
          )
        : cached.teams;

      return NextResponse.json({
        success: true,
        data: {
          teams: filteredTeams.slice(0, limit),
          snapshot: cached.snapshot,
        },
        source: "cache",
        cached: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }
  }

  try {
    const result = await fetchNbaCurrentSeasonTeamStatsFromBetsApi();

    await advancedCache.set("nba", cacheKey, result, {
      memory: 1800, // 30 min
      redis: 7200, // 2 h
    });

    await advancedCache.set("nba", backupKey, result, {
      memory: 21600, // 6 h
      redis: 43200, // 12 h
    });

    const filteredTeams = searchTeam
      ? result.teams.filter((team) =>
          normalizeSearch(team.teamName).includes(normalizeSearch(searchTeam))
        )
      : result.teams;

    return NextResponse.json({
      success: true,
      data: {
        teams: filteredTeams.slice(0, limit),
        snapshot: result.snapshot,
      },
      source: "feed",
      cached: false,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    const warning = toTeamStatsWarning(getBetsApiFriendlyMessage(error));
    const backup = await advancedCache.get<NbaTeamSeasonStatsResponse>("nba", backupKey);

    if (backup) {
      const filteredTeams = searchTeam
        ? backup.teams.filter((team) =>
            normalizeSearch(team.teamName).includes(normalizeSearch(searchTeam))
          )
        : backup.teams;

      return NextResponse.json({
        success: true,
        data: {
          teams: filteredTeams.slice(0, limit),
          snapshot: {
            ...backup.snapshot,
            warnings: [...backup.snapshot.warnings, warning],
          },
        },
        source: "fallback",
        cached: true,
        fallback: true,
        responseTimeMs: Date.now() - startedAt,
      });
    }

    const emptyFallback = buildEmptyFallback(season, warning);

    await advancedCache.set("nba", cacheKey, emptyFallback, {
      memory: 300, // 5 min
      redis: 900, // 15 min
    });
    await advancedCache.set("nba", backupKey, emptyFallback, {
      memory: 3600, // 1 h
      redis: 3600,
    });

    return NextResponse.json({
      success: true,
      data: {
        teams: emptyFallback.teams,
        snapshot: emptyFallback.snapshot,
      },
      source: "fallback",
      fallback: true,
      cached: false,
      responseTimeMs: Date.now() - startedAt,
    });
  }
}
