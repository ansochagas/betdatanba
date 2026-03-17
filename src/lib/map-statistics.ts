export interface MapStats {
  name: string;
  played: number;
  won: number;
  winRate: number;
  totalRounds: number;
  avgRounds: number;
  winsBy3Plus: number;
  winsBy5Plus: number;
  dominantWinRate: number;
  recentForm: string[]; // Últimos resultados neste mapa
}

export interface RoundDistribution {
  winsBy5Plus: number; // Vitórias por +5 rounds
  winsBy3To4: number; // Vitórias por +3 a +4 rounds
  winsBy1To2: number; // Vitórias por +1 a +2 rounds
  losses: number; // Derrotas
  totalGames: number; // Total de jogos
}

export interface OpponentLevelStats {
  vsTop: {
    games: number;
    wins: number;
    winRate: number;
    avgRounds: number;
    dominantWins: number;
    dominantWinRate: number;
  };
  vsMedium: {
    games: number;
    wins: number;
    winRate: number;
    avgRounds: number;
    dominantWins: number;
    dominantWinRate: number;
  };
  vsLow: {
    games: number;
    wins: number;
    winRate: number;
    avgRounds: number;
    dominantWins: number;
    dominantWinRate: number;
  };
}

export class MapStatisticsCalculator {
  /**
   * Calcula estatísticas detalhadas por mapa nos últimos jogos
   */
  static calculateMapStats(games: any[], teamName: string): MapStats[] {
    const mapData: { [key: string]: any } = {};

    games.forEach((game) => {
      if (!game.maps || !Array.isArray(game.maps)) return;

      game.maps.forEach((map: any) => {
        if (!map.name || !map.score || !map.winner) return;

        if (!mapData[map.name]) {
          mapData[map.name] = {
            name: map.name,
            played: 0,
            won: 0,
            totalRounds: 0,
            winsBy3Plus: 0,
            winsBy5Plus: 0,
            recentForm: [],
          };
        }

        const stats = mapData[map.name];
        stats.played++;

        // Calcular rounds do placar
        const [score1, score2] = map.score
          .split("-")
          .map((s: string) => parseInt(s) || 0);
        const totalRounds = score1 + score2;
        stats.totalRounds += totalRounds;

        // Verificar se ganhou
        const isWin = map.winner === teamName;
        if (isWin) {
          stats.won++;

          // Calcular diferença de rounds
          const difference = Math.abs(score1 - score2);
          if (difference >= 5) stats.winsBy5Plus++;
          else if (difference >= 3) stats.winsBy3Plus++;
        }

        // Adicionar ao recent form (W/L)
        stats.recentForm.push(isWin ? "W" : "L");
      });
    });

    // Converter para array final e calcular percentuais
    return Object.values(mapData)
      .map((data: any) => ({
        ...data,
        winRate:
          data.played > 0 ? Number((data.won / data.played).toFixed(3)) : 0,
        avgRounds:
          data.played > 0
            ? Number((data.totalRounds / data.played).toFixed(1))
            : 0,
        dominantWinRate:
          data.played > 0
            ? Number(
                ((data.winsBy3Plus + data.winsBy5Plus) / data.played).toFixed(3)
              )
            : 0,
        recentForm: data.recentForm.slice(-5), // Últimos 5 resultados
      }))
      .sort((a, b) => b.played - a.played); // Ordenar por jogos jogados
  }

  /**
   * Calcula distribuição de vitórias por diferença de rounds
   */
  static calculateRoundDistribution(
    games: any[],
    teamName: string
  ): RoundDistribution {
    const distribution = {
      winsBy5Plus: 0,
      winsBy3To4: 0,
      winsBy1To2: 0,
      losses: 0,
      totalGames: 0,
    };

    games.forEach((game) => {
      if (!game.maps || !Array.isArray(game.maps)) return;

      game.maps.forEach((map: any) => {
        if (!map.score || !map.winner) return;

        distribution.totalGames++;

        const [score1, score2] = map.score
          .split("-")
          .map((s: string) => parseInt(s) || 0);
        const difference = Math.abs(score1 - score2);

        if (map.winner === teamName) {
          if (difference >= 5) distribution.winsBy5Plus++;
          else if (difference >= 3) distribution.winsBy3To4++;
          else if (difference >= 1) distribution.winsBy1To2++;
        } else {
          distribution.losses++;
        }
      });
    });

    return distribution;
  }

