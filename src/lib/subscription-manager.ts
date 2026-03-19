import { prisma } from "@/lib/prisma";
import { resolveSportAccess } from "@/lib/plans";

function normalizeStatus(value: unknown): string {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

export interface SubscriptionData {
  id: string;
  userId: string;
  status: string;
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export interface SubscriptionValidation {
  isValid: boolean;
  status:
    | "ACTIVE"
    | "TRIALING"
    | "EXPIRED"
    | "CANCELLED"
    | "INVALID"
    | "INACTIVE";
  daysRemaining: number;
  planId: string;
  hasNbaAccess: boolean;
  hasCsgoAccess: boolean;
  errors: string[];
  warnings: string[];
}

export class SubscriptionManager {
  /**
   * Valida uma subscription com verificações completas
   */
  static async validateSubscription(
    userId: string
  ): Promise<SubscriptionValidation> {
    const result: SubscriptionValidation = {
      isValid: false,
      status: "INVALID",
      daysRemaining: 0,
      planId: "",
      hasNbaAccess: false,
      hasCsgoAccess: false,
      errors: [],
      warnings: [],
    };

    try {
      // Buscar subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        result.status = "INACTIVE";
        return result;
      }

      // Validar campos obrigatórios
      if (!subscription.status || !subscription.planId) {
        result.errors.push("Campos obrigatórios ausentes");
        return result;
      }

      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);

      // Calcular dias restantes
      const diffTime = endDate.getTime() - now.getTime();
      result.daysRemaining = Math.max(
        0,
        Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      );
      result.planId = subscription.planId;

      // Determinar status
      const status = normalizeStatus(subscription.status);

      if (status === "cancelled" || status === "canceled") {
        result.status = "CANCELLED";
        result.isValid = false;
      } else if (status === "trialing") {
        const trialEndDate = subscription.trialEndsAt
          ? new Date(subscription.trialEndsAt)
          : endDate;

        if (trialEndDate > now) {
          result.status = "TRIALING";
          result.isValid = true;
        } else {
          result.status = "EXPIRED";
          result.isValid = false;
          result.errors.push("Trial expirado");
        }
      } else if (status === "active") {
        if (endDate > now) {
          result.status = "ACTIVE";
          result.isValid = true;

          // Avisos para planos próximos da expiração
          if (result.daysRemaining <= 7) {
            result.warnings.push(
              `Plano expira em ${result.daysRemaining} dias`
            );
          }
        } else {
          result.status = "EXPIRED";
          result.isValid = false;
          result.errors.push("Plano expirado");
        }
      } else {
        result.errors.push(`Status inválido: ${subscription.status}`);
      }

      const access = resolveSportAccess(subscription.planId, subscription.status);
      result.hasNbaAccess = result.isValid ? access.hasNbaAccess : false;
      result.hasCsgoAccess = result.isValid ? access.hasCsgoAccess : false;

      // Log de auditoria
      await this.logSubscriptionAccess(userId, result);
    } catch (error) {
      console.error("Erro na validação de subscription:", error);
      result.errors.push("Erro interno na validação");
    }

    return result;
  }

  /**
   * Busca subscription com validação
   */
  static async getValidatedSubscription(userId: string): Promise<{
    subscription: SubscriptionData | null;
    validation: SubscriptionValidation;
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      const validation = await this.validateSubscription(userId);

      return {
        subscription: subscription
          ? {
              id: subscription.id,
              userId: subscription.userId,
              status: subscription.status,
              planId: subscription.planId,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              trialEndsAt: subscription.trialEndsAt,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              createdAt: subscription.createdAt,
            }
          : null,
        validation,
      };
    } catch (error) {
      console.error("Erro ao buscar subscription validada:", error);
      throw error;
    }
  }

  /**
   * Cria uma nova subscription com validações
   */
  static async createSubscription(data: {
    userId: string;
    planId: string;
    status: "ACTIVE" | "TRIALING";
    periodDays: number;
    trialDays?: number;
  }): Promise<SubscriptionData> {
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + data.periodDays);

      let trialEndsAt: Date | null = null;
      if (data.trialDays && data.status === "TRIALING") {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + data.trialDays);
      }

      const subscription = await prisma.subscription.create({
        data: {
          userId: data.userId,
          status: data.status,
          planId: data.planId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEndsAt,
          cancelAtPeriodEnd: false,
        },
      });

      // Log de criação
      await this.logSubscriptionEvent(data.userId, "CREATED", {
        planId: data.planId,
        periodDays: data.periodDays,
        trialDays: data.trialDays,
      });

      return {
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status,
        planId: subscription.planId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        createdAt: subscription.createdAt,
      };
    } catch (error) {
      console.error("Erro ao criar subscription:", error);
      throw error;
    }
  }

  /**
   * Renova uma subscription
   */
  static async renewSubscription(
    userId: string,
    additionalDays: number
  ): Promise<SubscriptionData> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error("Subscription não encontrada");
      }

      const now = new Date();
      let newEndDate = new Date(subscription.currentPeriodEnd);

      // Se já expirou, renovar a partir de hoje
      if (newEndDate < now) {
        newEndDate = new Date(now);
      }

      newEndDate.setDate(newEndDate.getDate() + additionalDays);

      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: newEndDate,
          cancelAtPeriodEnd: false,
        },
      });

      // Log de renovação
      await this.logSubscriptionEvent(userId, "RENEWED", {
        additionalDays,
        newEndDate: newEndDate.toISOString(),
      });

      return {
        id: updatedSubscription.id,
        userId: updatedSubscription.userId,
        status: updatedSubscription.status,
        planId: updatedSubscription.planId,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        trialEndsAt: updatedSubscription.trialEndsAt,
        cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
        createdAt: updatedSubscription.createdAt,
      };
    } catch (error) {
      console.error("Erro ao renovar subscription:", error);
      throw error;
    }
  }

  /**
   * Log de auditoria para acessos à subscription
   */
  private static async logSubscriptionAccess(
    userId: string,
    validation: SubscriptionValidation
  ): Promise<void> {
    try {
      // Por enquanto, apenas log no console
      // TODO: Implementar tabela de logs no banco
      console.log(
        `🔍 Subscription access - User: ${userId}, Status: ${validation.status}, Days: ${validation.daysRemaining}`
      );
    } catch (error) {
      console.error("Erro no log de acesso:", error);
    }
  }

  /**
   * Log de eventos da subscription
   */
  private static async logSubscriptionEvent(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      // Por enquanto, apenas log no console
      // TODO: Implementar tabela de logs no banco
      console.log(
        `📝 Subscription event - User: ${userId}, Event: ${event}, Data:`,
        data
      );
    } catch (error) {
      console.error("Erro no log de evento:", error);
    }
  }

  /**
   * Verifica integridade das subscriptions (para admin)
   */
  static async checkIntegrity(): Promise<{
    totalSubscriptions: number;
    validSubscriptions: number;
    invalidSubscriptions: number;
    expiredSubscriptions: number;
    issues: string[];
  }> {
    try {
      const subscriptions = await prisma.subscription.findMany({
        include: { user: { select: { email: true } } },
      });

      let validCount = 0;
      let invalidCount = 0;
      let expiredCount = 0;
      const issues: string[] = [];

      for (const sub of subscriptions) {
        const validation = await this.validateSubscription(sub.userId);

        if (validation.isValid) {
          validCount++;
        } else {
          invalidCount++;
          if (validation.status === "EXPIRED") {
            expiredCount++;
          }
          if (validation.errors.length > 0) {
            issues.push(`${sub.user.email}: ${validation.errors.join(", ")}`);
          }
        }
      }

      return {
        totalSubscriptions: subscriptions.length,
        validSubscriptions: validCount,
        invalidSubscriptions: invalidCount,
        expiredSubscriptions: expiredCount,
        issues,
      };
    } catch (error) {
      console.error("Erro na verificação de integridade:", error);
      throw error;
    }
  }
}
