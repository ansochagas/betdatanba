import { NextResponse } from "next/server";
import {
  getBillingProvider,
  getBillingProviderLabel,
  isMercadoPagoBilling,
  isStripeBilling,
} from "@/lib/billing/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getBillingProvider();

  return NextResponse.json({
    success: true,
    data: {
      provider,
      label: getBillingProviderLabel(provider),
      capabilities: {
        checkoutCard: isStripeBilling(provider) || isMercadoPagoBilling(provider),
        checkoutPix: isStripeBilling(provider) || isMercadoPagoBilling(provider),
        webhook: isStripeBilling(provider) || isMercadoPagoBilling(provider),
      },
      timestamp: new Date().toISOString(),
    },
  });
}
