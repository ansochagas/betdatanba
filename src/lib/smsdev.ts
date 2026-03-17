const SMSDEV_BASE = process.env.SMSDEV_BASE || "https://api.smsdev.com.br/v1";
const SMSDEV_KEY = process.env.SMSDEV_KEY;

type SendOtpParams = {
  number: string;
  code: string;
  refer?: string;
};

export async function sendSmsDevOtp({
  number,
  code,
  refer,
}: SendOtpParams): Promise<{ id?: string; raw: any }> {
  if (!SMSDEV_KEY) {
    throw new Error("SMSDEV_KEY não configurada");
  }

  const params = new URLSearchParams();
  params.set("key", SMSDEV_KEY);
  params.set("type", "9");
  params.set("number", number);
  params.set("msg", `Seu código é ${code}. Válido por 5 minutos. CS:GO Scout`);
  if (refer) {
    params.set("refer", refer);
  }

  const response = await fetch(`${SMSDEV_BASE}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const text = await response.text();
  let data: any = undefined;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data?.error
        ? data.error
        : `Falha ao enviar SMS (status ${response.status})`
    );
  }

  if (typeof data === "object" && data?.error) {
    throw new Error(data.error);
  }

  const id =
    typeof data === "object" && data?.id
      ? String(data.id)
      : undefined;

  return { id, raw: data };
}
