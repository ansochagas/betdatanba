import { getPlanDurationDays } from "@/lib/plans";

export type BillingPlanConfig = {
  planId: string;
  title: string;
  description: string;
  unitPrice: number;
  currencyId: "BRL";
  periodDays: number;
};

type BillingPlanContext = {
  email?: string | null;
  userId?: string | null;
};

export type BillingPlanView = {
  id: string;
  name: string;
  priceDisplay: string;
  description: string;
  savings: string | null;
  periodDays: number;
};

const CANONICAL_PLAN_BY_ID: Record<string, string> = {
  nba_trial: "nba_trial",
  nba_monthly: "nba_monthly",
  nba_quarterly: "nba_quarterly",
  nba_semestral: "nba_semestral",
  combo_manual: "combo_manual",
  // Legado
  pro_plan: "nba_monthly",
  plan_monthly: "nba_monthly",
  plan_quarterly: "nba_quarterly",
  plan_semestral: "nba_semestral",
};

const PLAN_PRICE_MAP: Record<string, Omit<BillingPlanConfig, "periodDays">> = {
  nba_trial: {
    planId: "nba_trial",
    title: "Trial NBA",
    description: "Acesso de teste da NBA",
    unitPrice: 0,
    currencyId: "BRL",
  },
  nba_monthly: {
    planId: "nba_monthly",
    title: "NBA Mensal",
    description: "Acesso completo da NBA por 30 dias",
    unitPrice: 49.9,
    currencyId: "BRL",
  },
  nba_quarterly: {
    planId: "nba_quarterly",
    title: "NBA Trimestral",
    description: "Acesso completo da NBA por 90 dias",
    unitPrice: 99.9,
    currencyId: "BRL",
  },
  nba_semestral: {
    planId: "nba_semestral",
    title: "NBA Semestral",
    description: "Acesso completo da NBA por 180 dias",
    unitPrice: 189.9,
    currencyId: "BRL",
  },
  combo_manual: {
    planId: "combo_manual",
    title: "Combo Manual CS + NBA",
    description: "Combo manual com acesso NBA e CS",
    unitPrice: 0,
    currencyId: "BRL",
  },
};

const ORDERED_PLAN_IDS = [
  "nba_monthly",
  "nba_quarterly",
  "nba_semestral",
] as const;

const formatCurrencyBrl = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const getPromoTesterEmails = (): string[] =>
  String(process.env.NBA_MONTHLY_TESTER_PROMO_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const getPromoMonthlyPrice = (): number => {
  const rawValue = Number(process.env.NBA_MONTHLY_TESTER_PROMO_PRICE || "10");
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 10;
  }
  return Math.round(rawValue * 100) / 100;
};

export const isMonthlyTesterPromoEligible = (
  context: BillingPlanContext = {}
): boolean => {
  const email = String(context.email || "")
    .trim()
    .toLowerCase();

  if (!email) return false;
  return getPromoTesterEmails().includes(email);
};

const applyBillingPlanOverrides = (
  config: BillingPlanConfig,
  context: BillingPlanContext = {}
): BillingPlanConfig => {
  if (
    config.planId === "nba_monthly" &&
    isMonthlyTesterPromoEligible(context)
  ) {
    return {
      ...config,
      unitPrice: getPromoMonthlyPrice(),
      description: "Acesso completo da NBA por 30 dias - valor promocional de validação",
    };
  }

  return config;
};

export const resolveBillingPlanId = (
  planId: string | null | undefined
): string => {
  const normalized = String(planId || "").trim().toLowerCase();
  return CANONICAL_PLAN_BY_ID[normalized] || "nba_monthly";
};

export const getBillingPlanConfig = (
  planId: string | null | undefined,
  context: BillingPlanContext = {}
): BillingPlanConfig => {
  const canonicalPlanId = resolveBillingPlanId(planId);
  const config = PLAN_PRICE_MAP[canonicalPlanId] || PLAN_PRICE_MAP.nba_monthly;

  return applyBillingPlanOverrides(
    {
      ...config,
      periodDays: getPlanDurationDays(config.planId),
    },
    context
  );
};

export const getBillingPlansForUser = (
  context: BillingPlanContext = {}
): BillingPlanView[] => {
  return ORDERED_PLAN_IDS.map((planId) => {
    const plan = getBillingPlanConfig(planId, context);
    const isPromoMonthly =
      plan.planId === "nba_monthly" && isMonthlyTesterPromoEligible(context);

    let savings: string | null = null;
    if (plan.planId === "nba_quarterly") {
      savings = "Economize vs. mensal";
    } else if (plan.planId === "nba_semestral") {
      savings = "Mais barato por mês";
    }

    if (isPromoMonthly) {
      savings = "Valor temporário para validação";
    }

    let priceDisplay = `${formatCurrencyBrl(plan.unitPrice)}/mes`;
    if (plan.planId === "nba_quarterly") {
      priceDisplay = `${formatCurrencyBrl(plan.unitPrice)} / 3 meses`;
    } else if (plan.planId === "nba_semestral") {
      priceDisplay = `${formatCurrencyBrl(plan.unitPrice)} / 6 meses`;
    }

    return {
      id: plan.planId,
      name: plan.title,
      priceDisplay,
      description:
        isPromoMonthly
          ? "Acesso completo da NBA com valor promocional temporário para teste"
          : plan.planId === "nba_monthly"
            ? "Acesso completo da NBA com cobrança mensal"
            : plan.planId === "nba_quarterly"
              ? "Melhor custo trimestral para NBA"
              : "Economia máxima no semestre NBA",
      savings,
      periodDays: plan.periodDays,
    };
  });
};

export const getMonthlyEquivalentRevenue = (
  planId: string | null | undefined
): number => {
  const config = getBillingPlanConfig(planId);
  if (!config.unitPrice || config.periodDays <= 0) return 0;
  return (config.unitPrice / config.periodDays) * 30;
};
