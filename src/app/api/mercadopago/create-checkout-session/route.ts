import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoCheckout } from "@/lib/billing/mercadopago";
import { resolveBillingPlanId } from "@/lib/billing/plan-config";

export const dynamic = "force-dynamic";

const getPlanFromPriceId = (priceId: string | null | undefined): string | null => {
  const id = String(priceId || "").trim();
  if (!id) return null;

  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_NBA_MONTHLY || process.env.STRIPE_PRICE_MONTHLY || ""]:
      "nba_monthly",
    [process.env.STRIPE_PRICE_NBA_QUARTERLY ||
    process.env.STRIPE_PRICE_QUARTERLY ||
    ""]: "nba_quarterly",
    [process.env.STRIPE_PRICE_NBA_SEMESTRAL ||
    process.env.STRIPE_PRICE_SEMESTRAL ||
    ""]: "nba_semestral",
  };

  return map[id] || null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !(session.user as any)?.id) {
      return NextResponse.json(
        { error: "Usuario nao autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const planId = resolveBillingPlanId(
      body?.planId || getPlanFromPriceId(body?.priceId)
    );

    const checkout = await createMercadoPagoCheckout({
      planId,
      userId: (session.user as any).id,
      email: session.user.email,
      paymentMode: "checkout",
    });

    await prisma.subscription.upsert({
      where: { userId: (session.user as any).id },
      update: {
        billingProvider: "mercadopago",
        planId: checkout.planId,
      },
      create: {
        userId: (session.user as any).id,
        billingProvider: "mercadopago",
        status: "incomplete",
        planId: checkout.planId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      },
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "URL de checkout nao recebida do Mercado Pago" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sessionId: checkout.id,
      url: checkout.url,
      provider: "mercadopago",
    });
  } catch (error: any) {
    console.error("Erro ao criar checkout Mercado Pago:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
