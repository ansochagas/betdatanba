import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getPlanDurationDays } from "@/lib/plans";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = [
  "admin@csgoscout.com",
  "andersonchagas45@gmail.com",
];

function isAdmin(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const emailFilter = searchParams.get("email")?.trim() || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
  const skip = (page - 1) * limit;

  const where = emailFilter
    ? { email: { contains: emailFilter, mode: "insensitive" as const } }
    : undefined;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    data: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      telegramId: u.telegramId,
      createdAt: u.createdAt,
      subscription: u.subscription,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const email: string | undefined = body.email;
  if (!email) {
    return NextResponse.json(
      { success: false, error: "Informe o email do usuário" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  const planId: string | undefined = body.planId;
  const status: string | undefined = body.status;
  const newEnd: string | undefined = body.currentPeriodEnd;
  const trialEndsAt: string | null | undefined = body.trialEndsAt;

  const now = new Date();
  const currentPeriodEnd =
    newEnd !== undefined
      ? new Date(newEnd)
      : planId
      ? (() => {
          const d = new Date(now);
          d.setDate(d.getDate() + getPlanDurationDays(planId));
          return d;
        })()
      : user.subscription?.currentPeriodEnd || now;

  const updated = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planId: planId || undefined,
      status: status || undefined,
      currentPeriodStart: user.subscription?.currentPeriodStart || now,
      currentPeriodEnd,
      trialEndsAt:
        trialEndsAt === undefined
          ? user.subscription?.trialEndsAt
          : trialEndsAt
          ? new Date(trialEndsAt)
          : null,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId: user.id,
      planId: planId || "nba_monthly",
      status: status || "active",
      currentPeriodStart: now,
      currentPeriodEnd,
      trialEndsAt:
        trialEndsAt === undefined
          ? null
          : trialEndsAt
          ? new Date(trialEndsAt)
          : null,
      cancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({
    success: true,
    data: updated,
  });
}
