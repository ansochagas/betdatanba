import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillingProvider } from "@/lib/billing/provider";
import { getPublicAppUrl } from "@/lib/app-url";

const pricePlanMap = Object.fromEntries(
  [
    [
      process.env.STRIPE_PRICE_NBA_MONTHLY || process.env.STRIPE_PRICE_MONTHLY,
      "nba_monthly",
    ],
    [
      process.env.STRIPE_PRICE_NBA_QUARTERLY ||
        process.env.STRIPE_PRICE_QUARTERLY,
      "nba_quarterly",
    ],
    [
      process.env.STRIPE_PRICE_NBA_SEMESTRAL ||
        process.env.STRIPE_PRICE_SEMESTRAL,
      "nba_semestral",
    ],
  ].filter(([priceId]) => Boolean(priceId))
) as Record<string, string>;

function getPlanFromPrice(priceId: string): string | null {
  return pricePlanMap[priceId] || null;
}

export async function POST(request: NextRequest) {
  try {
    const appUrl = getPublicAppUrl();

    if (getBillingProvider() !== "stripe") {
      return NextResponse.json(
        {
          error:
            "Checkout Stripe desabilitado porque BILLING_PROVIDER nao esta como stripe.",
        },
        { status: 409 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Inicializar Stripe apenas quando necessário
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Usar versão suportada pelo Stripe
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
    });

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "ID do preço não fornecido" },
        { status: 400 }
      );
    }

    const planId = getPlanFromPrice(priceId);
    if (!planId) {
      return NextResponse.json(
        { error: "Preço inválido ou não configurado" },
        { status: 400 }
      );
    }

    // Buscar ou criar customer no Stripe
    let customer;
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já existe customer no Stripe
    if (user.subscription?.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(
          user.subscription.stripeCustomerId
        );
      } catch (error) {
        // Customer não existe mais, criar novo
      }
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      // Atualizar o customer ID no banco
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          billingProvider: "stripe",
          providerCustomerId: customer.id,
          stripeCustomerId: customer.id,
          planId,
        },
        create: {
          userId: user.id,
          billingProvider: "stripe",
          providerCustomerId: customer.id,
          stripeCustomerId: customer.id,
          status: "incomplete",
          planId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    } else {
      // Garantir que o planId fique alinhado com o price selecionado
      await prisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
          billingProvider: "stripe",
          providerCustomerId: customer.id,
          planId,
        },
      });
    }

    // Criar sessão de checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("Erro ao criar sessão de checkout:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
