import { prisma } from "@/lib/prisma";

export const DEFAULT_TELEGRAM_ALERT_TYPES = [
  "live_over_total",
  "gold_list",
  "administrative",
] as const;

export function normalizeSubscriptionStatus(status: unknown): string {
  if (!status) return "";
  return String(status).trim().toLowerCase();
}

export function isSubscriptionAccessAllowed(
  subscription:
    | {
        status?: string | null;
        currentPeriodEnd?: Date | string | null;
        trialEndsAt?: Date | string | null;
      }
    | null
    | undefined
): boolean {
  if (!subscription) return false;

  const status = normalizeSubscriptionStatus(subscription.status);
  const now = new Date();

  if (status === "active") {
    return subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd) > now
      : false;
  }

  if (status === "trialing") {
    const trialEnd = subscription.trialEndsAt
      ? new Date(subscription.trialEndsAt)
      : subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : null;

    return trialEnd ? trialEnd > now : false;
  }

  return false;
}

export function parseTelegramAlertTypes(alertTypes: string | null | undefined): string[] {
  if (!alertTypes) return [];

  try {
    const parsed = JSON.parse(alertTypes);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export type LinkTelegramAccountInput = {
  linkCode: string;
  telegramId: string;
  chatId: string;
};

export type LinkTelegramAccountResult =
  | {
      success: true;
      data: {
        telegramId: string;
        chatId: string;
      };
    }
  | {
      success: false;
      error: string;
      status: number;
    };

export async function linkTelegramAccount({
  linkCode,
  telegramId,
  chatId,
}: LinkTelegramAccountInput): Promise<LinkTelegramAccountResult> {
  const normalizedLinkCode = String(linkCode || "").trim().toUpperCase();
  const normalizedTelegramId = String(telegramId || "").trim();
  const normalizedChatId = String(chatId || "").trim();

  if (!normalizedLinkCode || !normalizedTelegramId || !normalizedChatId) {
    return {
      success: false,
      error: "Parametros obrigatorios: linkCode, telegramId, chatId",
      status: 400,
    };
  }

  const linkCodeRecord = await prisma.telegramLinkCode.findUnique({
    where: { code: normalizedLinkCode },
    include: { user: true },
  });

  if (!linkCodeRecord) {
    return {
      success: false,
      error: "Codigo de vinculacao invalido ou expirado",
      status: 400,
    };
  }

  if (linkCodeRecord.expiresAt < new Date()) {
    await prisma.telegramLinkCode.delete({
      where: { id: linkCodeRecord.id },
    });

    return {
      success: false,
      error: "Codigo expirado. Gere um novo codigo no site.",
      status: 400,
    };
  }

  const user = linkCodeRecord.user;

  if (user.telegramId && user.telegramId !== normalizedTelegramId) {
    return {
      success: false,
      error: "Conta ja vinculada a outro Telegram",
      status: 400,
    };
  }

  const existingTelegramUser = await prisma.user.findFirst({
    where: { telegramId: normalizedTelegramId },
  });

  if (existingTelegramUser && existingTelegramUser.id !== user.id) {
    return {
      success: false,
      error: "Este Telegram ja esta vinculado a outra conta",
      status: 400,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { telegramId: normalizedTelegramId },
    });

    await tx.telegramConfig.upsert({
      where: { userId: user.id },
      update: {
        chatId: normalizedChatId,
        alertsEnabled: true,
        favoriteTeams: JSON.stringify([]),
        alertTypes: JSON.stringify(DEFAULT_TELEGRAM_ALERT_TYPES),
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
      },
      create: {
        userId: user.id,
        chatId: normalizedChatId,
        alertsEnabled: true,
        favoriteTeams: JSON.stringify([]),
        alertTypes: JSON.stringify(DEFAULT_TELEGRAM_ALERT_TYPES),
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
      },
    });

    await tx.telegramLinkCode.delete({
      where: { id: linkCodeRecord.id },
    });
  });

  return {
    success: true,
    data: {
      telegramId: normalizedTelegramId,
      chatId: normalizedChatId,
    },
  };
}
