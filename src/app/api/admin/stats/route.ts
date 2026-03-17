import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verificar se usuário é admin
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se é admin (simples check por email)
    const adminEmails = [
      "admin@csgoscout.com",
      "andersonchagas45@gmail.com", // Conta admin criada
    ];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Buscar estatísticas
    const [
      totalUsers,
      activeSubscriptions,
      trialUsers,
      telegramLinkedUsers,
      recentSignups,
      subscriptions,
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),

      // Assinaturas ativas
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
        },
      }),

      // Usuários em trial
      prisma.subscription.count({
        where: {
          status: "TRIALING",
        },
      }),

      // Usuários com Telegram vinculado
      prisma.user.count({
        where: {
          telegramId: {
            not: null,
          },
        },
      }),

      // Novos cadastros nos últimos 30 dias
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Todas as assinaturas para calcular receita
      prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
        },
      }),
    ]);

    // Calcular receita mensal (simplificado - assumindo R$ 29.90 por assinatura ativa)
    const monthlyRevenue = activeSubscriptions * 29.9;

    const stats = {
      totalUsers,
      activeSubscriptions,
      trialUsers,
      telegramLinkedUsers,
      recentSignups,
      monthlyRevenue,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas admin:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
