import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeBrazilPhone } from "@/lib/phone-utils";
import { sendSmsDevOtp } from "@/lib/smsdev";

export const dynamic = "force-dynamic";

const OTP_EXPIRATION_MINUTES = 5;
const MIN_INTERVAL_MS = 20 * 1000; // 1 envio a cada 20s
const MAX_SENDS_PER_HOUR = 5;

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // NextRequest não expõe req.ip; usar cabeçalho como melhor esforço
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    const normalizedPhone = normalizeBrazilPhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Telefone inválido. Use DDD + número." },
        { status: 400 }
      );
    }

    // Bloquear reuso de telefone já verificado
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        phoneVerifiedAt: {
          not: null,
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este telefone já está vinculado a uma conta." },
        { status: 400 }
      );
    }

    const now = new Date();
    const record = await prisma.phoneVerification.findUnique({
      where: { phone: normalizedPhone },
    });

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    let sentCount = 1;

    if (record) {
      const sinceLastSend = now.getTime() - record.lastSentAt.getTime();
      const sentCountWindow =
        record.lastSentAt > oneHourAgo ? record.sentCount : 0;

      if (sinceLastSend < MIN_INTERVAL_MS) {
        return NextResponse.json(
          { error: "Aguarde alguns segundos antes de reenviar o código." },
          { status: 429 }
        );
      }

      if (sentCountWindow >= MAX_SENDS_PER_HOUR) {
        return NextResponse.json(
          { error: "Limite de envios por hora atingido. Tente mais tarde." },
          { status: 429 }
        );
      }

      sentCount = sentCountWindow + 1;
    }

    // Gerar e armazenar OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(
      now.getTime() + OTP_EXPIRATION_MINUTES * 60 * 1000
    );
    const ip = getClientIp(request);

    const verification = await prisma.phoneVerification.upsert({
      where: { phone: normalizedPhone },
      create: {
        phone: normalizedPhone,
        codeHash,
        expiresAt,
        attempts: 0,
        sentCount,
        lastSentAt: now,
        status: "PENDING",
        ip,
      },
      update: {
        codeHash,
        expiresAt,
        attempts: 0,
        sentCount,
        lastSentAt: now,
        status: "PENDING",
        ip,
      },
    });

    await sendSmsDevOtp({
      number: normalizedPhone,
      code,
      refer: verification.id,
    });

    return NextResponse.json({
      success: true,
      expiresInSeconds: OTP_EXPIRATION_MINUTES * 60,
      message: "Código enviado por SMS.",
    });
  } catch (error: any) {
    console.error("Erro ao enviar OTP:", error);
    return NextResponse.json(
      { error: "Erro ao enviar código. Tente novamente." },
      { status: 500 }
    );
  }
}
