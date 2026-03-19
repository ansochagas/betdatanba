import { NextRequest, NextResponse } from "next/server";
import { advancedCache } from "@/services/advanced-cache-service";
import { getMockNbaMatches } from "@/modules/nba/mock";
import {
  fetchNbaMatchesFromProvider,
  fetchNbaPlayerAnalysisFromProvider,
  getNbaProvider,
  getNbaProviderFriendlyMessage,
} from "@/modules/nba/provider";
import {
  NbaGoldListResponse,
  NbaMatch,
  NbaPlayerAnalysisResponse,
  NbaTeamSeasonStatsResponse,
} from "@/modules/nba/types";
import { buildNbaGoldList } from "@/modules/nba/gold-list";
import {
  fetchNbaCurrentSeasonTeamStatsFromBetsApi,
  getCurrentNbaSeasonRange,
} from "@/modules/nba/season-stats";
import { isGoldListEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const formatDateInBrt = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getMatchDayKey = (scheduledAt: string): string =>
  formatDateInBrt(new Date(scheduledAt));

const filterTodayMatches = (matches: NbaMatch[]): NbaMatch[] => {
  const todayKey = formatDateInBrt(new Date());
  return matches.filter((match) => getMatchDayKey(match.scheduledAt) === todayKey);
};

const loadTeamStatsForGoldList = async (warnings: string[]) => {
  const seasonLabel = getCurrentNbaSeasonRange(new Date()).seasonLabel;
  const cacheKey = `team-stats-v1-${seasonLabel}`;

  const cached = await advancedCache.get<NbaTeamSeasonStatsResponse>("nba", cacheKey);
  if (cached) {
    return cached.teams;
  }

  try {
    const fresh = await fetchNbaCurrentSeasonTeamStatsFromBetsApi();
    await advancedCache.set("nba", cacheKey, fresh, {
      memory: 1800,
      redis: 7200,
    });
    warnings.push(...fresh.snapshot.warnings);
    return fresh.teams;
  } catch {
    warnings.push("Melhores do Dia sem base completa de temporada; score operando em modo reduzido.");
    return [];
  }
};

const loadPlayerAnalysis = async (
  match: NbaMatch,
  provider: ReturnType<typeof getNbaProvider>,
  warnings: string[],
  force: boolean
): Promise<NbaPlayerAnalysisResponse | null> => {
  const cacheKey = `player-analysis-v1-${provider}-${match.id}`;
  const backupKey = `player-analysis-v1-backup-${provider}-${match.id}`;

  if (!force) {
    const cached = await advancedCache.get<NbaPlayerAnalysisResponse>("nba", cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const analysis = await fetchNbaPlayerAnalysisFromProvider(
      String(match.id),
      {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        scheduledAt: match.scheduledAt,
        league: match.league,
      },
      provider
    );

    await advancedCache.set("nba", cacheKey, analysis, {
      memory: 900,
      redis: 1800,
    });
    await advancedCache.set("nba", backupKey, analysis, {
      memory: 21600,
      redis: 21600,
    });

    return analysis;
  } catch (error) {
    const warning = getNbaProviderFriendlyMessage(error, provider);
    const backup = await advancedCache.get<NbaPlayerAnalysisResponse>("nba", backupKey);

    if (backup) {
      warnings.push(`${match.homeTeam} vs ${match.awayTeam}: ${warning}`);
      return {
        ...backup,
        warnings: [...backup.warnings, warning],
      };
    }

    warnings.push(`${match.homeTeam} vs ${match.awayTeam}: ${warning}`);
    return null;
  }
};

export async function GET(request: NextRequest) {
  if (!isGoldListEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "Melhores do Dia temporariamente desabilitado para o teste externo.",
      },
      { status: 403 }
    );
  }

  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const rawDays = Number(searchParams.get("days") ?? "2");
  const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(rawDays, 3)) : 2;
  const provider = getNbaProvider();

  const dateKey = formatDateInBrt(new Date());
  const cacheKey = `gold-list-v3-${provider}-${dateKey}-d${days}`;

  if (!force) {
    const cached = await advancedCache.get<NbaGoldListResponse>("nba", cacheKey);
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

  const warnings: string[] = [];
  let dataSource: string = "feed";
  let fallback = false;

  try {
    const result = await fetchNbaMatchesFromProvider(days, provider);
    warnings.push(...result.warnings);

    const todayMatches = filterTodayMatches(result.matches);
    const teamStats = await loadTeamStatsForGoldList(warnings);

    if (!todayMatches.length) {
      warnings.push("Nenhum jogo da NBA foi encontrado para hoje no horário de Brasília.");
    }

    const analyses = await Promise.all(
      todayMatches.map(async (match) => {
        const analysis = await loadPlayerAnalysis(match, provider, warnings, force);
        if (!analysis) return null;
        return { match, analysis };
      })
    );

    const bestOfDay = buildNbaGoldList(todayMatches, {
      dataSource,
      warnings,
      maxPicksPerMarket: 5,
      topPicksCount: 6,
      teamStats,
      playerAnalyses: analyses.filter(
        (entry): entry is { match: NbaMatch; analysis: NbaPlayerAnalysisResponse } =>
          Boolean(entry)
      ),
    });

    await advancedCache.set("nba", cacheKey, bestOfDay, {
      memory: 900,
      redis: 1800,
    });

    return NextResponse.json({
      success: true,
      data: bestOfDay,
      source: "feed",
      cached: false,
      fallback,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    dataSource = "mock";
    fallback = true;
    warnings.push(getNbaProviderFriendlyMessage(error, provider));

    const mockMatches = filterTodayMatches(getMockNbaMatches(days));
    const goldList = buildNbaGoldList(mockMatches, {
      dataSource,
      warnings,
      maxPicksPerMarket: 5,
      topPicksCount: 6,
      playerAnalyses: [],
    });

    await advancedCache.set("nba", cacheKey, goldList, {
      memory: 300,
      redis: 900,
    });

    return NextResponse.json({
      success: true,
      data: goldList,
      source: "fallback",
      cached: false,
      fallback,
      responseTimeMs: Date.now() - startedAt,
    });
  }
}
