import { NextRequest, NextResponse } from "next/server";
import { TeamRankingSystem } from "@/lib/team-ranking";
import { MapStatisticsCalculator } from "@/lib/map-statistics";

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamId = params.teamId;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "teamId é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`📊 Buscando estatísticas avançadas para time ID: ${teamId}`);

    // Buscar jogos finalizados do time via Pandascore (aumentar limite para garantir dados)
    const pandascoreUrl = `https://api.pandascore.co/csgo/matches?filter[opponent_id]=${teamId}&filter[status]=finished&sort=-begin_at&page[size]=20`;

    const response = await fetch(pandascoreUrl, {
      headers: {
        Authorization: `Bearer ${
          process.env.PANDASCORE_TOKEN ||
          "YpNRtsc43jMD6EH_JdXmbjyOorxQGuOMDlkuRmlGYALserFw0OM"
        }`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Erro na API Pandascore: ${response.status}`);
      return NextResponse.json(
        { success: false, error: "Erro ao buscar dados do Pandascore" },
        { status: response.status }
      );
    }

    let allGames = await response.json();
    console.log(`✅ Encontrados ${allGames.length} jogos brutos`);

    // Filtrar apenas jogos que têm dados de mapas
    const gamesWithMaps = allGames.filter(
      (game: any) =>
        game.maps && Array.isArray(game.maps) && game.maps.length > 0
    );

    console.log(`🎯 Jogos com dados de mapas: ${gamesWithMaps.length}`);

    // Estratégia: usar os 6 jogos mais recentes, mesmo que não tenham dados de mapas
    // Se temos jogos com mapas, priorizar eles. Senão, usar jogos sem mapas
    let games;
    if (gamesWithMaps.length >= 6) {
      games = gamesWithMaps.slice(0, 6);
      console.log(`✅ Usando 6 jogos com dados de mapas`);
    } else if (allGames.length >= 6) {
      games = allGames.slice(0, 6);
      console.log(`⚠️ Usando 6 jogos sem dados de mapas (fallback)`);
    } else {
      games = allGames.slice(0, Math.min(allGames.length, 6));
      console.log(`⚠️ Usando apenas ${games.length} jogos disponíveis`);
    }

    console.log(`✅ Selecionados ${games.length} jogos para análise`);
    const hasMapData = games.some(
      (game: any) => game.maps && game.maps.length > 0
    );

    if (games.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhum jogo encontrado para este time",
      });
    }

    // Extrair nome do time dos dados
    const teamName = games[0]?.opponents?.find(
      (opp: any) => opp.opponent.id === parseInt(teamId)
    )?.opponent.name;

    if (!teamName) {
      return NextResponse.json({
        success: false,
        error: "Não foi possível identificar o nome do time",
      });
    }

    console.log(`👥 Analisando time: ${teamName}`);

    // Calcular estatísticas
    const mapStats = MapStatisticsCalculator.calculateMapStats(games, teamName);
    const roundDistribution =
      MapStatisticsCalculator.calculateRoundDistribution(games, teamName);
    const opponentLevelStats =
      MapStatisticsCalculator.calculateOpponentLevelStats(games, teamName);
    const overallStats = MapStatisticsCalculator.calculateOverallStats(
      games,
      teamName
    );

    // Classificar time
    const ranking = TeamRankingSystem.classifyTeam(
      teamName,
      overallStats.winRate
    );

    const result = {
      success: true,
      data: {
        teamId: parseInt(teamId),
        teamName,
        ranking,
        lastUpdated: new Date().toISOString(),

        // Estatísticas gerais
        overallStats,

        // Estatísticas por mapa
        mapStats,

        // Distribuição de rounds
        roundDistribution,

        // Performance por nível de adversário
        opponentLevelStats,

        // Metadados
        metadata: {
          gamesAnalyzed: games.length,
          mapsAnalyzed: mapStats.reduce((sum, map) => sum + map.played, 0),
          dataSource: "Pandascore API",
          analysisPeriod: "Últimos 6 jogos",
        },
      },
    };

    console.log(`✅ Estatísticas calculadas com sucesso para ${teamName}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro nas estatísticas avançadas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
