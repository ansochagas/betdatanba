export type BillingProvider = "stripe" | "mercadopago";

const DEFAULT_BILLING_PROVIDER: BillingProvider = "stripe";

const normalizeProvider = (raw: string | undefined | null): BillingProvider => {
  const value = (raw || "").trim().toLowerCase();
  return value === "mercadopago" ? "mercadopago" : "stripe";
};

export const getBillingProvider = (): BillingProvider => {
  return normalizeProvider(process.env.BILLING_PROVIDER);
};

export const getPublicBillingProvider = (): BillingProvider => {
  return normalizeProvider(
    process.env.NEXT_PUBLIC_BILLING_PROVIDER || process.env.BILLING_PROVIDER
  );
};

export const isStripeBilling = (
  provider: BillingProvider = getBillingProvider()
): boolean => {
  return provider === "stripe";
};

export const isMercadoPagoBilling = (
  provider: BillingProvider = getBillingProvider()
): boolean => {
  return provider === "mercadopago";
};

export const getBillingProviderLabel = (
  provider: BillingProvider = getBillingProvider()
): string => {
  if (provider === "mercadopago") return "Mercado Pago";
  return "Stripe";
};

export const getBillingNotReadyMessage = (
  provider: BillingProvider = getBillingProvider()
): string => {
  return `Provider de billing "${provider}" nao disponivel.`;
};

export { DEFAULT_BILLING_PROVIDER };
