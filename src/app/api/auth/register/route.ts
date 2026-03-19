import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { notifyAdminTelegram } from "@/lib/admin-notify";
import { isPhoneOtpRequired } from "@/lib/phone-otp";
import { normalizeBrazilPhone } from "@/lib/phone-utils";
import { prisma } from "@/lib/prisma";

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, otp } = await request.json();
    const phoneOtpRequired = isPhoneOtpRequired();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (phoneOtpRequired && (!phone || !otp)) {
      return NextResponse.json(
        { error: "Telefone e código por SMS são obrigatórios." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de e-mail inválido." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    const normalizedPhone = phone ? normalizeBrazilPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return NextResponse.json(
        { error: "Telefone inválido. Use DDD + número." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 400 }
      );
    }

    if (normalizedPhone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
      });

      if (existingPhoneUser) {
        return NextResponse.json(
          { error: "Este telefone já está vinculado a uma conta." },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    let attempts = 0;

    if (phoneOtpRequired) {
      const verification = await prisma.phoneVerification.findUnique({
        where: { phone: normalizedPhone! },
      });

      if (!verification) {
        return NextResponse.json(
          { error: "Envie o código por SMS antes de cadastrar." },
          { status: 400 }
        );
      }

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

      attempts = verification.attempts ?? 0;
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.phoneVerification.update({
          where: { phone: normalizedPhone! },
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
          where: { phone: normalizedPhone! },
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
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: normalizedPhone,
          phoneVerifiedAt: phoneOtpRequired ? now : null,
        },
      });

      if (phoneOtpRequired && normalizedPhone) {
        await tx.phoneVerification.update({
          where: { phone: normalizedPhone },
          data: {
            status: "VERIFIED",
            attempts: attempts + 1,
            expiresAt: now,
          },
        });
      }

      return user;
    });

    try {
      await notifyAdminTelegram(
        [
          "NOVO CADASTRO",
          `E-mail: ${email}`,
          `Nome: ${name}`,
          normalizedPhone ? `Telefone: ${normalizedPhone}` : "Telefone: não informado",
          "Status inicial: sem plano ativo",
        ].join("\n")
      );
    } catch (notifyError) {
      console.warn("Falha ao notificar admin:", notifyError);
    }

    return NextResponse.json(
      { message: "Usuário criado com sucesso.", userId: created.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail ou telefone." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
