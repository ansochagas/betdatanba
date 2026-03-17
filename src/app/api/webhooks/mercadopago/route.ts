import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMercadoPagoPayment,
  validateMercadoPagoWebhookSignature,
} from "@/lib/billing/mercadopago";
import {
  getBillingPlanConfig,
  resolveBillingPlanId,
} from "@/lib/billing/plan-config";

export const dynamic = "force-dynamic";

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePayload = (raw: string): any => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const getDataId = (request: NextRequest, payload: any): string | null => {
  const fromQuery =
    request.nextUrl.searchParams.get("data.id") ||
    request.nextUrl.searchParams.get("id");
  const fromBody = payload?.data?.id;
  return String(fromQuery || fromBody || "").trim() || null;
};

const getEventType = (request: NextRequest, payload: any): string => {
  return String(
    payload?.type ||
      payload?.topic ||
      request.nextUrl.searchParams.get("type") ||
      request.nextUrl.searchParams.get("topic") ||
      ""
  )
    .trim()
    .toLowerCase();
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = parsePayload(rawBody);
    const eventType = getEventType(request, payload);
    const dataId = getDataId(request, payload);

    const signatureValid = validateMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });

    if (!signatureValid) {
      return NextResponse.json(
        { error: "Assinatura de webhook invalida" },
        { status: 401 }
      );
    }

    if (eventType !== "payment") {
      return NextResponse.json({
        received: true,
        provider: "mercadopago",
        ignored: true,
        reason: `Evento nao tratado: ${eventType || "unknown"}`,
      });
    }

    if (!dataId) {
      return NextResponse.json(
        { error: "ID de pagamento ausente" },
        { status: 400 }
      );
    }

    const payment = await getMercadoPagoPayment(dataId);
    const paymentStatus = String(payment.status || "").toLowerCase();

    if (paymentStatus !== "approved") {
      return NextResponse.json({
        received: true,
        provider: "mercadopago",
        ignored: true,
        reason: `Pagamento ainda nao aprovado (${paymentStatus || "unknown"})`,
      });
    }

    const metadata = payment.metadata || {};
    const resolvedPlanId = resolveBillingPlanId(
      String(
        metadata.planId ||
          payment.additional_info?.items?.[0]?.id ||
          "nba_monthly"
      )
    );
    const planConfig = getBillingPlanConfig(resolvedPlanId);

    const metadataPeriodDays = toNumber(metadata.periodDays);
    const periodDays =
      metadataPeriodDays && metadataPeriodDays > 0
        ? metadataPeriodDays
        : planConfig.periodDays;

    const metadataUserId = String(metadata.userId || "").trim();
    const externalReference = String(payment.external_reference || "").trim();
    const payerEmail = String(payment.payer?.email || "").trim();

    let user = null;
    if (metadataUserId) {
      user = await prisma.user.findUnique({ where: { id: metadataUserId } });
    }

    if (!user && externalReference) {
      user = await prisma.user.findUnique({ where: { id: externalReference } });
    }

    if (!user && payerEmail) {
      user = await prisma.user.findUnique({ where: { email: payerEmail } });
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuario nao encontrado para pagamento aprovado",
          paymentId: payment.id,
        },
        { status: 404 }
      );
    }

    const existing = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    const now = new Date();
    const baseDate =
      existing?.status === "active" &&
      existing.currentPeriodEnd &&
      existing.currentPeriodEnd > now
        ? existing.currentPeriodEnd
        : now;

    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + periodDays);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        billingProvider: "mercadopago",
        providerCustomerId: payment.payer?.id
          ? String(payment.payer.id)
          : existing?.providerCustomerId || undefined,
        providerSubscriptionId: String(payment.id),
        status: "active",
        planId: resolvedPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId: user.id,
        billingProvider: "mercadopago",
        providerCustomerId: payment.payer?.id
          ? String(payment.payer.id)
          : null,
        providerSubscriptionId: String(payment.id),
        status: "active",
        planId: resolvedPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({
      received: true,
      provider: "mercadopago",
      paymentId: payment.id,
      userId: user.id,
      planId: resolvedPlanId,
      status: "active",
    });
  } catch (error: any) {
    console.error("Erro no webhook Mercado Pago:", error);
    return NextResponse.json(
      { error: error?.message || "Falha no webhook Mercado Pago" },
      { status: 500 }
    );
  }
}
