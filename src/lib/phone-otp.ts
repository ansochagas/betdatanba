const parseBoolean = (value: string | undefined): boolean | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

export const TRIAL_DURATION_DAYS = 1;

export const hasSmsProviderConfigured = (): boolean =>
  Boolean(String(process.env.SMSDEV_KEY || "").trim());

export const isPhoneOtpRequired = (): boolean => {
  const explicit = parseBoolean(process.env.REQUIRE_PHONE_OTP);
  if (explicit !== null) {
    return explicit;
  }

  return hasSmsProviderConfigured();
};
