import { NextRequest, NextResponse } from "next/server";
import { csgoAPI } from "@/lib/api/csgoAPI";

export const dynamic = "force-dynamic";

interface TeamStats {
  teamId: string;
  teamName: string;
  totalMatches: number;
  avgMaps: number;
  avgKillsPerMap: number;
  avgRoundsPerMap: number;
  recentMatches: any[];
}

// Cache para evitar chamadas excessivas
interface CachedStatsData {
  team1: TeamStats;
  team2: TeamStats;
  combined: {
    avgMaps: number;
    avgKillsPerMap: number;
    avgRoundsPerMap: number;
  };
  lastUpdated: string;
}

const statsCache = new Map<
  string,
  { data: CachedStatsData; timestamp: number }
>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team1Id = searchParams.get("team1");
    const team2Id = searchParams.get("team2");
    const team1Name = searchParams.get("team1Name") || team1Id;
    const team2Name = searchParams.get("team2Name") || team2Id;

    // Aceita nomes mesmo sem IDs (para não quebrar a Lista de Ouro)
    if (!team1Name || !team2Name) {
      return NextResponse.json(
        {
          error: "Parâmetros obrigatórios: informe team1 e team2 (nome ou id)",
        },
        { status: 400 }
      );
    }

    // Verificar cache
    const cacheKey = `${team1Name}-${team2Name}`;
    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Buscar estatísticas dos times
    const [team1Stats, team2Stats] = await Promise.all([
      calculateTeamStats(team1Id || team1Name, team1Name),
      calculateTeamStats(team2Id || team2Name, team2Name),
    ]);

    // Calcular médias combinadas (baseado em confrontos diretos se possível)
    const combinedStats = {
      avgMaps: Math.round(
        ((team1Stats.avgMaps || 1) + (team2Stats.avgMaps || 1)) / 2
      ),
      // Para a Lista de Ouro, precisamos da soma das kills por mapa dos dois times
      // Ex.: 70 + 70 ~ 140 kills/mapa combinados (linha base 141).
      avgKillsPerMap: Math.round(
        (team1Stats.avgKillsPerMap || 70) + (team2Stats.avgKillsPerMap || 70)
      ),
      // Rounds podem permanecer como média entre os dois times
      avgRoundsPerMap: Math.round(
        ((team1Stats.avgRoundsPerMap || 26) +
          (team2Stats.avgRoundsPerMap || 26)) /
          2
      ),
    };

    const result = {
      team1: team1Stats,
      team2: team2Stats,
      combined: combinedStats,
      lastUpdated: new Date().toISOString(),
    };

    // Salvar no cache
    statsCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao calcular estatísticas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

async function calculateTeamStats(
  teamId: string,
  teamName: string
): Promise<TeamStats> {
  try {
    // Por enquanto, vamos simular dados baseados no nome do time
    // TODO: Integrar com API real para dados históricos

    // Simulação baseada em nomes conhecidos
    const baseStats = getBaseStatsForTeam(teamName);

    return {
      teamId,
      teamName,
      totalMatches: baseStats.totalMatches,
      avgMaps: baseStats.avgMaps,
      avgKillsPerMap: baseStats.avgKillsPerMap,
      avgRoundsPerMap: baseStats.avgRoundsPerMap,
      recentMatches: [], // TODO: implementar busca de partidas recentes
    };
  } catch (error) {
    console.error(`Erro ao calcular stats para ${teamName}:`, error);
    // Fallback para estatísticas padrão
    return {
      teamId,
      teamName,
      totalMatches: 10,
      avgMaps: 1,
      avgKillsPerMap: 15,
      avgRoundsPerMap: 25,
      recentMatches: [],
    };
  }
}

function getBaseStatsForTeam(teamName: string): {
  totalMatches: number;
  avgMaps: number;
  avgKillsPerMap: number;
  avgRoundsPerMap: number;
} {
  const name = teamName.toLowerCase();

  // Times top tier
  if (
    name.includes("navi") ||
    name.includes("faze") ||
    name.includes("vitality") ||
    name.includes("g2") ||
    name.includes("astralis") ||
    name.includes("liquid")
  ) {
    return {
      totalMatches: 45,
      avgMaps: 2,
      avgKillsPerMap: 72,
      avgRoundsPerMap: 26,
    };
  }

  // Times mid tier
  if (
    name.includes("furia") ||
    name.includes("mibr") ||
    name.includes("imperial") ||
    name.includes("fluxo") ||
    name.includes("pain") ||
    name.includes("heroic")
  ) {
    return {
      totalMatches: 35,
      avgMaps: 2,
      avgKillsPerMap: 68,
      avgRoundsPerMap: 25,
    };
  }

  // Times restantes
  return {
    totalMatches: 25,
    avgMaps: 1,
    avgKillsPerMap: 64,
    avgRoundsPerMap: 24,
  };
}
