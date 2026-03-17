import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CSGOBatchCollector {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Coleta todos os jogos CS:GO futuros e salva no banco
   * Deve ser executado uma vez por dia
   */
  async collectUpcomingMatches(): Promise<{
    success: boolean;
    collected: number;
    updated: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      collected: 0,
      updated: 0,
      errors: [] as string[],
    };

    try {
      console.log("🎮 Iniciando coleta batch de jogos CS:GO...");

      // 1. Buscar jogos da API REST (mais confiável que WebSocket)
      const matches = await this.fetchMatchesFromAPI();

      if (matches.length === 0) {
        console.log("⚠️ Nenhum jogo encontrado na API");
        result.success = true;
        return result;
      }

      console.log(`📊 Encontrados ${matches.length} jogos na API`);

      // 2. Processar e salvar cada jogo
      for (const matchData of matches) {
        try {
          await this.saveMatch(matchData);
          result.collected++;
        } catch (error) {
          console.error(`❌ Erro ao salvar jogo ${matchData.game}:`, error);
          result.errors.push(`Erro ao salvar ${matchData.game}: ${error}`);
        }
      }

      // 3. Limpar jogos antigos (mais de 30 dias)
      const cleaned = await this.cleanupOldMatches();
      console.log(`🧹 Limpos ${cleaned} jogos antigos`);

      result.success = true;
      console.log(
        `✅ Coleta batch concluída: ${result.collected} jogos coletados`
      );
    } catch (error) {
      console.error("❌ Erro na coleta batch:", error);
      result.errors.push(`Erro geral: ${error}`);
    }

    return result;
  }

  /**
   * Busca jogos da API REST (mais confiável que WebSocket)
   */
  private async fetchMatchesFromAPI(): Promise<any[]> {
    try {
      // Usar endpoint REST da Spro Agency
      const response = await fetch(
        `https://spro.agency/api/get_games?key=${this.apiKey}`,
        {
          headers: {
            "User-Agent": "CSGO-Scout-Batch-Collector/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Filtrar apenas jogos de CS:GO (CSL) e futuros
      const csgoMatches = data.filter(
        (match: any) =>
          match.sport === "CSL" && new Date(match.time) > new Date()
      );

      return csgoMatches;
    } catch (error) {
      console.error("❌ Erro ao buscar jogos da API:", error);
      return [];
    }
  }

  /**
   * Salva um jogo no banco de dados
   */
  private async saveMatch(matchData: any): Promise<void> {
    // Extrair informações do jogo
    const gameInfo = this.parseGameInfo(matchData.game);
    if (!gameInfo) {
      throw new Error(
        `Não foi possível extrair informações do jogo: ${matchData.game}`
      );
    }

    // Usar any para contornar problemas do Prisma client
    const prismaAny = prisma as any;

    // Salvar/atualizar jogo
    const match = await prismaAny.cSGOMatch.upsert({
      where: { externalId: matchData.universal_id || matchData.game },
      update: {
        gameName: matchData.game,
        homeTeam: gameInfo.homeTeam,
        awayTeam: gameInfo.awayTeam,
        tournament: gameInfo.tournament,
        scheduledAt: gameInfo.scheduledAt,
        status: "scheduled",
        updatedAt: new Date(),
      },
      create: {
        externalId: matchData.universal_id || matchData.game,
        gameName: matchData.game,
        homeTeam: gameInfo.homeTeam,
        awayTeam: gameInfo.awayTeam,
        tournament: gameInfo.tournament,
        scheduledAt: gameInfo.scheduledAt,
        status: "scheduled",
        sport: "CSL",
      },
    });

    // Salvar odds se disponíveis
    if (matchData.outcomes && Array.isArray(matchData.outcomes)) {
      await this.saveMatchOdds(match.id, matchData.outcomes);
    }
  }

  /**
   * Salva as odds de um jogo
   */
  private async saveMatchOdds(matchId: string, outcomes: any[]): Promise<void> {
    const prismaAny = prisma as any;

    for (const outcome of outcomes) {
      // Calcular probabilidade implícita
      const impliedProbability = this.calculateImpliedProbability(outcome.odds);

      try {
        // Salvar odds atuais
        await prismaAny.cSGOOdds.upsert({
          where: {
            matchId_sportsbook_market_outcomeName: {
              matchId,
              sportsbook: outcome.sportsbook || "unknown",
              market: outcome.outcome_name || "Moneyline",
              outcomeName:
                outcome.outcome_name || outcome.outcome_target || "Unknown",
            },
          },
          update: {
            outcomeTarget: outcome.outcome_target,
            outcomeLine: outcome.outcome_line,
            odds: outcome.odds,
            impliedProbability,
            timestamp: new Date(),
          },
          create: {
            matchId,
            sportsbook: outcome.sportsbook || "unknown",
            market: outcome.outcome_name || "Moneyline",
            outcomeName:
              outcome.outcome_name || outcome.outcome_target || "Unknown",
            outcomeTarget: outcome.outcome_target,
            outcomeLine: outcome.outcome_line,
            odds: outcome.odds,
            impliedProbability,
          },
        });

        // Salvar no histórico
        await prismaAny.cSGOOddsHistory.create({
          data: {
            matchId,
            sportsbook: outcome.sportsbook || "unknown",
            market: outcome.outcome_name || "Moneyline",
            outcomeName:
              outcome.outcome_name || outcome.outcome_target || "Unknown",
            odds: outcome.odds,
          },
        });
      } catch (error) {
        console.error(
          `❌ Erro ao salvar odds para ${outcome.outcome_name}:`,
          error
        );
      }
    }
  }

  /**
   * Faz parse das informações do jogo
   */
  private parseGameInfo(gameString: string): {
    homeTeam: string;
    awayTeam: string;
    tournament?: string;
    scheduledAt: Date;
  } | null {
    try {
      // Exemplo: "FaZe Clan vs Natus Vincere, 2025-11-24, 15"
      const parts = gameString.split(", ");
      if (parts.length < 2) return null;

      const teamsPart = parts[0]; // "FaZe Clan vs Natus Vincere"
      const datePart = parts[1]; // "2025-11-24"
      const timePart = parts[2]; // "15"

      const teams = teamsPart.split(" vs ");
      if (teams.length !== 2) return null;

      // Criar data/hora
      const scheduledAt = new Date(`${datePart}T${timePart}:00:00Z`);

      return {
        homeTeam: teams[0].trim(),
        awayTeam: teams[1].trim(),
        scheduledAt,
      };
    } catch (error) {
      console.error("❌ Erro ao fazer parse do jogo:", error);
      return null;
    }
  }

  /**
   * Calcula probabilidade implícita das odds
   */
  private calculateImpliedProbability(odds: string): number | null {
    try {
      const oddsNum = parseFloat(odds);

      if (oddsNum > 0) {
        // Odds americanas positivas: 100 / (odds + 100)
        return 100 / (oddsNum + 100);
      } else {
        // Odds americanas negativas: |odds| / (|odds| + 100)
        return Math.abs(oddsNum) / (Math.abs(oddsNum) + 100);
      }
    } catch {
      return null;
    }
  }

  /**
   * Limpa jogos antigos (mais de 30 dias)
   */
  private async cleanupOldMatches(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const prismaAny = prisma as any;
      const result = await prismaAny.cSGOMatch.deleteMany({
        where: {
          scheduledAt: {
            lt: thirtyDaysAgo,
          },
          status: {
            in: ["finished", "cancelled"],
          },
        },
      });

      return result.count || 0;
    } catch (error) {
      console.error("❌ Erro ao limpar jogos antigos:", error);
      return 0;
    }
  }

  /**
   * Busca jogos dos próximos dias (para a interface)
   */
  async getUpcomingMatches(days: number = 2): Promise<any[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      const prismaAny = prisma as any;
      const matches = await prismaAny.cSGOMatch.findMany({
        where: {
          scheduledAt: {
            gte: now,
            lte: futureDate,
          },
          status: "scheduled",
        },
        include: {
          odds: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
              },
            },
            orderBy: {
              timestamp: "desc",
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

      return matches;
    } catch (error) {
      console.error("❌ Erro ao buscar jogos futuros:", error);
      return [];
    }
  }
}
