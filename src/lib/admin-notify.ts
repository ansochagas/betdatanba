import { prisma } from "@/lib/prisma";
import { getTelegramBot } from "./telegram-bot";

const ADMIN_EMAIL = "andersonchagas45@gmail.com";

async function getAdminChatId(): Promise<string | null> {
  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    include: { telegramConfig: true },
  });

  const chatId = admin?.telegramConfig?.chatId || admin?.telegramId || null;
  return chatId ? chatId.toString() : null;
}

export async function notifyAdminTelegram(message: string): Promise<boolean> {
  try {
    const chatId = await getAdminChatId();
    if (!chatId) {
      console.warn("[admin-notify] Admin telegram nao vinculado");
      return false;
    }

    const telegramBot = getTelegramBot();
    const sent = await telegramBot.sendMessage(chatId, message);
    if (!sent) {
      console.warn("[admin-notify] Falha ao enviar mensagem");
    }
    return sent;
  } catch (error) {
    console.error("[admin-notify] Erro ao notificar admin:", error);
    return false;
  }
}
