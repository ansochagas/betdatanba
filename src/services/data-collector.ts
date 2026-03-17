import { PinnacleClient, CsgoMatch } from "../lib/pinnacle-client";
import { prisma } from "../lib/prisma";
import { CacheService } from "./cache-service";

export class DataCollectorService {
  private client: PinnacleClient;
  private cacheService: CacheService;

  constructor() {
    this.client = new PinnacleClient();
    this.cacheService = new CacheService();
  }

  /**
   * Coleta e armazena jogos de CS:GO da Pinnacle API (usando cache)
   */
  async collectAndStoreMatches(): Promise<{
    success: boolean;
    collected: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      collected: 0,
      errors: [] as string[],
    };

    try {
      console.log(`🔄 Iniciando coleta de dados CS:GO (com cache)`);

      // Buscar dados do cache (ou API se expirado)
      const csgoMatches = await this.cacheService.getCsgoMatches();
      console.log(`📊 Dados recebidos: ${csgoMatches.length} jogos CS:GO`);

      if (csgoMatches.length === 0) {
        result.errors.push("Nenhum jogo de CS:GO encontrado");
        return result;
      }

      // Armazenar no banco (backup local)
      for (const match of csgoMatches) {
        try {
          await prisma.cSGOMatch.upsert({
            where: { externalId: match.id },
            update: {
              startTime: match.startTime,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              status: "scheduled",
              updatedAt: new Date(),
            },
            create: {
              externalId: match.id,
              eventId: "pinnacle-" + match.id,
              map: "TBD",
              duration: 0,
              startTime: match.startTime,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              status: "scheduled",
            },
          });
          result.collected++;
        } catch (error) {
          const errorMsg = `Erro ao armazenar jogo ${match.id}: ${
            (error as Error).message
          }`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.collected > 0;
      console.log(`✅ Coleta concluída: ${result.collected} jogos armazenados`);

      if (result.errors.length > 0) {
        console.log(`⚠️ ${result.errors.length} erros durante a coleta`);
      }

      return result;
    } catch (error) {
      const errorMsg = `Erro na coleta de dados: ${(error as Error).message}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Busca jogos futuros de CS:GO (através do cache)
   */
  async getUpcomingMatches(): Promise<CsgoMatch[]> {
    try {
      return await this.cacheService.getCsgoMatches();
    } catch (error) {
      console.error("Erro ao buscar jogos futuros:", error);
      throw error;
    }
  }

  /**
   * Busca jogos armazenados (backup local)
   */
  async getStoredMatches(limit: number = 20): Promise<any[]> {
    try {
      const matches = await prisma.cSGOMatch.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return matches.map((match) => ({
        id: match.id,
        externalId: match.externalId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: match.startTime,
        status: match.status,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      }));
    } catch (error) {
      console.error("Erro ao buscar jogos armazenados:", error);
      throw error;
    }
  }

  /**
   * Força atualização do cache
   */
  async refreshCache(): Promise<{
    success: boolean;
    collected: number;
    message: string;
  }> {
    return await this.cacheService.refreshCache();
  }

  /**
   * Status do cache
   */
  async getCacheStatus(): Promise<{
    hasCache: boolean;
    isValid: boolean;
    expiresAt?: Date;
    itemCount?: number;
    lastUpdated?: Date;
  }> {
    return await this.cacheService.getCacheStatus();
  }

  /**
   * Executa coleta periódica (para ser usado com cron jobs)
   */
  async runPeriodicCollection(): Promise<void> {
    console.log("⏰ Executando coleta periódica de dados CS:GO");

    const result = await this.collectAndStoreMatches();

    if (result.success) {
      console.log(`✅ Coleta periódica concluída: ${result.collected} jogos`);
    } else {
      console.error("❌ Falha na coleta periódica");
      result.errors.forEach((error) => console.error(`   ${error}`));
    }
  }
}
