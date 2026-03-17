import { NextRequest, NextResponse } from "next/server";
import {
  getBillingNotReadyMessage,
  getBillingProvider,
} from "@/lib/billing/provider";
import { POST as stripeCheckoutPost } from "@/app/api/stripe/create-checkout-session/route";
import { POST as mercadoPagoCheckoutPost } from "@/app/api/mercadopago/create-checkout-session/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const provider = getBillingProvider();

  if (provider === "stripe") {
    return stripeCheckoutPost(request);
  }

  if (provider === "mercadopago") {
    return mercadoPagoCheckoutPost(request);
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
