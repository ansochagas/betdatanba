import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

import {
  getTelegramBotToken,
  getTelegramWebhookSecret,
  getTelegramWebhookUrl,
} from "@/lib/telegram-config";

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

async function callTelegramApi(
  method: string,
  payload?: Record<string, unknown>
): Promise<TelegramApiResponse> {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN nao configurado.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = (await response.json()) as TelegramApiResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Falha no metodo ${method}`);
  }

  return data;
}

async function setWebhook() {
  const webhookUrl = getTelegramWebhookUrl();
  const secret = getTelegramWebhookSecret();

  if (!webhookUrl || !secret) {
    throw new Error("Webhook do Telegram nao configuravel com as envs atuais.");
  }

  await callTelegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });

  const info = await callTelegramApi("getWebhookInfo");
  console.log(
    JSON.stringify(
      {
        action: "set",
        webhookUrl,
        hasCustomSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
        info: info.result,
      },
      null,
      2
    )
  );
}

async function deleteWebhook() {
  await callTelegramApi("deleteWebhook", {
    drop_pending_updates: false,
  });

  const info = await callTelegramApi("getWebhookInfo");
  console.log(
    JSON.stringify(
      {
        action: "delete",
        info: info.result,
      },
      null,
      2
    )
  );
}

async function infoWebhook() {
  const info = await callTelegramApi("getWebhookInfo");
  console.log(
    JSON.stringify(
      {
        action: "info",
        webhookUrl: getTelegramWebhookUrl(),
        hasCustomSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
        info: info.result,
      },
      null,
      2
    )
  );
}

async function main() {
  const action = String(process.argv[2] || "info").trim().toLowerCase();

  if (action === "set") {
    await setWebhook();
    return;
  }

  if (action === "delete") {
    await deleteWebhook();
    return;
  }

  if (action === "info") {
    await infoWebhook();
    return;
  }

  throw new Error('Uso: "tsx scripts/telegram-webhook.ts [set|info|delete]"');
}

main().catch((error) => {
  console.error("[telegram-webhook-script]", error instanceof Error ? error.message : error);
  process.exit(1);
});
