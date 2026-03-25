import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { notifyAdminTelegram } from "@/lib/admin-notify";
import { getBillingProvider } from "@/lib/billing/provider";
import { getPlanDurationDays, getPlanLabel } from "@/lib/plans";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
});
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
    [
      process.env.STRIPE_PRICE_NBA_LIFETIME ||
        process.env.STRIPE_PRICE_NBA_VITALICIO ||
        process.env.STRIPE_PRICE_LIFETIME,
      "nba_lifetime",
    ],
  ].filter(([priceId]) => Boolean(priceId))
) as Record<string, string>;

function getPlanFromSubscription(subscription: Stripe.Subscription): string | null {
  const priceId =
    subscription.items?.data?.[0]?.price?.id ||
    (subscription as any).plan?.id;
  if (!priceId) return null;
  return pricePlanMap[priceId] || null;
}

function formatAmount(amount?: number | null, currency?: string | null): string {
  if (!amount || !currency) return "";
  const value = (amount / 100).toFixed(2);
  return `${value} ${currency.toUpperCase()}`;
}

async function resolveUserEmail(
  session: Stripe.Checkout.Session,
  customerId?: string | null
): Promise<string> {
  let email =
    session.customer_details?.email ||
    session.customer_email ||
    "";
  if (!email && session.metadata?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.metadata.userId },
    });
    email = user?.email || "";
  }
  if (!email && customerId) {
    const sub = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    });
    email = sub?.user?.email || "";
  }
  return email || "N/A";
}

async function notifyAdminPurchase(
  session: Stripe.Checkout.Session,
  planId?: string | null
) {
  const customerId = (session.customer as string | undefined) || null;
  const email = await resolveUserEmail(session, customerId);
  const planLabel = planId ? `${getPlanLabel(planId)} (${planId})` : "N/A";
  const amountInfo = formatAmount(session.amount_total, session.currency);
  const lines = [
    "NOVA COMPRA CONFIRMADA",
    `Email: ${email}`,
    `Plano: ${planLabel}`,
    amountInfo ? `Valor: ${amountInfo}` : "",
    `Modo: ${session.mode || "N/A"}`,
    `Data: ${new Date().toISOString()}`,
  ].filter(Boolean);

  try {
    await notifyAdminTelegram(lines.join("\n"));
  } catch (notifyError) {
    console.warn("Falha ao notificar admin (compra):", notifyError);
  }
}

