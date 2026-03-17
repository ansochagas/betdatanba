import { PinnacleClient, CsgoMatch } from "../lib/pinnacle-client";
import { PandaScoreService } from "./pandascore-service";
import { advancedCache } from "./advanced-cache-service";

const DEV_FAST =
  process.env.FAST_DEV === "true" || process.env.NEXT_PUBLIC_FAST_DEV === "true";

const devMockMatches: CsgoMatch[] = [
  {
    id: "dev-1",
    league: "DEV League",
    homeTeam: "Team Alpha",
    awayTeam: "Team Beta",
    startTime: new Date(),
    odds: {
      moneyline: { home: 1.8, away: 2.0, draw: 9 },
    },
  },
  {
    id: "dev-2",
    league: "DEV League",
    homeTeam: "Team Gamma",
    awayTeam: "Team Delta",
    startTime: new Date(Date.now() + 3600 * 1000),
    odds: {
      moneyline: { home: 1.9, away: 1.9, draw: 8 },
    },
  },
];

export class CacheService {
  private client: PinnacleClient;
  private pandaScoreService: PandaScoreService;
  private readonly CACHE_KEY = "csgo_matches";
  private readonly HISTORICAL_CACHE_KEY = "csgo_historical_matches";

  constructor() {
    this.client = new PinnacleClient();
    this.pandaScoreService = new PandaScoreService();
  }

  /**
   * Busca jogos CS:GO com cache inteligente
   * - Cache válido por 1 hora
   * - Reduz requisições de N usuários para 1 por hora
   */
  async getCsgoMatches(): Promise<CsgoMatch[]> {
    try {
      // Modo r?pido de desenvolvimento: n?o bate em APIs externas
      if (DEV_FAST) {
        console.log("DEV_FAST ativo: retornando partidas mockadas");
        await advancedCache.set("pinnacle", this.CACHE_KEY, devMockMatches, {
          memory: 3600,
        });
        return devMockMatches;
      }

      // Verifica cache usando AdvancedCacheService
      const cached = await advancedCache.get<CsgoMatch[]>(
        "pinnacle",
        this.CACHE_KEY
      );
      if (cached) {
        console.log("✅ Dados retornados do cache avançado");
        return cached;
      }

      // Cache miss - busca da API
      console.log("🔄 Cache miss, buscando dados da Pinnacle API...");
      const matches = await this.client.getCsgoMatches();

      // Salva no cache avançado
      await advancedCache.set("pinnacle", this.CACHE_KEY, matches, {
        memory: 3600, // 1 hora em memória
        redis: 3600, // 1 hora no Redis
      });

      console.log(
        `✅ Dados atualizados: ${matches.length} jogos salvos no cache`
      );
      return matches;
    } catch (error) {
      console.error("❌ Erro no cache service:", error);

      // Fallback: tenta buscar dados mesmo se expirados
      try {
        // Como não temos método direto para dados expirados no AdvancedCache,
        // vamos tentar buscar novamente (pode retornar dados expirados se disponíveis)
        const fallbackData = await advancedCache.get<CsgoMatch[]>(
          "pinnacle",
          this.CACHE_KEY
        );
        if (fallbackData) {
          console.log("⚠️ Retornando dados do cache como fallback");
          return fallbackData;
        }
      } catch (fallbackError) {
        console.error("❌ Fallback também falhou:", fallbackError);
      }

      throw error;
    }
  }

  // Métodos antigos removidos - agora usam AdvancedCacheService

  /**
   * Força atualização do cache
   */
  async refreshCache(): Promise<{
    success: boolean;
    collected: number;
    message: string;
  }> {
    try {
      console.log("🔄 Forçando atualização do cache...");

      const matches = await this.client.getCsgoMatches();

      // Força refresh usando AdvancedCacheService
      await advancedCache.refreshData(
        "pinnacle",
        this.CACHE_KEY,
        async () => matches,
        { memory: 3600, redis: 3600 }
      );

      return {
        success: true,
        collected: matches.length,
        message: `Cache atualizado com ${matches.length} jogos`,
      };
    } catch (error) {
      console.error("Erro ao atualizar cache:", error);
      return {
        success: false,
        collected: 0,
        message: `Erro: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Limpa cache (para debug/admin)
   */
  async clearCache(): Promise<void> {
    try {
      await advancedCache.clear("pinnacle");
      console.log("🗑️ Cache Pinnacle limpo");
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
    }
  }

  /**
   * Busca jogos históricos CS:GO da PandaScore API (jogos finalizados)
   */
  async getHistoricalMatches(): Promise<CsgoMatch[]> {
    try {
      // Verifica cache usando AdvancedCacheService
      const cached = await advancedCache.get<CsgoMatch[]>(
        "panda",
        this.HISTORICAL_CACHE_KEY
      );
      if (cached) {
        console.log("✅ Dados históricos retornados do cache avançado");
        return cached;
      }

      // Cache miss - busca da PandaScore API
      console.log(
        "🔄 Cache miss, buscando dados históricos da PandaScore API..."
      );
      const pandaMatches = await this.pandaScoreService.getMatches({
        status: "finished",
        page: 1,
        perPage: 50,
      });

      // Converter para formato compatível com o sistema
      const csgoMatches: CsgoMatch[] = pandaMatches.map((match) =>
        this.convertPandaScoreMatch(match)
      );

      // Salva no cache avançado
      await advancedCache.set("panda", this.HISTORICAL_CACHE_KEY, csgoMatches, {
        memory: 1800, // 30 minutos em memória
        redis: 7200, // 2 horas no Redis
      });

      console.log(
        `✅ Dados históricos atualizados: ${csgoMatches.length} jogos salvos no cache`
      );
      return csgoMatches;
    } catch (error) {
      console.error("❌ Erro no cache histórico service:", error);

      // Fallback: tenta buscar dados mesmo se expirados
      try {
        const fallbackData = await advancedCache.get<CsgoMatch[]>(
          "panda",
          this.HISTORICAL_CACHE_KEY
        );
        if (fallbackData) {
          console.log("⚠️ Retornando dados históricos do cache como fallback");
          return fallbackData;
        }
      } catch (fallbackError) {
        console.error("❌ Fallback também falhou:", fallbackError);
      }

      throw error;
    }
  }

  /**
   * Converte dados PandaScore para formato CsgoMatch
   */
  private convertPandaScoreMatch(pandaMatch: any): CsgoMatch {
    return {
      id: pandaMatch.id.toString(),
      league: "CS:GO", // TODO: buscar nome real da liga se necessário
      homeTeam: pandaMatch.opponents[0]?.opponent.name || "TBD",
      awayTeam: pandaMatch.opponents[1]?.opponent.name || "TBD",
      startTime: new Date(pandaMatch.begin_at),
      odds: {}, // PandaScore não fornece odds diretamente
    };
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
    try {
      // Como o AdvancedCacheService não tem método direto para status,
      // vamos tentar buscar os dados e verificar se existem
      const data = await advancedCache.get<CsgoMatch[]>(
        "pinnacle",
        this.CACHE_KEY
      );

      if (!data) {
        return { hasCache: false, isValid: false };
      }

      // Como não temos acesso direto aos metadados de expiração,
      // assumimos que se os dados existem, são válidos
      return {
        hasCache: true,
        isValid: true,
        itemCount: data.length,
      };
    } catch (error) {
      console.error("Erro ao verificar status do cache:", error);
      return { hasCache: false, isValid: false };
    }
  }
}
