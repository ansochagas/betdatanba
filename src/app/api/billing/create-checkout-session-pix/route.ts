import { NextRequest, NextResponse } from "next/server";
import {
  getBillingNotReadyMessage,
  getBillingProvider,
} from "@/lib/billing/provider";
import { POST as stripePixCheckoutPost } from "@/app/api/stripe/create-checkout-session-pix/route";
import { POST as mercadoPagoPixCheckoutPost } from "@/app/api/mercadopago/create-checkout-session-pix/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const provider = getBillingProvider();

  if (provider === "stripe") {
    return stripePixCheckoutPost(request);
  }

  if (provider === "mercadopago") {
    return mercadoPagoPixCheckoutPost(request);
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
