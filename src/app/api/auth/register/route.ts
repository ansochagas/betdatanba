import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeBrazilPhone } from "@/lib/phone-utils";
import { notifyAdminTelegram } from "@/lib/admin-notify";

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, otp } = await request.json();

    // Validate input
    if (!name || !email || !password || !phone || !otp) {
      return NextResponse.json(
        { error: "Nome, email, telefone, senha e código são obrigatórios" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeBrazilPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Telefone inválido. Use DDD + número." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    // Check if phone already used
    const existingPhoneUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: "Este telefone já está vinculado a uma conta" },
        { status: 400 }
      );
    }

    // Validate OTP
    const verification = await prisma.phoneVerification.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Envie o código por SMS antes de cadastrar." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (verification.expiresAt < now) {
      return NextResponse.json(
        { error: "Código expirado. Solicite um novo código." },
        { status: 400 }
      );
    }

    if (verification.status === "BLOCKED") {
      return NextResponse.json(
        { error: "Código bloqueado por tentativas excedidas." },
        { status: 400 }
      );
    }

    const attempts = verification.attempts ?? 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.phoneVerification.update({
        where: { phone: normalizedPhone },
        data: { status: "BLOCKED" },
      });
      return NextResponse.json(
        { error: "Código bloqueado por tentativas excedidas." },
        { status: 400 }
      );
    }

    const isValidCode = await bcrypt.compare(otp, verification.codeHash);

    if (!isValidCode) {
      const newAttempts = attempts + 1;
      await prisma.phoneVerification.update({
        where: { phone: normalizedPhone },
        data: {
          attempts: newAttempts,
          status: newAttempts >= MAX_OTP_ATTEMPTS ? "BLOCKED" : "PENDING",
        },
      });

      const remaining = Math.max(MAX_OTP_ATTEMPTS - newAttempts, 0);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Código incorreto. Tentativas restantes: ${remaining}`
              : "Código bloqueado por tentativas excedidas.",
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: normalizedPhone,
        phoneVerifiedAt: now,
      },
    });

    // Marcar verificação como usada
    await prisma.phoneVerification.update({
      where: { phone: normalizedPhone },
      data: {
        status: "VERIFIED",
        attempts: attempts + 1,
        expiresAt: now,
      },
    });

    // Create trial subscription (1 dia - conforme marketing)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 1);

    await prisma.subscription.create({
      data: {
        userId: user.id,
        status: "trialing",
        planId: "nba_trial",
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
        trialEndsAt: trialEndDate,
      },
    });

    try {
      await notifyAdminTelegram(
        [
          "NOVO CADASTRO",
          `Email: ${email}`,
          `Nome: ${name}`,
          `Telefone: ${normalizedPhone}`,
          `Trial ate: ${trialEndDate.toISOString()}`,
        ].join("\n")
      );
    } catch (notifyError) {
      console.warn("Falha ao notificar admin:", notifyError);
    }

    return NextResponse.json(
      { message: "Usuário criado com sucesso", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
