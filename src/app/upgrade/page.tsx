"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

const billingProvider = (
  process.env.NEXT_PUBLIC_BILLING_PROVIDER || "stripe"
).toLowerCase();

type UpgradePlan = {
  id: string;
  name: string;
  priceDisplay: string;
  description: string;
  priceId?: string;
  pixPriceId?: string;
  savings: string | null;
  periodDays: number;
};

const defaultPlans: UpgradePlan[] = [
  {
    id: "nba_monthly",
    name: "NBA Mensal",
    priceDisplay: "R$ 49,90/mês",
    description: "Acesso completo da NBA com cobrança mensal",
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_NBA_MONTHLY ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
    pixPriceId:
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_MONTHLY ||
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_MONTHLY,
    savings: null,
    periodDays: 30,
  },
  {
    id: "nba_quarterly",
    name: "NBA Trimestral",
    priceDisplay: "R$ 99,90 / 3 meses",
    description: "Melhor custo trimestral para NBA",
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_NBA_QUARTERLY ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY,
    pixPriceId:
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_QUARTERLY ||
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_QUARTERLY,
    savings: "Economize em relação ao mensal",
    periodDays: 90,
  },
  {
    id: "nba_semestral",
    name: "NBA Semestral",
    priceDisplay: "R$ 189,90 / 6 meses",
    description: "Economia máxima no semestre NBA",
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_NBA_SEMESTRAL ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL,
    pixPriceId:
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_SEMESTRAL ||
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_SEMESTRAL,
    savings: "Mais barato por mês",
    periodDays: 180,
  },
  {
    id: "nba_lifetime",
    name: "NBA Vitalício",
    priceDisplay: "R$ 150,00 vitalício",
    description: "Acesso vitalício completo da NBA com pagamento único",
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_NBA_LIFETIME ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_NBA_VITALICIO ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME,
    pixPriceId:
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_LIFETIME ||
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_VITALICIO ||
      process.env.NEXT_PUBLIC_STRIPE_PIX_PRICE_LIFETIME,
    savings: "Pagamento único",
    periodDays: 36500,
  },
];

const providerLabel =
  billingProvider === "mercadopago" ? "Mercado Pago" : "Stripe";

