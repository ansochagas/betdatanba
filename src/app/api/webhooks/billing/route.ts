import { NextRequest, NextResponse } from "next/server";
import {
  getBillingNotReadyMessage,
  getBillingProvider,
} from "@/lib/billing/provider";
import { POST as stripeWebhookPost } from "@/app/api/webhooks/stripe/route";
import { POST as mercadoPagoWebhookPost } from "@/app/api/webhooks/mercadopago/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const provider = getBillingProvider();

  if (provider === "stripe") {
    return stripeWebhookPost(request);
  }

  if (provider === "mercadopago") {
    return mercadoPagoWebhookPost(request);
  }

  return NextResponse.json(
    {
      error: getBillingNotReadyMessage(provider),
      provider,
      code: "BILLING_PROVIDER_NOT_READY",
    },
    { status: 501 }
  );
}
