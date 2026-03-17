import { NextRequest, NextResponse } from "next/server";
import { advancedCache } from "@/services/advanced-cache-service";
import { getMockNbaMatches } from "@/modules/nba/mock";
import {
  fetchNbaMatchesFromProvider,
  getNbaProvider,
  getNbaProviderFriendlyMessage,
} from "@/modules/nba/provider";
import { buildNbaGoldList } from "@/modules/nba/gold-list";
import { NbaGoldListResponse, NbaTeamSeasonStatsResponse } from "@/modules/nba/types";
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
    warnings.push("Gold List sem base completa de temporada; score operando em modo reduzido.");
    return [];
  }
};

export async function GET(request: NextRequest) {
  if (!isGoldListEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "Lista de Ouro temporariamente desabilitada para o teste externo.",
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
  const cacheKey = `gold-list-v2-${provider}-${dateKey}-d${days}`;

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
  let dataSource: string = provider;
  let fallback = false;

  try {
    const result = await fetchNbaMatchesFromProvider(days, provider);
    warnings.push(...result.warnings);
    const teamStats = await loadTeamStatsForGoldList(warnings);

    if (result.matches.length === 0) {
      throw new Error("Sem jogos no retorno da API");
    }

    const goldList = buildNbaGoldList(result.matches, {
      dataSource,
      warnings,
      maxPicks: 5,
      teamStats,
    });

    await advancedCache.set("nba", cacheKey, goldList, {
      memory: 900,
      redis: 1800,
    });

    return NextResponse.json({
      success: true,
      data: goldList,
      source: dataSource,
      cached: false,
      fallback,
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    dataSource = "mock";
    fallback = true;
    warnings.push(getNbaProviderFriendlyMessage(error, provider));

    const mockMatches = getMockNbaMatches(days);
    const goldList = buildNbaGoldList(mockMatches, {
      dataSource,
      warnings,
      maxPicks: 5,
    });

    await advancedCache.set("nba", cacheKey, goldList, {
      memory: 300,
      redis: 900,
    });

    return NextResponse.json({
      success: true,
      data: goldList,
      source: "mock-fallback",
      cached: false,
      fallback,
      responseTimeMs: Date.now() - startedAt,
    });
  }
}
