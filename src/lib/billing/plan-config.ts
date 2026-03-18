import { getPlanDurationDays } from "@/lib/plans";

export type BillingPlanConfig = {
  planId: string;
  title: string;
  description: string;
  unitPrice: number;
  currencyId: "BRL";
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
    description: "Acesso de teste NBA",
    unitPrice: 0,
    currencyId: "BRL",
  },
  nba_monthly: {
    planId: "nba_monthly",
    title: "NBA Mensal",
    description: "Acesso completo NBA por 30 dias",
    unitPrice: 49.9,
    currencyId: "BRL",
  },
  nba_quarterly: {
    planId: "nba_quarterly",
    title: "NBA Trimestral",
    description: "Acesso completo NBA por 90 dias",
    unitPrice: 99.9,
    currencyId: "BRL",
  },
  nba_semestral: {
    planId: "nba_semestral",
    title: "NBA Semestral",
    description: "Acesso completo NBA por 180 dias",
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

export const resolveBillingPlanId = (
  planId: string | null | undefined
): string => {
  const normalized = String(planId || "").trim().toLowerCase();
  return CANONICAL_PLAN_BY_ID[normalized] || "nba_monthly";
};

export const getBillingPlanConfig = (
  planId: string | null | undefined
): BillingPlanConfig => {
  const canonicalPlanId = resolveBillingPlanId(planId);
  const config = PLAN_PRICE_MAP[canonicalPlanId] || PLAN_PRICE_MAP.nba_monthly;

  return {
    ...config,
    periodDays: getPlanDurationDays(config.planId),
  };
};

export const getMonthlyEquivalentRevenue = (
  planId: string | null | undefined
): number => {
  const config = getBillingPlanConfig(planId);
  if (!config.unitPrice || config.periodDays <= 0) return 0;
  return (config.unitPrice / config.periodDays) * 30;
};
