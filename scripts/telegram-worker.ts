import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

import { getTelegramBot } from "@/lib/telegram-bot";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("[telegram-worker] TELEGRAM_BOT_TOKEN nao configurado. Encerrando.");
    process.exit(1);
  }

  console.log(
    "[telegram-worker] Modo polling iniciado. Use apenas em desenvolvimento ou em uma unica instancia dedicada."
  );

  const bot = getTelegramBot();
  await bot.launch();

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`[telegram-worker] Recebido ${signal}. Encerrando bot...`);
    await bot.stop();
    process.exit(0);
  };

  for (const signal of shutdownSignals) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }

  console.log("[telegram-worker] Worker iniciado e aguardando mensagens.");
}

main().catch((error) => {
  console.error("[telegram-worker] Falha fatal:", error);
  process.exit(1);
});