export default function Upgrade() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isMercadoPago = billingProvider === "mercadopago";
  const [plans, setPlans] = useState<UpgradePlan[]>(defaultPlans);
  const [loading, setLoading] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(defaultPlans[0]?.id || "");

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        const response = await fetch("/api/billing/plans", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!active || !response.ok || !payload?.success || !payload?.data?.plans) {
          return;
        }

        setPlans((current) => {
          const mergedPlans = (payload.data.plans as UpgradePlan[]).map((plan) => {
            const fallback = defaultPlans.find((item) => item.id === plan.id);
            return {
              ...fallback,
              ...plan,
            } as UpgradePlan;
          });

          return mergedPlans.length > 0 ? mergedPlans : current;
        });
      } catch (error) {
        console.error("Erro ao carregar planos de billing:", error);
      }
    };

    if (status !== "loading") {
      loadPlans();
    }

    return () => {
      active = false;
    };
  }, [status, session?.user?.email]);

  useEffect(() => {
    if (!plans.some((plan) => plan.id === selectedPlan) && plans[0]?.id) {
      setSelectedPlan(plans[0].id);
    }
  }, [plans, selectedPlan]);

  const ensureAuth = (): boolean => {
    if (status === "unauthenticated") {
      alert("Você precisa estar logado para contratar um plano.");
      router.push("/login?callbackUrl=/upgrade");
      return false;
    }
    if (status === "loading") return false;
    return true;
  };

  const handleUpgrade = async () => {
    if (!ensureAuth()) return;

    setLoading(true);
    try {
      const plan = plans.find((p) => p.id === selectedPlan);
      if (!plan) {
        throw new Error("Plano selecionado inválido.");
      }

      const requestBody: Record<string, string> = {
        planId: plan.id,
      };

      if (billingProvider === "stripe") {
        if (!plan.priceId) {
          throw new Error(
            "Plano ou preço não configurado. Verifique as variáveis NEXT_PUBLIC_STRIPE_PRICE_NBA_*."
          );
        }
        requestBody.priceId = plan.priceId;
      }

      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Erro ${response.status}`);
      }

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      throw new Error("URL de checkout não recebida");
    } catch (error: any) {
      console.error("Erro ao criar checkout:", error);
      alert("Não foi possível iniciar o pagamento agora. Tente novamente em alguns instantes.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePix = async () => {
    if (!ensureAuth()) return;

    setLoadingPix(true);
    try {
      const plan = plans.find((p) => p.id === selectedPlan);
      if (!plan) {
        throw new Error("Plano selecionado inválido.");
      }

      const requestBody: Record<string, string> = {
        planId: plan.id,
      };

      if (billingProvider === "stripe") {
        if (!plan.pixPriceId) {
          throw new Error(
            "Plano Pix não configurado. Verifique as variáveis NEXT_PUBLIC_STRIPE_PIX_PRICE_NBA_*."
          );
        }
        requestBody.priceId = plan.pixPriceId;
      }

      const response = await fetch("/api/billing/create-checkout-session-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Erro ${response.status}`);
      }

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      throw new Error("URL de checkout Pix não recebida");
    } catch (error: any) {
      console.error("Erro ao criar checkout PIX:", error);
      alert("Não foi possível iniciar o pagamento via Pix agora. Tente novamente em alguns instantes.");
    } finally {
      setLoadingPix(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-white">
            <BrandLogo size="md" />
          </Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            {"<- Voltar ao Dashboard"}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="font-medium text-red-400">Escolha seu plano</span>
          </div>

          <h1 className="mb-6 text-4xl font-black md:text-6xl">
            Ative seu acesso
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              completo à plataforma
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Escolha o plano ideal para acompanhar o pré-jogo, a análise de
            jogadores e Melhores do Dia.
          </p>

          <p className="text-sm text-zinc-400">
            Pagamento processado por:{" "}
            <span className="font-semibold text-zinc-200">{providerLabel}</span>
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 p-6 backdrop-blur-xl ${
                selectedPlan === plan.id
                  ? "border-orange-500 shadow-lg shadow-orange-500/20"
                  : "border-zinc-700"
              }`}
            >
              <div className="mb-2 text-sm text-gray-400">{plan.name}</div>
              <div className="mb-4 text-3xl font-black">{plan.priceDisplay}</div>
              <div className="mb-4 text-sm text-gray-300">{plan.description}</div>
              {plan.savings && (
                <div className="mb-4 text-xs text-green-400">{plan.savings}</div>
              )}

              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
                  selectedPlan === plan.id
                    ? "bg-orange-600 text-white"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                {selectedPlan === plan.id ? "Selecionado" : "Selecionar"}
              </button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-md">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:from-orange-600 hover:to-red-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? isMercadoPago
                ? "Redirecionando..."
                : "Processando..."
              : isMercadoPago
                ? "Contratar com Mercado Pago"
                : "Confirmar pagamento"}
          </button>
          <p className="mt-4 text-center text-xs text-gray-500">
            {isMercadoPago
              ? "No checkout do Mercado Pago você poderá pagar via Pix ou cartão."
              : `Cartão (recorrente) - via ${providerLabel}`}
          </p>

          {!isMercadoPago && (
            <div className="mt-4">
              <button
                onClick={handleUpgradePix}
                disabled={loadingPix}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-bold text-white transition-all duration-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingPix ? "Gerando PIX..." : "Pagar com Pix (pré-pago)"}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Pix pré-pago: acesso por{" "}
                {plans.find((p) => p.id === selectedPlan)?.periodDays ?? "X"}{" "}
                dias
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
