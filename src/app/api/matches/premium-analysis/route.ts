import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PANDASCORE_API_KEY =
  "YpNRtsc43jMD6EH_JdXmbjyOorxQGuOMDlkuRmlGYALserFw0OM";
const PANDASCORE_BASE_URL = "https://api.pandascore.co";

interface PremiumMatch {
  id: number;
  name: string;
  status: string;
  begin_at: string;
  end_at?: string;
  winner?: { id: number; name: string };
  opponents: Array<{
    opponent: {
      id: number;
      name: string;
      image_url?: string;
    };
  }>;
  results: Array<{
    score: number;
    team_id: number;
  }>;
  tournament: {
    id: number;
    name: string;
    tier: string;
    detailed_stats: boolean;
    live_supported: boolean;
  };
  videogame: {
    id: number;
    name: string;
  };
  games?: Array<{
    id: number;
    position: number;
    status: string;
    length: number | null;
    finished: boolean;
    winner?: { id: number };
    map?: string;
  }>;
}

interface PremiumAnalysis {
  match: PremiumMatch;
  premiumInsights: string[];
  detailedStats: {
    totalMaps: number;
    averageMatchLength: number;
    tournamentTier: string;
    hasLiveSupport: boolean;
    matchQuality: "high" | "medium" | "low";
  };
  predictions: {
    expectedWinner?: string;
    confidence: number;
    reasoning: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team1 = searchParams.get("team1");
    const team2 = searchParams.get("team2");
    const includeLive = searchParams.get("includeLive") === "true";

    if (!team1 || !team2) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: team1 e team2",
        },
        { status: 400 }
      );
    }

    console.log(
      `🎯 Análise Premium: ${team1} vs ${team2} (Live: ${includeLive})`
    );

    // 1. Buscar confronto direto entre os times (dados premium)
    const directMatches = await findDirectMatches(team1, team2);

    // 2. Buscar estatísticas premium dos times
    const [team1Data, team2Data] = await Promise.all([
      findTeamByName(team1),
      findTeamByName(team2),
    ]);

    if (!team1Data || !team2Data) {
      return NextResponse.json(
        {
          success: false,
          error: `Times não encontrados: ${!team1Data ? team1 : ""} ${
            !team2Data ? team2 : ""
          }`.trim(),
        },
        { status: 404 }
      );
    }

    // 3. Buscar jogos premium dos times
    const [team1Matches, team2Matches] = await Promise.all([
      getTeamPremiumMatches(team1Data.id, team1Data.name),
      getTeamPremiumMatches(team2Data.id, team2Data.name),
    ]);

    // 4. Gerar análise premium
    const premiumAnalysis = generatePremiumAnalysis(
      team1Data,
      team2Data,
      team1Matches,
      team2Matches,
      directMatches
    );

    return NextResponse.json({
      success: true,
      data: {
        teams: {
          team1: team1Data,
          team2: team2Data,
        },
        premiumStats: {
          team1: calculatePremiumStats(team1Matches),
          team2: calculatePremiumStats(team2Matches),
        },
        directMatches: directMatches.slice(0, 5), // últimos 5 confrontos
        analysis: premiumAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: "Pandascore Premium API",
          premiumFeatures: [
            "detailed_stats",
            "tournament_tier_analysis",
            "live_support_detection",
            "match_quality_scoring",
          ],
        },
      },
    });
  } catch (error: any) {
    console.error("Erro na API premium-analysis:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno",
      },
      { status: 500 }
    );
  }
}

