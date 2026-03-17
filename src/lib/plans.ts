export type SportAccess = "nba" | "csgo";

type PlanDefinition = {
  id: string;
  label: string;
  periodDays: number;
  sports: SportAccess[];
  legacy?: boolean;
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "nba_trial",
    label: "Trial NBA",
    periodDays: 1,
    sports: ["nba"],
  },
  {
    id: "nba_monthly",
    label: "NBA Mensal",
    periodDays: 30,
    sports: ["nba"],
  },
  {
    id: "nba_quarterly",
    label: "NBA Trimestral",
    periodDays: 90,
    sports: ["nba"],
  },
  {
    id: "nba_semestral",
    label: "NBA Semestral",
    periodDays: 180,
    sports: ["nba"],
  },
  {
    id: "combo_manual",
    label: "Combo Manual CS + NBA",
    periodDays: 30,
    sports: ["nba", "csgo"],
  },
  // Legado: mantidos para compatibilidade de base já existente.
  {
    id: "pro_plan",
    label: "Plano Legado",
    periodDays: 30,
    sports: ["nba"],
    legacy: true,
  },
  {
    id: "plan_monthly",
    label: "Plano Legado Mensal",
    periodDays: 30,
    sports: ["nba"],
    legacy: true,
  },
  {
    id: "plan_quarterly",
    label: "Plano Legado Trimestral",
    periodDays: 90,
    sports: ["nba"],
    legacy: true,
  },
  {
    id: "plan_semestral",
    label: "Plano Legado Semestral",
    periodDays: 180,
    sports: ["nba"],
    legacy: true,
  },
];

const PLAN_INDEX = new Map<string, PlanDefinition>(
  PLAN_DEFINITIONS.map((plan) => [plan.id, plan])
);

const normalize = (value: unknown): string => {
  return String(value || "").trim().toLowerCase();
};

export const getPlanDefinition = (planId: string | null | undefined): PlanDefinition | null => {
  if (!planId) return null;
  return PLAN_INDEX.get(planId) || null;
};

export const getPlanLabel = (planId: string | null | undefined): string => {
  return getPlanDefinition(planId)?.label || "Plano desconhecido";
};

export const getPlanDurationDays = (planId: string | null | undefined): number => {
  return getPlanDefinition(planId)?.periodDays || 30;
};

export const hasSportAccessForPlan = (
  planId: string | null | undefined,
  sport: SportAccess
): boolean => {
  const plan = getPlanDefinition(planId);
  return Boolean(plan?.sports.includes(sport));
};

export const resolveSportAccess = (
  planId: string | null | undefined,
  subscriptionStatus: string | null | undefined
): { hasNbaAccess: boolean; hasCsgoAccess: boolean } => {
  const status = normalize(subscriptionStatus);
  const statusAllowsAccess =
    status === "active" ||
    status === "trialing";

  if (!statusAllowsAccess) {
    return { hasNbaAccess: false, hasCsgoAccess: false };
  }

  const plan = getPlanDefinition(planId);

  if (plan) {
    return {
      hasNbaAccess: plan.sports.includes("nba"),
      hasCsgoAccess: plan.sports.includes("csgo"),
    };
  }

  // Fallback seguro para não quebrar usuários trial sem plano mapeado.
  if (status === "trialing" || status === "active") {
    return { hasNbaAccess: true, hasCsgoAccess: false };
  }

  return { hasNbaAccess: false, hasCsgoAccess: false };
};

export const isNbaPlan = (planId: string | null | undefined): boolean => {
  return hasSportAccessForPlan(planId, "nba");
};

export const getPlanCatalog = (): PlanDefinition[] => {
  return [...PLAN_DEFINITIONS];
};

