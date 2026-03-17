import { SproAgencyAPI } from "../api/sproAgencyAPI";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CSGODataCollector {
  private sproAPI: SproAgencyAPI;
  private collecting = false;

  constructor(apiKey: string) {
    this.sproAPI = new SproAgencyAPI(apiKey);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.sproAPI.on("connected", () => {
      console.log("🎯 CSGO Data Collector: Conectado à API");
    });

    this.sproAPI.on("initialState", async (data) => {
      console.log("📊 CSGO Data Collector: Recebendo estado inicial");
      await this.processMatchData(data);
    });

    this.sproAPI.on("gameUpdate", async (data) => {
      console.log("🔄 CSGO Data Collector: Jogo atualizado");
      await this.processMatchData(data);
    });

    this.sproAPI.on("lineUpdate", async (data) => {
      console.log("📈 CSGO Data Collector: Linha atualizada");
      await this.processOddsData(data);
    });

    this.sproAPI.on("gameRemoved", async (data) => {
      console.log("🗑️ CSGO Data Collector: Jogo removido");
      await this.updateMatchStatus(data, "cancelled");
    });

    this.sproAPI.on("error", (message) => {
      console.error("❌ CSGO Data Collector: Erro:", message);
    });
  }

  async startCollecting(): Promise<void> {
    if (this.collecting) {
      console.log("⚠️ CSGO Data Collector já está rodando");
      return;
    }

    try {
      console.log("🚀 Iniciando CSGO Data Collector...");
      this.collecting = true;

      await this.sproAPI.connect();
      await this.sproAPI.subscribeToCSGO();

      console.log("✅ CSGO Data Collector iniciado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao iniciar CSGO Data Collector:", error);
      this.collecting = false;
      throw error;
    }
  }

  async stopCollecting(): Promise<void> {
    console.log("🛑 Parando CSGO Data Collector...");
    this.sproAPI.disconnect();
    this.collecting = false;
  }

  private async processMatchData(data: any): Promise<void> {
    try {
      // Verificar se é um jogo de CS:GO (CSL)
      if (data.sport !== "CSL") {
        return; // Ignorar jogos de outros esportes
      }

      console.log(`🎮 Processando jogo CS:GO: ${data.game}`);

      // Extrair informações do jogo
      const gameInfo = this.parseGameInfo(data.game);
      if (!gameInfo) {
        console.warn(
          "⚠️ Não foi possível extrair informações do jogo:",
          data.game
        );
        return;
      }

      // Usar any para contornar problemas do Prisma client
      const prismaAny = prisma as any;

      // Salvar/atualizar jogo no banco
      const match = await prismaAny.cSGOMatch.upsert({
        where: { externalId: data.universal_id || data.game },
        update: {
          gameName: data.game,
          homeTeam: gameInfo.homeTeam,
          awayTeam: gameInfo.awayTeam,
          tournament: gameInfo.tournament,
          scheduledAt: gameInfo.scheduledAt,
          status: this.determineMatchStatus(data),
          updatedAt: new Date(),
        },
        create: {
          externalId: data.universal_id || data.game,
          gameName: data.game,
          homeTeam: gameInfo.homeTeam,
          awayTeam: gameInfo.awayTeam,
          tournament: gameInfo.tournament,
          scheduledAt: gameInfo.scheduledAt,
          status: this.determineMatchStatus(data),
          sport: "CSL",
        },
      });

      console.log(`✅ Jogo salvo: ${match.homeTeam} vs ${match.awayTeam}`);

      // Processar odds se disponíveis
      if (data.outcomes) {
        await this.processOddsData(data, match.id);
      }
    } catch (error) {
      console.error("❌ Erro ao processar dados do jogo:", error);
    }
  }

  private async processOddsData(data: any, matchId?: string): Promise<void> {
    try {
      if (!data.outcomes || !matchId) return;

      const sportsbook = data.sportsbook || "unknown";
      const prismaAny = prisma as any;

      for (const [outcomeKey, outcomeData] of Object.entries(data.outcomes)) {
        const outcome = outcomeData as any;

        // Calcular probabilidade implícita
        const impliedProbability = this.calculateImpliedProbability(
          outcome.odds
        );

        // Salvar odds atuais
        await prismaAny.cSGOOdds.upsert({
          where: {
            matchId_sportsbook_market_outcomeName: {
              matchId,
              sportsbook,
              market: outcome.outcome_name || "Moneyline",
              outcomeName: outcome.outcome_name || outcomeKey,
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
            sportsbook,
            market: outcome.outcome_name || "Moneyline",
            outcomeName: outcome.outcome_name || outcomeKey,
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
            sportsbook,
            market: outcome.outcome_name || "Moneyline",
            outcomeName: outcome.outcome_name || outcomeKey,
            odds: outcome.odds,
          },
        });
      }

      console.log(`💰 Odds atualizadas para ${sportsbook}`);
    } catch (error) {
      console.error("❌ Erro ao processar odds:", error);
    }
  }

  private async updateMatchStatus(data: any, status: string): Promise<void> {
    try {
      const externalId = data.universal_id || data.game;
      const prismaAny = prisma as any;
      await prismaAny.cSGOMatch.updateMany({
        where: { externalId },
        data: { status, updatedAt: new Date() },
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar status do jogo:", error);
    }
  }

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

  private determineMatchStatus(data: any): string {
    // Lógica básica para determinar status
    // Pode ser expandida com mais lógica depois
    return "scheduled";
  }

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

  // Método para buscar jogos dos próximos dias
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

  isCollecting(): boolean {
    return this.collecting;
  }
}