async function findDirectMatches(
  team1: string,
  team2: string
): Promise<PremiumMatch[]> {
  try {
    // Buscar jogos onde ambos os times participaram
    const response = await fetch(
      `${PANDASCORE_BASE_URL}/csgo/matches?filter[detailed_stats]=true&page[size]=20&sort=-begin_at`,
      {
        headers: {
          Authorization: `Bearer ${PANDASCORE_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pandascore API error: ${response.status}`);
    }

    const matches: PremiumMatch[] = await response.json();

    // Filtrar jogos que contenham ambos os times
    const directMatches = matches.filter((match) => {
      const teamNames =
        match.opponents?.map((opp) => opp.opponent.name.toLowerCase()) || [];
      return (
        teamNames.includes(team1.toLowerCase()) &&
        teamNames.includes(team2.toLowerCase())
      );
    });

    return directMatches;
  } catch (error) {
    console.error("Erro ao buscar confrontos diretos:", error);
    return [];
  }
}

async function findTeamByName(teamName: string) {
  try {
    const searchResponse = await fetch(
      `${PANDASCORE_BASE_URL}/csgo/teams?search[name]=${encodeURIComponent(
        teamName
      )}&page[size]=5`,
      {
        headers: {
          Authorization: `Bearer ${PANDASCORE_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Pandascore API error: ${searchResponse.status}`);
    }

    const teams = await searchResponse.json();

    let foundTeam = teams.find(
      (team: any) => team.name.toLowerCase() === teamName.toLowerCase()
    );

    if (!foundTeam) {
      foundTeam = teams.find((team: any) =>
        team.name.toLowerCase().includes(teamName.toLowerCase())
      );
    }

    return foundTeam || null;
  } catch (error) {
    console.error(`Erro ao buscar time ${teamName}:`, error);
    return null;
  }
}

async function getTeamPremiumMatches(
  teamId: number,
  teamName: string
): Promise<PremiumMatch[]> {
  try {
    // Buscar apenas jogos com detailed_stats = true
    const response = await fetch(
      `${PANDASCORE_BASE_URL}/csgo/matches?filter[opponent_id]=${teamId}&filter[detailed_stats]=true&sort=-begin_at&page[size]=10`,
      {
        headers: {
          Authorization: `Bearer ${PANDASCORE_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pandascore API error: ${response.status}`);
    }

    const matches: PremiumMatch[] = await response.json();
    return matches;
  } catch (error) {
    console.error(`Erro ao buscar jogos premium de ${teamName}:`, error);
    return [];
  }
}

function calculatePremiumStats(matches: PremiumMatch[]) {
  const finishedMatches = matches.filter((m) => m.status === "finished");

  const totalMaps = finishedMatches.reduce((sum, match) => {
    return sum + (match.games?.length || 0);
  }, 0);

  const totalMatchLength = finishedMatches.reduce((sum, match) => {
    const matchLength =
      match.games?.reduce((gameSum, game) => gameSum + (game.length || 0), 0) ||
      0;
    return sum + matchLength;
  }, 0);

  const wins = finishedMatches.filter((match) => {
    if (!match.winner) return false;
    const teamOpponent = match.opponents.find(
      (opp) => opp.opponent.id !== match.winner!.id
    );
    return teamOpponent !== undefined;
  }).length;

  const winRate =
    finishedMatches.length > 0 ? wins / finishedMatches.length : 0;

  // Calcular tier médio dos torneios
  const tierScores = { s: 5, a: 4, b: 3, c: 2, d: 1 };
  const avgTierScore =
    finishedMatches.length > 0
      ? finishedMatches.reduce(
          (sum, match) =>
            sum +
            (tierScores[match.tournament.tier as keyof typeof tierScores] || 1),
          0
        ) / finishedMatches.length
      : 0;

  const avgTier =
    avgTierScore >= 4.5
      ? "s"
      : avgTierScore >= 3.5
      ? "a"
      : avgTierScore >= 2.5
      ? "b"
      : avgTierScore >= 1.5
      ? "c"
      : "d";

  return {
    totalMatches: matches.length,
    finishedMatches: finishedMatches.length,
    wins,
    losses: finishedMatches.length - wins,
    winRate,
    totalMaps,
    avgMapsPerMatch:
      finishedMatches.length > 0 ? totalMaps / finishedMatches.length : 0,
    totalMatchLength,
    avgMatchLength:
      finishedMatches.length > 0
        ? totalMatchLength / finishedMatches.length
        : 0,
    avgTournamentTier: avgTier,
    hasLiveSupport: matches.some((m) => m.tournament.live_supported),
  };
}

function generatePremiumAnalysis(
  team1Data: any,
  team2Data: any,
  team1Matches: PremiumMatch[],
  team2Matches: PremiumMatch[],
  directMatches: PremiumMatch[]
) {
  const team1Stats = calculatePremiumStats(team1Matches);
  const team2Stats = calculatePremiumStats(team2Matches);

  const insights = [];

  // Análise de qualidade dos torneios
  if (team1Stats.avgTournamentTier !== team2Stats.avgTournamentTier) {
    const tierOrder: Record<string, number> = { s: 5, a: 4, b: 3, c: 2, d: 1 };
    const tierNames: Record<string, string> = {
      s: "S-Tier",
      a: "A-Tier",
      b: "B-Tier",
      c: "C-Tier",
      d: "D-Tier",
    };

    const team1TierScore = tierOrder[team1Stats.avgTournamentTier] || 1;
    const team2TierScore = tierOrder[team2Stats.avgTournamentTier] || 1;

    const betterTeam =
      team1TierScore > team2TierScore ? team1Data.name : team2Data.name;
    const betterTier =
      tierNames[
        team1TierScore > team2TierScore
          ? team1Stats.avgTournamentTier
          : team2Stats.avgTournamentTier
      ];
    const worseTier =
      tierNames[
        team1TierScore > team2TierScore
          ? team2Stats.avgTournamentTier
          : team1Stats.avgTournamentTier
      ];

    insights.push(
      `🏆 ${betterTeam} joga em torneios de nível superior (${betterTier} vs ${worseTier})`
    );
  }

  // Análise de suporte a live
  if (team1Stats.hasLiveSupport && !team2Stats.hasLiveSupport) {
    insights.push(
      `📺 ${team1Data.name} participa de torneios com transmissão ao vivo`
    );
  } else if (team2Stats.hasLiveSupport && !team1Stats.hasLiveSupport) {
    insights.push(
      `📺 ${team2Data.name} participa de torneios com transmissão ao vivo`
    );
  }

  // Análise de confrontos diretos
  if (directMatches.length > 0) {
    const finishedDirect = directMatches.filter((m) => m.status === "finished");
    if (finishedDirect.length > 0) {
      const team1Wins = finishedDirect.filter((match) => {
        return match.winner?.id === team1Data.id;
      }).length;

      const team2Wins = finishedDirect.filter((match) => {
        return match.winner?.id === team2Data.id;
      }).length;

      if (team1Wins > team2Wins) {
        insights.push(
          `⚔️ ${team1Data.name} leva vantagem nos confrontos diretos (${team1Wins}-${team2Wins})`
        );
      } else if (team2Wins > team1Wins) {
        insights.push(
          `⚔️ ${team2Data.name} leva vantagem nos confrontos diretos (${team2Wins}-${team1Wins})`
        );
      } else {
        insights.push(
          `⚔️ Confrontos diretos equilibrados (${team1Wins}-${team2Wins})`
        );
      }
    }
  }

  // Análise de mapas por jogo
  if (Math.abs(team1Stats.avgMapsPerMatch - team2Stats.avgMapsPerMatch) > 0.5) {
    if (team1Stats.avgMapsPerMatch > team2Stats.avgMapsPerMatch) {
      insights.push(
        `🗺️ ${
          team1Data.name
        } joga mais mapas por partida (${team1Stats.avgMapsPerMatch.toFixed(
          1
        )} vs ${team2Stats.avgMapsPerMatch.toFixed(1)})`
      );
    } else {
      insights.push(
        `🗺️ ${
          team2Data.name
        } joga mais mapas por partida (${team2Stats.avgMapsPerMatch.toFixed(
          1
        )} vs ${team1Stats.avgMapsPerMatch.toFixed(1)})`
      );
    }
  }

  // Predição baseada em dados premium
  let expectedWinner = null;
  let confidence = 0;
  const reasoning = [];

  if (team1Stats.winRate > team2Stats.winRate + 0.1) {
    expectedWinner = team1Data.name;
    confidence = Math.min(0.8, (team1Stats.winRate - team2Stats.winRate) * 2);
    reasoning.push(
      `Win rate superior: ${Math.round(
        team1Stats.winRate * 100
      )}% vs ${Math.round(team2Stats.winRate * 100)}%`
    );
  } else if (team2Stats.winRate > team1Stats.winRate + 0.1) {
    expectedWinner = team2Data.name;
    confidence = Math.min(0.8, (team2Stats.winRate - team1Stats.winRate) * 2);
    reasoning.push(
      `Win rate superior: ${Math.round(
        team2Stats.winRate * 100
      )}% vs ${Math.round(team1Stats.winRate * 100)}%`
    );
  }

  if (directMatches.length > 0) {
    const recentDirect = directMatches.slice(0, 3);
    const team1RecentWins = recentDirect.filter(
      (m) => m.winner?.id === team1Data.id
    ).length;
    const team2RecentWins = recentDirect.filter(
      (m) => m.winner?.id === team2Data.id
    ).length;

    if (team1RecentWins > team2RecentWins) {
      reasoning.push(`Vantagem nos últimos confrontos diretos`);
      confidence += 0.1;
    } else if (team2RecentWins > team1RecentWins) {
      reasoning.push(`Vantagem nos últimos confrontos diretos`);
      confidence += 0.1;
    }
  }

  return {
    insights,
    predictions: {
      expectedWinner,
      confidence: Math.min(1, confidence),
      reasoning,
    },
    premiumFeatures: [
      "detailed_stats_analysis",
      "tournament_tier_comparison",
      "live_support_detection",
      "direct_matches_history",
      "maps_per_match_analysis",
    ],
  };
}
