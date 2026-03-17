import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicAppUrl } from "@/lib/app-url";
import { getBillingProvider } from "@/lib/billing/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      appUrl: getPublicAppUrl(),
      billingProvider: getBillingProvider(),
      sport: process.env.SPORT || "nba",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error?.message || "Healthcheck failed",
      },
      { status: 500 }
    );
  }
}
