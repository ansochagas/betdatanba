"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import BrandLogo from "@/components/brand/BrandLogo";

const REQUIRE_PHONE_OTP =
  process.env.NEXT_PUBLIC_REQUIRE_PHONE_OTP === "true";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      setLoading(false);
      return;
    }

    if (REQUIRE_PHONE_OTP && !formData.phone) {
      setError("Informe seu telefone para validar o cadastro.");
      setLoading(false);
      return;
    }

    if (REQUIRE_PHONE_OTP && !formData.otp) {
      setError("Informe o código recebido por SMS.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          otp: formData.otp || null,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar conta.");
      }

      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Conta criada, mas houve erro no login automático.");
      }

      router.push("/dashboard");
    } catch (registerError: any) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.phone) {
      setError("Informe seu telefone com DDD.");
      return;
    }

    setOtpLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: formData.phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar código.");
      }

      setSuccess(
        data?.message || "Código enviado por SMS. Validade: 5 minutos."
      );
    } catch (sendError: any) {
      setError(sendError.message);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-20 top-20 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[150px]" />
        <div className="absolute bottom-20 left-20 h-[500px] w-[500px] rounded-full bg-orange-500/5 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-3 inline-flex text-white">
            <BrandLogo size="lg" showMark={false} />
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-white">Criar conta</h1>
          <p className="text-gray-400">
            Crie sua conta para contratar seu plano.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Nome completo
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Seu nome completo"
              />
            </div>

            {REQUIRE_PHONE_OTP && (
              <>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Telefone com DDD
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="11999999999"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {otpLoading ? "Enviando..." : "Enviar código"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Vamos validar seu telefone antes de liberar o acesso.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Código recebido por SMS
                  </label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    required
                    value={formData.otp}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Digite o código de 6 dígitos"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                E-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Senha
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Mínimo de 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Confirmar senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Digite a senha novamente"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 font-bold text-white transition-all duration-300 hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-green-500/20">
                <span className="text-xs text-green-400">✓</span>
              </div>
              <span>Cadastre-se em menos de 1 minuto</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-green-500/20">
                <span className="text-xs text-green-400">✓</span>
              </div>
              <span>Pagamento seguro pelo Mercado Pago</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-medium text-orange-400 hover:text-orange-300"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
