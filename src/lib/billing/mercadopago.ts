import { createHmac, timingSafeEqual } from "crypto";
import { getBillingPlanConfig } from "@/lib/billing/plan-config";
import { getPublicAppUrl, isLocalAppUrl } from "@/lib/app-url";

const MP_API_BASE_URL = process.env.MERCADOPAGO_API_BASE_URL
  ? process.env.MERCADOPAGO_API_BASE_URL.replace(/\/+$/, "")
  : "https://api.mercadopago.com";

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MercadoPagoPayment = {
  id: number;
  status: string;
  payer?: {
    id?: string | number;
    email?: string;
  };
  metadata?: Record<string, string | number | boolean | null>;
  additional_info?: {
    items?: Array<{
      id?: string;
      title?: string;
    }>;
  };
  external_reference?: string;
};

const getAccessToken = (): string => {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN nao configurado");
  }
  return token;
};

const getWebhookSecret = (): string => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET nao configurado");
  }
  return secret;
};

const getNotificationUrl = (): string => {
  const custom = process.env.MERCADOPAGO_WEBHOOK_URL;
  if (custom) return custom;
  return `${getPublicAppUrl()}/api/webhooks/billing`;
};

const mpRequest = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${MP_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mercado Pago API ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
};

export const createMercadoPagoCheckout = async (params: {
  planId: string;
  userId: string;
  email: string;
  paymentMode: "checkout" | "card" | "pix";
}) => {
  const plan = getBillingPlanConfig(params.planId);
  const baseUrl = getPublicAppUrl();
  const isLocalEnvironment = isLocalAppUrl(baseUrl);

  const payload: Record<string, unknown> = {
    items: [
      {
        id: plan.planId,
        title: plan.title,
        description: plan.description,
        quantity: 1,
        currency_id: plan.currencyId,
        unit_price: plan.unitPrice,
      },
    ],
    payer: {
      email: params.email,
    },
    external_reference: params.userId,
    metadata: {
      userId: params.userId,
      planId: plan.planId,
      periodDays: String(plan.periodDays),
      paymentMode: params.paymentMode,
    },
    back_urls: {
      success: `${baseUrl}/dashboard?success=true`,
      pending: `${baseUrl}/upgrade?pending=true`,
      failure: `${baseUrl}/upgrade?canceled=true`,
    },
    notification_url: getNotificationUrl(),
    statement_descriptor: "BETDATA",
  };

  // Em ambiente local, o Mercado Pago costuma rejeitar auto_return.
  if (!isLocalEnvironment) {
    payload.auto_return = "approved";
  }

  const preference = await mpRequest<MercadoPagoPreferenceResponse>(
    "/checkout/preferences",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return {
    id: preference.id,
    url: preference.init_point || preference.sandbox_init_point || null,
    planId: plan.planId,
    periodDays: plan.periodDays,
  };
};

export const getMercadoPagoPayment = async (
  paymentId: string | number
): Promise<MercadoPagoPayment> => {
  return mpRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`);
};

const parseSignatureHeader = (
  headerValue: string | null
): { ts: string | null; v1: string | null } => {
  if (!headerValue) {
    return { ts: null, v1: null };
  }

  const parts = headerValue.split(",").map((part) => part.trim());
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "ts") ts = value || null;
    if (key === "v1") v1 = value || null;
  }

  return { ts, v1 };
};

const safeLowerAlnum = (value: string): string => {
  return /^[a-zA-Z0-9]+$/.test(value) ? value.toLowerCase() : value;
};

export const validateMercadoPagoWebhookSignature = (params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean => {
  let secret: string;
  try {
    secret = getWebhookSecret();
  } catch {
    return false;
  }

  const { ts, v1 } = parseSignatureHeader(params.xSignature);
  if (!ts || !v1 || !params.xRequestId || !params.dataId) {
    return false;
  }

  const normalizedDataId = safeLowerAlnum(params.dataId);
  const manifest = `id:${normalizedDataId};request-id:${params.xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
};
