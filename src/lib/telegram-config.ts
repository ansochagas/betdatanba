import { createHash } from "crypto";

import { getPublicAppUrl } from "@/lib/app-url";

export type TelegramBotIdentity = {
  name: string;
  username: string | null;
  url: string | null;
  source: "env" | "api" | "default";
};

const DEFAULT_BOT_NAME = "BETDATA NBA Bot";
const TELEGRAM_API_ROOT = "https://api.telegram.org";
const DEFAULT_TIMEOUT_MS = 3000;

let cachedIdentityPromise: Promise<TelegramBotIdentity> | null = null;

const normalizeUsername = (value: string | null | undefined): string | null => {
  const normalized = String(value || "").trim().replace(/^@+/, "");
  return normalized || null;
};

export const getTelegramBotToken = (): string | null => {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  return token || null;
};

export const buildTelegramBotUrl = (
  username: string | null | undefined
): string | null => {
  const normalized = normalizeUsername(username);
  return normalized ? `https://t.me/${normalized}` : null;
};

export const getConfiguredTelegramBotName = (): string => {
  return String(process.env.TELEGRAM_BOT_NAME || DEFAULT_BOT_NAME).trim() || DEFAULT_BOT_NAME;
};

export const getConfiguredTelegramBotUsername = (): string | null => {
  return normalizeUsername(
    process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  );
};

const fetchTelegramBotIdentityFromApi = async (): Promise<TelegramBotIdentity | null> => {
  const token = getTelegramBotToken();
  if (!token) return null;

  const url = `${TELEGRAM_API_ROOT}/bot${token}/getMe`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { first_name?: string; username?: string };
    };

    if (!payload.ok || !payload.result) {
      return null;
    }

    const username = normalizeUsername(payload.result.username);
    return {
      name: payload.result.first_name?.trim() || getConfiguredTelegramBotName(),
      username,
      url: buildTelegramBotUrl(username),
      source: "api",
    };
  } catch {
    return null;
  }
};

export const getTelegramBotIdentity = async (): Promise<TelegramBotIdentity> => {
  if (!cachedIdentityPromise) {
    cachedIdentityPromise = (async () => {
      const configuredUsername = getConfiguredTelegramBotUsername();
      if (configuredUsername) {
        return {
          name: getConfiguredTelegramBotName(),
          username: configuredUsername,
          url: buildTelegramBotUrl(configuredUsername),
          source: "env",
        } satisfies TelegramBotIdentity;
      }

      const apiIdentity = await fetchTelegramBotIdentityFromApi();
      if (apiIdentity) {
        return apiIdentity;
      }

      return {
        name: getConfiguredTelegramBotName(),
        username: null,
        url: null,
        source: "default",
      } satisfies TelegramBotIdentity;
    })();
  }

  return cachedIdentityPromise;
};

export const getTelegramWebhookSecret = (): string | null => {
  const explicitSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const token = getTelegramBotToken();
  if (!token) {
    return null;
  }

  return createHash("sha256")
    .update(`betdata-nba:${token}`)
    .digest("hex");
};

export const getTelegramWebhookUrl = (): string | null => {
  if (!getTelegramBotToken()) {
    return null;
  }

  return `${getPublicAppUrl()}/api/telegram/webhook`;
};
