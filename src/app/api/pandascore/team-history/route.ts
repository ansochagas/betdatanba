import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PANDASCORE_API_KEY =
  "YpNRtsc43jMD6EH_JdXmbjyOorxQGuOMDlkuRmlGYALserFw0OM";
const PANDASCORE_BASE_URL = "https://api.pandascore.co";

interface PandascoreTeam {
  id: number;
  name: string;
  image_url?: string;
}

interface PandascoreMatch {
  id: number;
  name: string;
  begin_at: string;
  end_at: string;
  winner: { id: number; name: string } | null;
  opponents: Array<{
    opponent: {
      id: number;
      name: string;
      image_url: string;
    };
    type: string;
  }>;
  results: Array<{
    score: number;
    team_id: number;
  }>;
  tournament: {
    id: number;
    name: string;
    tier: string;
  };
  videogame: {
    id: number;
    name: string;
  };
}

interface TeamHistory {
  teamName: string;
  teamId?: number;
  matches: Array<{
    id: number;
    opponent: string;
    opponentLogo?: string;
    score: string;
    result: "win" | "loss" | "draw";
    date: string;
    tournament: string;
    tier: string;
  }>;
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    avgScore: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team1 = searchParams.get("team1");
    const team2 = searchParams.get("team2");

    if (!team1 || !team2) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: team1 e team2",
        },
        { status: 400 }
      );
    }

    console.log(`🎯 Buscando histórico H2H: ${team1} vs ${team2}`);

    // 1. Primeiro encontrar os IDs dos times
    const team1Data = await findTeamByName(team1);
    const team2Data = await findTeamByName(team2);

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

    console.log(
      `✅ Times encontrados: ${team1Data.name} (ID: ${team1Data.id}) vs ${team2Data.name} (ID: ${team2Data.id})`
    );

    // 2. Buscar histórico de ambos os times
    const [team1History, team2History] = await Promise.all([
      getTeamMatches(team1Data.id, team1Data.name),
      getTeamMatches(team2Data.id, team2Data.name),
    ]);

    // 3. Encontrar confrontos diretos
    const h2hMatches = findH2HMatches(
      team1History,
      team2History,
      team1Data.name,
      team2Data.name
    );

    // 4. Calcular estatísticas H2H
    const h2hStats = calculateH2HStats(
      h2hMatches,
      team1Data.name,
      team2Data.name
    );

    return NextResponse.json({
      success: true,
      data: {
        teams: [team1Data.name, team2Data.name],
        teamIds: [team1Data.id, team2Data.id],
        h2hMatches,
        h2hStats,
        team1History,
        team2History,
        metadata: {
          team1MatchesFound: team1History.matches.length,
          team2MatchesFound: team2History.matches.length,
          h2hMatchesFound: h2hMatches.length,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Erro na API Pandascore team-history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno",
      },
      { status: 500 }
    );
  }
}

async function findTeamByName(
  teamName: string
): Promise<PandascoreTeam | null> {
  try {
    console.log(`🔍 Procurando time: ${teamName}`);

    // Buscar por nome exato primeiro
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

    const teams: PandascoreTeam[] = await searchResponse.json();

    // Procurar correspondência exata primeiro
    let foundTeam = teams.find(
      (team) => team.name.toLowerCase() === teamName.toLowerCase()
    );

    // Se não encontrou, procurar por contém
    if (!foundTeam) {
      foundTeam = teams.find((team) =>
        team.name.toLowerCase().includes(teamName.toLowerCase())
      );
    }

    // Mapeamentos especiais para times conhecidos
    if (!foundTeam) {
      const nameMappings: { [key: string]: string } = {
        FURIA: "FURIA",
        FaZe: "FaZe Clan",
        "FaZe Clan": "FaZe Clan",
        Astralis: "Astralis",
        NAVI: "Natus Vincere",
        "Natus Vincere": "Natus Vincere",
        Vitality: "Team Vitality",
        G2: "G2 Esports",
        ENCE: "ENCE",
        Heroic: "Team Heretics", // pode não ser exato
        MIBR: "MIBR",
        Fluxo: "Fluxo Demons",
      };

      const mappedName = nameMappings[teamName];
      if (mappedName && mappedName !== teamName) {
        return findTeamByName(mappedName);
      }
    }

    return foundTeam || null;
  } catch (error) {
    console.error(`Erro ao buscar time ${teamName}:`, error);
    return null;
  }
}

