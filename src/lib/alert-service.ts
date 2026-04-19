import { getTelegramBot } from "./telegram-bot";
import { prisma } from "@/lib/prisma";

export interface MatchAlert {
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  tournament?: string;
  minutesUntilStart: number;
}

export class AlertService {
  async sendMatchStartingAlert(match: MatchAlert): Promise<void> {
    try {
      const telegramBot = getTelegramBot();
      const usersWithAlerts = await prisma.telegramConfig.findMany({
        where: {
          alertsEnabled: true,
          alertTypes: {
            contains: '"administrative"',
          },
        },
        include: {
          user: {
            include: {
              subscription: true,
            },
          },
        },
      });

      for (const config of usersWithAlerts) {
        const message = this.createMatchStartingMessage(match);
        await telegramBot.sendMessage(config.chatId, message);
        await this.sleep(100);
      }
    } catch (error) {
      console.error("[alert-service] Erro ao enviar alerta de teste:", error);
    }
  }

  private createMatchStartingMessage(match: MatchAlert): string {
    const startTime = match.startTime.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    return [
      "BETDATA NBA | TESTE DE NOTIFICACAO",
      "",
      `${match.homeTeam} x ${match.awayTeam}`,
      `Inicio previsto: ${startTime}`,
      `Janela: ${match.minutesUntilStart} minutos`,
      match.tournament ? `Competicao: ${match.tournament}` : null,
      "",
      "Esta mensagem valida apenas a infraestrutura do Telegram.",
      "Os alertas live serao implementados na proxima etapa.",
      "",
      "https://www.betdatanba.com",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async checkAndSendAlerts(): Promise<void> {
    console.log("[alert-service] Verificacao manual executada. Nenhum alerta automatico ativo nesta etapa.");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const alertService = new AlertService();
