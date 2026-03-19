// Centraliza flags de funcionalidades para permitir ligar/desligar sem remover codigo.
// Para habilitar onboarding, defina NEXT_PUBLIC_FEATURE_ONBOARDING=true no .env.local.
// Para o teste externo, defina NEXT_PUBLIC_EXTERNAL_TEST_MODE=true.

const toBool = (value?: string | null) =>
  (value || "").trim().toLowerCase() === "true";

export const featureFlags = {
  onboarding: toBool(process.env.NEXT_PUBLIC_FEATURE_ONBOARDING),
  externalTestMode: toBool(process.env.NEXT_PUBLIC_EXTERNAL_TEST_MODE),
};

const externallyBlockedTools = new Set(["reports"]);

export const isOnboardingEnabled = () => featureFlags.onboarding;
export const isExternalTestModeEnabled = () => featureFlags.externalTestMode;
export const isDashboardToolEnabled = (toolId: string) =>
  !featureFlags.externalTestMode || !externallyBlockedTools.has(toolId);
export const isGoldListEnabled = () => isDashboardToolEnabled("gold-list");
export const isReportsEnabled = () => isDashboardToolEnabled("reports");
