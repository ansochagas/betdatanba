import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SubscriptionManager } from "@/lib/subscription-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Usar o SubscriptionManager para validação robusta
    const { subscription, validation } =
      await SubscriptionManager.getValidatedSubscription(userId);

    return NextResponse.json({
      success: true,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planId: subscription.planId,
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            trialEndsAt: subscription.trialEndsAt?.toISOString() || null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      access: {
        hasNbaAccess: validation.hasNbaAccess,
        hasCsgoAccess: validation.hasCsgoAccess,
      },
      validation: {
        isValid: validation.isValid,
        status: validation.status,
        daysRemaining: validation.daysRemaining,
        hasNbaAccess: validation.hasNbaAccess,
        hasCsgoAccess: validation.hasCsgoAccess,
        warnings: validation.warnings,
        errors: validation.errors,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar assinatura:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
