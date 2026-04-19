import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const adminEmails = ["andersonchagas45@gmail.com"];

function isAdmin(email?: string | null): boolean {
  return Boolean(email && adminEmails.includes(email));
}

type UnlinkRequestBody = {
  userId?: string;
  email?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Usuario nao autenticado" },
        { status: 401 }
      );
    }

    const requesterEmail = session.user.email;
    const requesterUserId = (session.user as { id?: string }).id;

    let body: UnlinkRequestBody = {};
    try {
      body = (await request.json()) as UnlinkRequestBody;
    } catch {
      body = {};
    }

    const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const targetEmail = typeof body.email === "string" ? body.email.trim() : "";
    const hasAdminTarget = Boolean(targetUserId || targetEmail);

    if (hasAdminTarget && !isAdmin(requesterEmail)) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const targetUser = hasAdminTarget
      ? targetUserId
        ? await prisma.user.findUnique({ where: { id: targetUserId } })
        : await prisma.user.findFirst({
            where: {
              email: { equals: targetEmail },
            },
          })
      : requesterUserId
        ? await prisma.user.findUnique({ where: { id: requesterUserId } })
        : await prisma.user.findUnique({ where: { email: requesterEmail } });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    const wasLinked = Boolean(targetUser.telegramId);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { telegramId: null },
      });

      await tx.telegramConfig.deleteMany({
        where: { userId: targetUser.id },
      });

      await tx.telegramLinkCode.deleteMany({
        where: { userId: targetUser.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: wasLinked
        ? "Telegram desvinculado com sucesso"
        : "Conta ja estava desvinculada",
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        wasLinked,
      },
    });
  } catch (error) {
    console.error("[telegram-unlink] Erro ao desvincular:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
