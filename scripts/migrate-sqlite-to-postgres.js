/* eslint-disable no-console */
const path = require("path");
const { PrismaClient: SourcePrismaClient } = require("@prisma/client");

let TargetPrismaClient;
try {
  ({ PrismaClient: TargetPrismaClient } = require(path.join(
    __dirname,
    "..",
    "src",
    "generated",
    "prisma-postgres"
  )));
} catch (error) {
  console.error(
    "Cliente Prisma Postgres nao encontrado. Rode `npm run db:generate:postgres` antes da migracao."
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL (SQLite origem) nao configurado.");
  process.exit(1);
}

if (!process.env.POSTGRES_DATABASE_URL) {
  console.error("POSTGRES_DATABASE_URL (Postgres destino) nao configurado.");
  process.exit(1);
}

const source = new SourcePrismaClient();
const target = new TargetPrismaClient();

const MODEL_ORDER = [
  "user",
  "subscription",
  "matchPrediction",
  "cSGOMatch",
  "cSGOOdds",
  "cSGOTeam",
  "cSGOOddsHistory",
  "cache",
  "matchHistory",
  "teamStats",
  "headToHead",
  "scrapedData",
  "telegramLinkCode",
  "telegramConfig",
  "phoneVerification",
];

const chunk = (items, size) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

async function resetTarget() {
  console.log("Resetando base Postgres de destino...");
  for (const modelName of [...MODEL_ORDER].reverse()) {
    await target[modelName].deleteMany();
  }
}

async function copyModel(modelName) {
  const rows = await source[modelName].findMany();
  console.log(`${modelName}: ${rows.length} registros encontrados`);

  if (!rows.length) {
    return;
  }

  for (const batch of chunk(rows, 200)) {
    await target[modelName].createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function main() {
  const shouldReset = process.env.RESET_TARGET_DB === "true";

  console.log("Iniciando migracao SQLite -> Postgres");
  console.log(`Origem: ${process.env.DATABASE_URL}`);
  console.log(`Destino: ${process.env.POSTGRES_DATABASE_URL}`);

  if (shouldReset) {
    await resetTarget();
  }

  for (const modelName of MODEL_ORDER) {
    await copyModel(modelName);
  }

  console.log("Migracao concluida.");
}

main()
  .catch((error) => {
    console.error("Falha na migracao:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
