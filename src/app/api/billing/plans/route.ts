import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBillingPlansForUser } from "@/lib/billing/plan-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  const plans = getBillingPlansForUser({
    email: session?.user?.email || null,
  });

  return NextResponse.json({
    success: true,
    data: {
      plans,
    },
  });
}
