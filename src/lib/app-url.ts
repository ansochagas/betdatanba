const LOCAL_APP_URL = "http://localhost:3000";

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const normalizeHostToHttpsUrl = (value: string): string => {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `https://${normalized.replace(/^\/+/, "")}`;
};

export const getPublicAppUrl = (): string => {
  const explicit =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (explicit) {
    return normalizeHostToHttpsUrl(explicit);
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return normalizeHostToHttpsUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
  }

  if (process.env.VERCEL_URL) {
    return normalizeHostToHttpsUrl(process.env.VERCEL_URL);
  }

  return LOCAL_APP_URL;
};

export const getInternalAppUrl = (): string => {
  const internal = process.env.INTERNAL_APP_URL;
  if (internal) {
    return normalizeUrl(internal);
  }

  return getPublicAppUrl();
};

export const isLocalAppUrl = (value: string = getPublicAppUrl()): boolean => {
  return value.includes("localhost") || value.includes("127.0.0.1");
};