  /**
   * Calcula performance contra diferentes níveis de adversário
   */
  static calculateOpponentLevelStats(
    games: any[],
    teamName: string
  ): OpponentLevelStats {
    const stats = {
      vsTop: { games: 0, wins: 0, totalRounds: 0, dominantWins: 0 },
      vsMedium: { games: 0, wins: 0, totalRounds: 0, dominantWins: 0 },
      vsLow: { games: 0, wins: 0, totalRounds: 0, dominantWins: 0 },
    };

    games.forEach((game) => {
      if (!game.maps || !Array.isArray(game.maps)) return;

      // Determinar nível do adversário
      const opponent = game.opponents?.find(
        (opp: any) => opp.opponent.name !== teamName
      );
      if (!opponent) return;

      const opponentTier = this.getOpponentTier(opponent.opponent.name);
      const statKey = `vs${
        opponentTier.charAt(0).toUpperCase() + opponentTier.slice(1)
      }` as keyof typeof stats;

      game.maps.forEach((map: any) => {
        if (!map.score || !map.winner) return;

        const [score1, score2] = map.score
          .split("-")
          .map((s: string) => parseInt(s) || 0);
        const totalRounds = score1 + score2;
        const difference = Math.abs(score1 - score2);

        stats[statKey].games++;
        stats[statKey].totalRounds += totalRounds;

        if (map.winner === teamName) {
          stats[statKey].wins++;
          if (difference >= 3) stats[statKey].dominantWins++;
        }
      });
    });

    // Calcular percentuais finais
    return {
      vsTop: {
        games: stats.vsTop.games,
        wins: stats.vsTop.wins,
        winRate:
          stats.vsTop.games > 0
            ? Number((stats.vsTop.wins / stats.vsTop.games).toFixed(3))
            : 0,
        avgRounds:
          stats.vsTop.games > 0
            ? Number((stats.vsTop.totalRounds / stats.vsTop.games).toFixed(1))
            : 0,
        dominantWins: stats.vsTop.dominantWins,
        dominantWinRate:
          stats.vsTop.games > 0
            ? Number((stats.vsTop.dominantWins / stats.vsTop.games).toFixed(3))
            : 0,
      },
      vsMedium: {
        games: stats.vsMedium.games,
        wins: stats.vsMedium.wins,
        winRate:
          stats.vsMedium.games > 0
            ? Number((stats.vsMedium.wins / stats.vsMedium.games).toFixed(3))
            : 0,
        avgRounds:
          stats.vsMedium.games > 0
            ? Number(
                (stats.vsMedium.totalRounds / stats.vsMedium.games).toFixed(1)
              )
            : 0,
        dominantWins: stats.vsMedium.dominantWins,
        dominantWinRate:
          stats.vsMedium.games > 0
            ? Number(
                (stats.vsMedium.dominantWins / stats.vsMedium.games).toFixed(3)
              )
            : 0,
      },
      vsLow: {
        games: stats.vsLow.games,
        wins: stats.vsLow.wins,
        winRate:
          stats.vsLow.games > 0
            ? Number((stats.vsLow.wins / stats.vsLow.games).toFixed(3))
            : 0,
        avgRounds:
          stats.vsLow.games > 0
            ? Number((stats.vsLow.totalRounds / stats.vsLow.games).toFixed(1))
            : 0,
        dominantWins: stats.vsLow.dominantWins,
        dominantWinRate:
          stats.vsLow.games > 0
            ? Number((stats.vsLow.dominantWins / stats.vsLow.games).toFixed(3))
            : 0,
      },
    };
  }

  /**
   * Determina o tier de um adversário (simplificado)
   */
  private static getOpponentTier(
    opponentName: string
  ): "top" | "medium" | "low" {
    // Usar o mesmo sistema de ranking
    const { TeamRankingSystem } = require("./team-ranking");
    return TeamRankingSystem.classifyTeam(opponentName);
  }

  /**
   * Calcula estatísticas gerais do time
   */
  static calculateOverallStats(games: any[], teamName: string) {
    const totalGames = games.length;
    const wins = games.filter((game) => game.winner?.name === teamName).length;
    const winRate = totalGames > 0 ? Number((wins / totalGames).toFixed(3)) : 0;

    const totalMaps = games.reduce(
      (sum, game) => sum + (game.maps?.length || 0),
      0
    );

    return {
      gamesPlayed: totalGames,
      wins,
      losses: totalGames - wins,
      winRate,
      totalMaps,
      avgMapsPerGame:
        totalGames > 0 ? Number((totalMaps / totalGames).toFixed(1)) : 0,
    };
  }
}
