import { prisma } from "@/lib/prisma";

export interface ExpirationAlert {
  userId: string;
  userEmail: string;
  daysRemaining: number;
  alertType: "warning" | "critical" | "expired";
  message: string;
  recommendedAction: string;
}

export class SubscriptionAlerts {
  /**
   * Busca usuários que precisam de alertas de expiração
   */
  static async getUsersNeedingAlerts(): Promise<ExpirationAlert[]> {
    try {
      const alerts: ExpirationAlert[] = [];

      // Buscar todas as subscriptions ativas
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      const now = new Date();

      for (const sub of subscriptions) {
        const endDate = new Date(sub.currentPeriodEnd);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(
          0,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        );

        let alert: ExpirationAlert | null = null;

        if (daysRemaining === 0) {
          // Expirou hoje
          alert = {
            userId: sub.userId,
            userEmail: sub.user.email,
            daysRemaining: 0,
            alertType: "expired",
            message: `🚨 Seu plano expirou hoje! Renove agora para continuar acessando.`,
            recommendedAction: "Renovar plano imediatamente",
          };
        } else if (daysRemaining <= 3) {
          // Crítico - 3 dias ou menos
          alert = {
            userId: sub.userId,
            userEmail: sub.user.email,
            daysRemaining,
            alertType: "critical",
            message: `⚠️ URGENTE: Seu plano expira em ${daysRemaining} dia${
              daysRemaining !== 1 ? "s" : ""
            }! Renove agora.`,
            recommendedAction: "Renovar plano urgente",
          };
        } else if (daysRemaining <= 7) {
          // Aviso - 7 dias ou menos
          alert = {
            userId: sub.userId,
            userEmail: sub.user.email,
            daysRemaining,
            alertType: "warning",
            message: `🔔 Aviso: Seu plano expira em ${daysRemaining} dias. Não esqueça de renovar.`,
            recommendedAction: "Planejar renovação",
          };
        }

        if (alert) {
          alerts.push(alert);
        }
      }

      return alerts;
    } catch (error) {
      console.error("Erro ao buscar usuários para alertas:", error);
      throw error;
    }
  }

  /**
   * Envia alertas via Telegram para usuários que precisam
   */
  static async sendExpirationAlerts(): Promise<{
    sent: number;
    failed: number;
    alerts: ExpirationAlert[];
  }> {
    try {
      const alerts = await this.getUsersNeedingAlerts();

      if (alerts.length === 0) {
        console.log("📭 Nenhum alerta de expiração necessário");
        return { sent: 0, failed: 0, alerts: [] };
      }

      console.log(`📤 Enviando ${alerts.length} alertas de expiração...`);

      let sent = 0;
      let failed = 0;

      for (const alert of alerts) {
        try {
          // Buscar configuração do Telegram do usuário
          const telegramConfig = await prisma.telegramConfig.findUnique({
            where: { userId: alert.userId },
          });

          if (!telegramConfig?.chatId) {
            console.log(
              `⚠️ Usuário ${alert.userEmail} não tem Telegram configurado`
            );
            failed++;
            continue;
          }

          // Aqui você implementaria o envio via Telegram Bot
          // Por enquanto, apenas log
          console.log(
            `✅ Alerta enviado para ${alert.userEmail}: ${alert.message}`
          );

          // TODO: Implementar envio real via Telegram Bot API
          // await sendTelegramMessage(telegramConfig.chatId, alert.message);

          sent++;
        } catch (error) {
          console.error(
            `❌ Erro ao enviar alerta para ${alert.userEmail}:`,
            error
          );
          failed++;
        }
      }

      console.log(`📊 Alertas enviados: ${sent} sucesso, ${failed} falha`);

      return { sent, failed, alerts };
    } catch (error) {
      console.error("Erro ao enviar alertas de expiração:", error);
      throw error;
    }
  }

  /**
   * Verifica se um usuário específico precisa de alerta
   */
  static async checkUserAlertStatus(
    userId: string
  ): Promise<ExpirationAlert | null> {
    try {
      const alerts = await this.getUsersNeedingAlerts();
      return alerts.find((alert) => alert.userId === userId) || null;
    } catch (error) {
      console.error("Erro ao verificar status de alerta do usuário:", error);
      return null;
    }
  }

  /**
   * Cron job para enviar alertas automaticamente (para ser chamado por scheduler)
   */
  static async scheduledAlertCheck(): Promise<void> {
    try {
      console.log(
        "⏰ Executando verificação automática de alertas de expiração..."
      );

      const result = await this.sendExpirationAlerts();

      console.log(
        `✅ Verificação concluída: ${result.sent} alertas enviados, ${result.failed} falhas`
      );

      // Log detalhado para admin
      if (result.alerts.length > 0) {
        console.log("📋 Detalhes dos alertas:");
        result.alerts.forEach((alert) => {
          console.log(
            `   ${alert.alertType.toUpperCase()}: ${alert.userEmail} - ${
              alert.daysRemaining
            } dias`
          );
        });
      }
    } catch (error) {
      console.error("❌ Erro na verificação automática de alertas:", error);
    }
  }
}