async function ensureSubscriptionByCustomer(
  customerId: string,
  planId?: string | null,
  status?: string,
  periodStart?: Date,
  periodEnd?: Date,
  trialEndsAt?: Date | null
) {
  const existing = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (existing) return existing;

  try {
    const customer = await stripeClient.customers.retrieve(customerId);
    const userId =
      (customer as any)?.metadata?.userId ||
      (customer as any)?.metadata?.userid ||
      null;

    if (!userId) {
      console.warn(
        `⚠️ Não foi possível associar customer ${customerId} a um userId (sem metadata)`
      );
      return null;
    }

    const start = periodStart || new Date();
    const durationDays =
      getPlanDurationDays(planId || null) || 30; // fallback seguro de 30 dias
    const end =
      periodEnd ||
      (() => {
        const d = new Date(start);
        d.setDate(d.getDate() + durationDays);
        return d;
      })();

    const sub = await prisma.subscription.upsert({
      where: { userId },
      update: {
        billingProvider: "stripe",
        providerCustomerId: customerId,
        stripeCustomerId: customerId,
        planId: planId || undefined,
        status: status || "active",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        trialEndsAt: trialEndsAt ?? null,
      },
      create: {
        userId,
        billingProvider: "stripe",
        providerCustomerId: customerId,
        stripeCustomerId: customerId,
        planId: planId || "nba_monthly",
        status: status || "active",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        trialEndsAt: trialEndsAt ?? null,
      },
    });

    console.log(
      `✅ Assinatura criada/atualizada via fallback para user ${userId} (customer ${customerId})`
    );
    return sub;
  } catch (err: any) {
    console.error(
      `Erro ao recuperar/associar customer ${customerId}: ${err.message}`
    );
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (getBillingProvider() !== "stripe") {
      return NextResponse.json(
        {
          error:
            "Webhook Stripe desabilitado porque BILLING_PROVIDER nao esta como stripe.",
        },
        { status: 409 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Inicializar Stripe apenas quando necessário
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Versão suportada
      apiVersion: "2022-11-15" as Stripe.LatestApiVersion,
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Buscar usuário pelo customer ID
  const userSubscription =
    (await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { user: true },
    })) ||
    (await ensureSubscriptionByCustomer(customerId, getPlanFromSubscription(subscription), undefined, undefined, undefined, subscription.trial_end ? new Date(subscription.trial_end * 1000) : null));

  if (!userSubscription) {
    console.error(`No subscription found for customer ${customerId}`);
    return;
  }

  const status = subscription.status;
  const sub = subscription as any; // Type assertion para acessar propriedades não tipadas
  const planId = getPlanFromSubscription(subscription);
  const planDays = getPlanDurationDays(planId) || 30; // fallback seguro

  const currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : new Date();

  let currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : new Date(currentPeriodStart);

  // Fallback: se vier sem current_period_end ou igual/menor que o start, estende conforme o plano
  if (
    (!sub.current_period_end || currentPeriodEnd <= currentPeriodStart) &&
    planDays > 0
  ) {
    const end = new Date(currentPeriodStart);
    end.setDate(end.getDate() + planDays);
    currentPeriodEnd = end;
  }

  // Atualizar status da assinatura
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      billingProvider: "stripe",
      providerCustomerId: customerId,
      providerSubscriptionId: subscription.id,
      status: mapStripeStatus(status),
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      ...(planId ? { planId } : {}),
    },
  });

  const userEmail =
    (userSubscription as any)?.user?.email || userSubscription.userId || customerId;
  console.log(`Updated subscription for customer ${customerId} (${userEmail}): ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const userSubscription =
    (await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    })) || (await ensureSubscriptionByCustomer(customerId));

  if (!userSubscription) {
    console.error(`No subscription found for customer ${customerId}`);
    return;
  }

  // Marcar como cancelada
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: "canceled",
      cancelAtPeriodEnd: true,
    },
  });

  console.log(`Canceled subscription for customer ${customerId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const userSubscription =
    (await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    })) || (await ensureSubscriptionByCustomer(customerId));

  if (!userSubscription) {
    console.error(`No subscription found for customer ${customerId}`);
    return;
  }

  // Pagamento bem-sucedido - garantir que assinatura está ativa
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: "active",
    },
  });

  console.log(`Payment succeeded for customer ${customerId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error(`No subscription found for customer ${customerId}`);
    return;
  }

  // Pagamento falhou - marcar como past_due
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: "past_due",
    },
  });

  console.log(`Payment failed for customer ${customerId}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Assinatura (cartão): mantém fluxo anterior
  if (session.mode === "subscription") {
    const customerId = session.customer as string;

    if (!session.subscription) {
      console.error(
        `No subscription found for customer ${customerId} in checkout completion`
      );
      return;
    }

    // Buscar assinatura real na Stripe para usar datas/status corretos
    const stripeSub = await stripeClient.subscriptions.retrieve(
      session.subscription as string
    );

    await handleSubscriptionChange(stripeSub);
    await notifyAdminPurchase(session, getPlanFromSubscription(stripeSub));

    console.log(
      `Checkout completed for customer ${customerId} - subscription synced via Stripe data`
    );
    return;
  }

  // Pagamento avulso (Pix): aplicar período manualmente usando metadata
  if (session.mode === "payment") {
    const metadata = session.metadata || {};
    const userId = metadata.userId as string | undefined;
    const planId = (metadata.planId as string | undefined) || "nba_monthly";
    const periodDays = metadata.periodDays
      ? Number(metadata.periodDays)
      : getPlanDurationDays(planId);

    if (!userId || !periodDays) {
      console.error(
        "Pix checkout completed sem userId ou periodDays na metadata"
      );
      return;
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + periodDays);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        billingProvider: "stripe",
        ...(session.customer
          ? { providerCustomerId: session.customer as string }
          : {}),
        status: "active",
        planId,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        ...(session.customer
          ? { stripeCustomerId: session.customer as string }
          : {}),
      },
      create: {
        userId,
        billingProvider: "stripe",
        ...(session.customer
          ? { providerCustomerId: session.customer as string }
          : {}),
        status: "active",
        planId,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        ...(session.customer
          ? { stripeCustomerId: session.customer as string }
          : {}),
      },
    });
    await notifyAdminPurchase(session, planId);

    console.log(
      `Checkout PIX completed for user ${userId} - plan ${planId} ativo até ${end.toISOString()}`
    );
  }
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    case "unpaid":
      return "unpaid";
    default:
      return "incomplete";
  }
}