async function getTeamMatches(
  teamId: number,
  teamName: string
): Promise<TeamHistory> {
  try {
    console.log(`📊 Buscando jogos do time: ${teamName} (ID: ${teamId})`);

    // Buscar jogos do time usando o endpoint correto
    const response = await fetch(
      `${PANDASCORE_BASE_URL}/csgo/matches?filter[opponent_id]=${teamId}&sort=-begin_at&page[size]=20`,
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

    const matches: PandascoreMatch[] = await response.json();

    // Processar jogos
    const processedMatches = matches.map((match) => {
      const teamOpponent = match.opponents.find(
        (opp) => opp.opponent.id === teamId
      );
      const opponent = match.opponents.find(
        (opp) => opp.opponent.id !== teamId
      );

      let result: "win" | "loss" | "draw" = "draw";
      let score = "0-0";

      if (match.results && match.results.length >= 2) {
        const teamScore =
          match.results.find((r) => r.team_id === teamId)?.score || 0;
        const opponentScore =
          match.results.find((r) => r.team_id === opponent?.opponent.id)
            ?.score || 0;

        score = `${teamScore}-${opponentScore}`;

        if (teamScore > opponentScore) result = "win";
        else if (teamScore < opponentScore) result = "loss";
        else result = "draw";
      }

      return {
        id: match.id,
        opponent: opponent?.opponent.name || "Unknown",
        opponentLogo: opponent?.opponent.image_url,
        score,
        result,
        date: match.begin_at,
        tournament: match.tournament.name,
        tier: match.tournament.tier,
      };
    });

    // Calcular estatísticas
    const stats = calculateTeamStats(processedMatches);

    return {
      teamName,
      teamId,
      matches: processedMatches,
      stats,
    };
  } catch (error) {
    console.error(`Erro ao buscar jogos de ${teamName}:`, error);
    return {
      teamName,
      teamId,
      matches: [],
      stats: {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgScore: 0,
      },
    };
  }
}

function findH2HMatches(
  team1History: TeamHistory,
  team2History: TeamHistory,
  team1: string,
  team2: string
) {
  const h2hMatches: Array<{
    id: number;
    date: string;
    tournament: string;
    tier: string;
    team1Score: number;
    team2Score: number;
    winner: string;
  }> = [];

  // Procurar jogos onde os dois times jogaram um contra o outro
  team1History.matches.forEach((match1) => {
    if (match1.opponent === team2) {
      const [team1Score, team2Score] = match1.score.split("-").map(Number);
      h2hMatches.push({
        id: match1.id,
        date: match1.date,
        tournament: match1.tournament,
        tier: match1.tier,
        team1Score,
        team2Score,
        winner:
          match1.result === "win"
            ? team1
            : match1.result === "loss"
            ? team2
            : "draw",
      });
    }
  });

  // Ordenar por data (mais recente primeiro)
  return h2hMatches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function calculateH2HStats(h2hMatches: any[], team1: string, team2: string) {
  const team1Wins = h2hMatches.filter((m) => m.winner === team1).length;
  const team2Wins = h2hMatches.filter((m) => m.winner === team2).length;
  const draws = h2hMatches.filter((m) => m.winner === "draw").length;

  return {
    totalMatches: h2hMatches.length,
    team1Wins,
    team2Wins,
    draws,
    team1WinRate: h2hMatches.length > 0 ? team1Wins / h2hMatches.length : 0,
    team2WinRate: h2hMatches.length > 0 ? team2Wins / h2hMatches.length : 0,
    lastMatch: h2hMatches.length > 0 ? h2hMatches[0] : null,
  };
}

function calculateTeamStats(matches: any[]) {
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const draws = matches.filter((m) => m.result === "draw").length;

  const avgScore =
    matches.length > 0
      ? matches.reduce((sum, m) => {
          const [teamScore] = m.score.split("-").map(Number);
          return sum + teamScore;
        }, 0) / matches.length
      : 0;

  return {
    totalMatches: matches.length,
    wins,
    losses,
    draws,
    winRate: matches.length > 0 ? wins / matches.length : 0,
    avgScore: Math.round(avgScore * 10) / 10,
  };
}
