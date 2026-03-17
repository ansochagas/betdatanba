import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PANDASCORE_API_KEY =
  "POciMXi8fwRIbuW3qEWvPVqGTv_Yfv55T-_mwp8DzpYOR-1mYjo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");
    const playerSlug = searchParams.get("playerSlug");

    if (!playerId && !playerSlug) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios: playerId ou playerSlug" },
        { status: 400 }
      );
    }

    const identifier = playerId || playerSlug;
    console.log(`🎯 Buscando estatísticas do jogador: ${identifier}`);

    // Buscar estatísticas do jogador
    const statsUrl = `https://api.pandascore.co/csgo/players/${identifier}/stats?token=${PANDASCORE_API_KEY}`;
    const statsResponse = await fetch(statsUrl);

    if (!statsResponse.ok) {
      console.error(`❌ Erro na API PandaScore: ${statsResponse.status}`);
      return NextResponse.json(
        { error: "Erro ao buscar estatísticas do jogador" },
        { status: statsResponse.status }
      );
    }

    const playerStats = await statsResponse.json();
    console.log(`✅ Estatísticas encontradas para ${playerStats.name}`);

    // Formatar dados para o frontend
    const formattedStats = {
      playerId: playerStats.id,
      playerName: playerStats.name,
      playerSlug: playerStats.slug,
      team: playerStats.teams?.[0] || null,
      nationality: playerStats.nationality,
      age: playerStats.age,
      imageUrl: playerStats.image_url,

      // Estatísticas de performance
      stats: {
        killsPerMatch: playerStats.stats?.per_game_averages?.kills || 0,
        deathsPerMatch: playerStats.stats?.per_game_averages?.deaths || 0,
        assistsPerMatch: playerStats.stats?.per_game_averages?.assists || 0,
        kdRatio: playerStats.stats?.per_game_averages?.k_d_diff || 0,
        rating: playerStats.stats?.per_game_averages?.hltv_game_rating || 0,
        headshotPercentage:
          playerStats.stats?.per_game_averages?.headshots || 0,
        adr: playerStats.stats?.per_game_averages?.adr || 0,
        kast: playerStats.stats?.per_game_averages?.kast || 0,

        // Estatísticas totais
        totalKills: playerStats.stats?.counts?.kills || 0,
        totalDeaths: playerStats.stats?.counts?.deaths || 0,
        totalAssists: playerStats.stats?.counts?.assists || 0,
        matchesPlayed: playerStats.stats?.counts?.matches_played || 0,
        matchesWon: playerStats.stats?.counts?.matches_won || 0,
        matchesLost: playerStats.stats?.counts?.matches_lost || 0,
        winRate:
          playerStats.stats?.counts?.matches_played > 0
            ? (playerStats.stats.counts.matches_won /
                playerStats.stats.counts.matches_played) *
              100
            : 0,
      },

      // Últimos jogos (se disponíveis)
      recentMatches: playerStats.last_games || [],

      // Timestamp da última atualização
      lastUpdated: playerStats.modified_at,
      dataSource: "PandaScore API",
    };

    return NextResponse.json({
      success: true,
      data: formattedStats,
    });
  } catch (error: any) {
    console.error("Erro na API player-stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

// POST endpoint para buscar múltiplos jogadores de um time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamName } = body;

    if (!teamName) {
      return NextResponse.json(
        { error: "Parâmetro obrigatório: teamName" },
        { status: 400 }
      );
    }

    console.log(`🎯 Buscando jogadores do time: ${teamName}`);

    // Primeiro buscar o time
    const teamsUrl = `https://api.pandascore.co/csgo/teams?token=${PANDASCORE_API_KEY}&filter[name]=${encodeURIComponent(
      teamName
    )}`;
    const teamsResponse = await fetch(teamsUrl);

    if (!teamsResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar time" },
        { status: teamsResponse.status }
      );
    }

    const teams = await teamsResponse.json();

    // Encontrar o time correto (priorizar o que tem jogadores)
    const targetTeam =
      teams.find((team: any) => team.players && team.players.length > 0) ||
      teams[0];

    if (!targetTeam || !targetTeam.players || targetTeam.players.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: `Time ${teamName} encontrado, mas sem jogadores cadastrados`,
      });
    }

    console.log(
      `✅ Time encontrado: ${targetTeam.name} com ${targetTeam.players.length} jogadores`
    );

    // Buscar estatísticas de cada jogador
    const playersStats = [];

    for (const player of targetTeam.players) {
      try {
        console.log(`📊 Buscando stats de ${player.name}...`);

        const statsUrl = `https://api.pandascore.co/csgo/players/${player.id}/stats?token=${PANDASCORE_API_KEY}`;
        const statsResponse = await fetch(statsUrl);

        if (statsResponse.ok) {
          const playerStats = await statsResponse.json();

          playersStats.push({
            playerId: player.id,
            playerName: player.name,
            playerSlug: player.slug,
            team: targetTeam.name,
            nationality: player.nationality,
            age: player.age,
            imageUrl: player.image_url,

            // Estatísticas formatadas
            stats: {
              killsPerMatch: playerStats.stats?.per_game_averages?.kills || 0,
              deathsPerMatch: playerStats.stats?.per_game_averages?.deaths || 0,
              assistsPerMatch:
                playerStats.stats?.per_game_averages?.assists || 0,
              kdRatio: playerStats.stats?.per_game_averages?.k_d_diff || 0,
              rating:
                playerStats.stats?.per_game_averages?.hltv_game_rating || 0,
              headshotPercentage:
                playerStats.stats?.per_game_averages?.headshots || 0,
              adr: playerStats.stats?.per_game_averages?.adr || 0,
              kast: playerStats.stats?.per_game_averages?.kast || 0,

              // Totais
              totalKills: playerStats.stats?.counts?.kills || 0,
              totalDeaths: playerStats.stats?.counts?.deaths || 0,
              matchesPlayed: playerStats.stats?.counts?.matches_played || 0,
              matchesWon: playerStats.stats?.counts?.matches_won || 0,
              winRate:
                playerStats.stats?.counts?.matches_played > 0
                  ? (playerStats.stats.counts.matches_won /
                      playerStats.stats.counts.matches_played) *
                    100
                  : 0,
            },

            clutchesPerMatch: 0, // Calcular baseado em dados disponíveis
            lastUpdated: player.modified_at,
          });
        } else {
          console.warn(`⚠️ Não foi possível buscar stats de ${player.name}`);
          // Adicionar jogador sem estatísticas
          playersStats.push({
            playerId: player.id,
            playerName: player.name,
            playerSlug: player.slug,
            team: targetTeam.name,
            nationality: player.nationality,
            age: player.age,
            imageUrl: player.image_url,
            stats: {
              killsPerMatch: 0,
              deathsPerMatch: 0,
              assistsPerMatch: 0,
              kdRatio: 0,
              rating: 0,
              headshotPercentage: 0,
              adr: 0,
              kast: 0,
              totalKills: 0,
              totalDeaths: 0,
              matchesPlayed: 0,
              matchesWon: 0,
              winRate: 0,
            },
            clutchesPerMatch: 0,
            lastUpdated: player.modified_at,
          });
        }

        // Pequena pausa para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erro ao buscar stats de ${player.name}:`, error);
        continue;
      }
    }

    console.log(
      `✅ Retornando estatísticas de ${playersStats.length} jogadores`
    );

    return NextResponse.json({
      success: true,
      data: playersStats,
      team: {
        id: targetTeam.id,
        name: targetTeam.name,
        acronym: targetTeam.acronym,
        location: targetTeam.location,
      },
      metadata: {
        totalPlayers: playersStats.length,
        dataSource: "PandaScore API",
        requestedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro na API player-stats POST:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
