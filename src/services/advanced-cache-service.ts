import { createClient } from "redis";
import { CsgoMatch } from "@/types/csgo";

const FAST_DEV =
  process.env.FAST_DEV === "true" ||
  process.env.NEXT_PUBLIC_FAST_DEV === "true";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  expiresAt?: number;
}

interface CacheConfig {
  memoryTtl: number; // TTL em memória (segundos)
  redisTtl: number; // TTL no Redis (segundos)
  dbTtl: number; // TTL no database (segundos)
}

interface RedisStats {
  connected: boolean;
  info?: string;
}

export class AdvancedCacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private redisClient: any = null;
  private config: CacheConfig;
  private isRedisConnected = false;
  private redisInitPromise: Promise<void>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      memoryTtl: config.memoryTtl || 300, // 5 minutos em memória
      redisTtl: config.redisTtl || 3600, // 1 hora no Redis
      dbTtl: config.dbTtl || 86400, // 24 horas no DB
    };

    if (FAST_DEV || !process.env.REDIS_URL) {
      // Dev rápido: não tenta conectar ao Redis
      this.redisInitPromise = Promise.resolve();
      this.isRedisConnected = false;
    } else {
      this.redisInitPromise = this.initializeRedis();
    }
  }

  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          connectTimeout: 2000,
        },
      });

      await this.redisClient.connect();
      this.isRedisConnected = true;
    } catch (error: any) {
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }

  private generateKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(namespace, key);

    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data;
    }

    // Só tenta Redis se não estiver em modo FAST_DEV
    if (!FAST_DEV && this.isRedisConnected) {
      try {
        const redisData = await this.redisClient.get(cacheKey);
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData);
          if (!this.isExpired(entry)) {
            this.memoryCache.set(cacheKey, entry);
            return entry.data;
          } else {
            await this.redisClient.del(cacheKey);
          }
        }
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }

    return null;
  }

  async set<T>(
    namespace: string,
    key: string,
    data: T,
    customTtl?: { memory?: number; redis?: number; db?: number }
  ): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    const timestamp = Date.now();
    const memoryTtl = customTtl?.memory ?? this.config.memoryTtl;

    const entry: CacheEntry<T> = {
      data,
      timestamp,
      ttl: memoryTtl,
      expiresAt: timestamp + memoryTtl * 1000,
    };

    this.memoryCache.set(cacheKey, entry);

    // Só salva no Redis se não estiver em modo FAST_DEV
    if (!FAST_DEV && this.isRedisConnected) {
      try {
        const redisEntry: CacheEntry<T> = {
          ...entry,
          ttl: customTtl?.redis || this.config.redisTtl,
          expiresAt:
            entry.timestamp + (customTtl?.redis || this.config.redisTtl) * 1000,
        };

        await this.redisClient.setEx(
          cacheKey,
          redisEntry.ttl,
          JSON.stringify(redisEntry)
        );
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }
  }

  async delete(namespace: string, key: string): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    this.memoryCache.delete(cacheKey);

    if (!FAST_DEV && this.isRedisConnected) {
      try {
        await this.redisClient.del(cacheKey);
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const prefix = `${namespace}:`;

      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }

      if (!FAST_DEV && this.isRedisConnected) {
        try {
          const keys = await this.redisClient.keys(`${prefix}*`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        } catch (error: any) {
          // Silenciosamente ignora erros do Redis
        }
      }
    } else {
      this.memoryCache.clear();

      if (!FAST_DEV && this.isRedisConnected) {
        try {
          await this.redisClient.flushAll();
        } catch (error: any) {
          // Silenciosamente ignora erros do Redis
        }
      }
    }
  }

  async getStats(): Promise<{
    memory: { entries: number; size: string };
    redis: RedisStats;
  }> {
    const memoryStats = {
      entries: this.memoryCache.size,
      size: this.calculateMemorySize(),
    };

    let redisStats: RedisStats = { connected: this.isRedisConnected };

    if (!FAST_DEV && this.isRedisConnected) {
      try {
        const info = await this.redisClient.info();
        redisStats = { ...redisStats, info: info as string };
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }

    return {
      memory: memoryStats,
      redis: redisStats,
    };
  }

  private calculateMemorySize(): string {
    let size = 0;
    for (const [key, value] of this.memoryCache.entries()) {
      size += key.length + JSON.stringify(value).length;
    }

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  async getHistoricalMatches(): Promise<CsgoMatch[]> {
    const cacheKey = "historical-matches";

    const cached = await this.get<CsgoMatch[]>("panda", cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        "https://api.pandascore.co/csgo/matches?filter[status]=finished&sort=-begin_at&page[size]=50",
        {
          headers: {
            Authorization: `Bearer ${process.env.PANDASCORE_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`PandaScore API error: ${response.status}`);
      }

      const data = await response.json();
      const matches: CsgoMatch[] = data.map((match: any) => ({
        id: match.id.toString(),
        league: match.league?.name || "Unknown",
        homeTeam: match.opponents?.[0]?.opponent?.name || "TBD",
        awayTeam: match.opponents?.[1]?.opponent?.name || "TBD",
        startTime: match.begin_at || match.scheduled_at,
        odds: match.odds || {},
        stats: {},
      }));

      await this.set("panda", cacheKey, matches, {
        memory: 1800,
        redis: 7200,
      });

      return matches;
    } catch (error) {
      console.error("Erro ao buscar jogos históricos:", error);
      return [];
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    if (!FAST_DEV && this.isRedisConnected) {
      try {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    await this.invalidateByPattern(`${namespace}:`);
  }

  async invalidateTeamData(teamName: string): Promise<void> {
    const patterns = [
      `stats:${teamName}`,
      `matches:${teamName}`,
      `panda:team-${teamName}`,
      `hltv:${teamName}`,
    ];

    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern);
    }
  }

  async invalidateTournamentData(tournamentId: string): Promise<void> {
    await this.invalidateByPattern(`tournament:${tournamentId}`);
    await this.invalidateByPattern(`matches:tournament-${tournamentId}`);
  }

  async refreshData<T>(
    namespace: string,
    key: string,
    fetchFunction: () => Promise<T>,
    customTtl?: { memory?: number; redis?: number }
  ): Promise<T> {
    try {
      const freshData = await fetchFunction();
      await this.set(namespace, key, freshData, customTtl);
      return freshData;
    } catch (error: any) {
      throw error;
    }
  }

  startCleanup(intervalMs: number = 300000) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(
        `Cleanup: ${removed} entradas expiradas removidas da memória`
      );
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisClient && this.isRedisConnected) {
      try {
        await this.redisClient.quit();
      } catch (error: any) {
        // Silenciosamente ignora erros do Redis
      }
    }
  }
}

export const advancedCache = new AdvancedCacheService();
advancedCache.startCleanup();

if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    await advancedCache.close();
  });

  process.on("SIGINT", async () => {
    await advancedCache.close();
  });
}
