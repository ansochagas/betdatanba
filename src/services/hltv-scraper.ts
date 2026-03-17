import NodeCache from "node-cache";

interface PlayerStats {
  playerId: number;
  playerName: string;
  teamName: string;
  recentMatches: Array<{
    matchId: number;
    opponent: string;
    date: string;
    map: string;
    kills: number;
    deaths: number;
    assists: number;
    kdRatio: number;
    rating: number;
    headshotPercentage: number;
    firstBloods: number;
    clutches: {
      "1v1": number;
      "1v2": number;
      "1v3": number;
      "1v4": number;
      "1v5": number;
    };
  }>;
  averages: {
    killsPerMatch: number;
    deathsPerMatch: number;
    assistsPerMatch: number;
    kdRatio: number;
    rating: number;
    headshotPercentage: number;
    clutchesPerMatch: number;
  };
}

export class HLTVScraper {
  private cache: NodeCache;

  constructor() {
    // Cache por 2 horas
    this.cache = new NodeCache({ stdTTL: 2 * 60 * 60 * 1000 });
  }

  async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    const cacheKey = `player_${playerId}`;

    // Verificar cache
    const cached = this.cache.get<PlayerStats>(cacheKey);
    if (cached) {
      console.log(`📦 Dados do cache para player ${playerId}`);
      return cached;
    }

    // Dados mockados realistas baseados em estatísticas reais do HLTV
    const mockData: { [key: number]: PlayerStats } = {
      9216: {
        // Fallen (FURIA)
        playerId: 9216,
        playerName: "Gabriel Toledo",
        teamName: "FURIA",
        recentMatches: [
          {
            matchId: 1,
            opponent: "Ninjas in Pyjamas",
            date: "2025-11-27",
            map: "Mirage",
            kills: 18,
            deaths: 12,
            assists: 3,
            kdRatio: 1.5,
            rating: 1.15,
            headshotPercentage: 35,
            firstBloods: 2,
            clutches: { "1v1": 1, "1v2": 0, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
          {
            matchId: 2,
            opponent: "Fluxo",
            date: "2025-11-26",
            map: "Inferno",
            kills: 22,
            deaths: 15,
            assists: 4,
            kdRatio: 1.47,
            rating: 1.22,
            headshotPercentage: 40,
            firstBloods: 3,
            clutches: { "1v1": 0, "1v2": 1, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
          {
            matchId: 3,
            opponent: "FaZe Clan",
            date: "2025-11-25",
            map: "Dust2",
            kills: 16,
            deaths: 18,
            assists: 2,
            kdRatio: 0.89,
            rating: 0.95,
            headshotPercentage: 25,
            firstBloods: 1,
            clutches: { "1v1": 0, "1v2": 0, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
        ],
        averages: {
          killsPerMatch: 18.67,
          deathsPerMatch: 15,
          assistsPerMatch: 3,
          kdRatio: 1.28,
          rating: 1.11,
          headshotPercentage: 33.33,
          clutchesPerMatch: 0.67,
        },
      },
      8564: {
        // yuurih (FURIA)
        playerId: 8564,
        playerName: "Yuri Santos",
        teamName: "FURIA",
        recentMatches: [
          {
            matchId: 1,
            opponent: "Ninjas in Pyjamas",
            date: "2025-11-27",
            map: "Mirage",
            kills: 20,
            deaths: 14,
            assists: 5,
            kdRatio: 1.43,
            rating: 1.18,
            headshotPercentage: 30,
            firstBloods: 1,
            clutches: { "1v1": 0, "1v2": 0, "1v3": 1, "1v4": 0, "1v5": 0 },
          },
          {
            matchId: 2,
            opponent: "Fluxo",
            date: "2025-11-26",
            map: "Inferno",
            kills: 19,
            deaths: 16,
            assists: 3,
            kdRatio: 1.19,
            rating: 1.08,
            headshotPercentage: 28,
            firstBloods: 2,
            clutches: { "1v1": 1, "1v2": 0, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
        ],
        averages: {
          killsPerMatch: 19.5,
          deathsPerMatch: 15,
          assistsPerMatch: 4,
          kdRatio: 1.31,
          rating: 1.13,
          headshotPercentage: 29,
          clutchesPerMatch: 0.5,
        },
      },
      2023: {
        // KSCERATO (FURIA)
        playerId: 2023,
        playerName: "Kaike Cerato",
        teamName: "FURIA",
        recentMatches: [
          {
            matchId: 1,
            opponent: "Ninjas in Pyjamas",
            date: "2025-11-27",
            map: "Mirage",
            kills: 15,
            deaths: 13,
            assists: 6,
            kdRatio: 1.15,
            rating: 1.05,
            headshotPercentage: 20,
            firstBloods: 0,
            clutches: { "1v1": 0, "1v2": 0, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
        ],
        averages: {
          killsPerMatch: 15,
          deathsPerMatch: 13,
          assistsPerMatch: 6,
          kdRatio: 1.15,
          rating: 1.05,
          headshotPercentage: 20,
          clutchesPerMatch: 0,
        },
      },
      9217: {
        // chelo (FURIA)
        playerId: 9217,
        playerName: "Marcelo Cespedes",
        teamName: "FURIA",
        recentMatches: [
          {
            matchId: 1,
            opponent: "Ninjas in Pyjamas",
            date: "2025-11-27",
            map: "Mirage",
            kills: 17,
            deaths: 16,
            assists: 4,
            kdRatio: 1.06,
            rating: 1.02,
            headshotPercentage: 45,
            firstBloods: 1,
            clutches: { "1v1": 0, "1v2": 0, "1v3": 0, "1v4": 0, "1v5": 0 },
          },
        ],
        averages: {
          killsPerMatch: 17,
          deathsPerMatch: 16,
          assistsPerMatch: 4,
          kdRatio: 1.06,
          rating: 1.02,
          headshotPercentage: 45,
          clutchesPerMatch: 0,
        },
      },
    };

    const playerStats = mockData[playerId];

    if (playerStats) {
      // Salvar no cache
      this.cache.set(cacheKey, playerStats);
      console.log(
        `✅ Dados mockados retornados para player ${playerId} (${playerStats.playerName})`
      );
      return playerStats;
    }

    console.log(`❌ Player ${playerId} não encontrado nos dados mockados`);
    return null;
  }
}
