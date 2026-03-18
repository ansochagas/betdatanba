import { PrismaClient as PostgresPrismaClient } from "@/generated/prisma-postgres";
import { PrismaClient as SqlitePrismaClient } from "@/generated/prisma-sqlite";

export type AppPrismaClient = SqlitePrismaClient;

const getPrismaLogLevels = (): Array<"error" | "warn"> =>
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

export const getPrismaProvider = (): "sqlite" | "postgres" => {
  const explicit = (process.env.PRISMA_PROVIDER || "").trim().toLowerCase();
  if (explicit === "sqlite" || explicit === "postgres") {
    return explicit;
  }

  const databaseUrl = (process.env.DATABASE_URL || "").trim().toLowerCase();
  return databaseUrl.startsWith("file:") ? "sqlite" : "postgres";
};

const getPrismaDatasourceUrl = (): string => {
  const provider = getPrismaProvider();

  if (provider === "sqlite") {
    const sqliteUrl = process.env.DATABASE_URL;
    if (!sqliteUrl) {
      throw new Error("DATABASE_URL nao configurado para runtime SQLite");
    }
    return sqliteUrl;
  }

  const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
  if (!postgresUrl) {
    throw new Error("DATABASE_URL/POSTGRES_DATABASE_URL nao configurado para runtime Postgres");
  }

  return postgresUrl;
};

export const createPrismaClient = (): AppPrismaClient => {
  const provider = getPrismaProvider();
  const datasourceUrl = getPrismaDatasourceUrl();
  const log = getPrismaLogLevels();

  if (provider === "postgres") {
    return new PostgresPrismaClient({
      log,
      datasources: {
        db: {
          url: datasourceUrl,
        },
      },
    }) as unknown as AppPrismaClient;
  }

  return new SqlitePrismaClient({
    log,
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
  });
};
