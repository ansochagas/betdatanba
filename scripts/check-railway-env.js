/* eslint-disable no-console */
const required = [
  "APP_URL",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "INTERNAL_APP_URL",
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "BILLING_PROVIDER",
  "NEXT_PUBLIC_BILLING_PROVIDER",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "API_BASKETBALL_KEY",
  "BETSAPI_TOKEN",
];

const optional = [
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MERCADOPAGO_WEBHOOK_URL",
  "POSTGRES_DATABASE_URL",
  "TELEGRAM_BOT_TOKEN",
];

const printList = (label, keys) => {
  console.log(`\n${label}`);
  for (const key of keys) {
    const value = process.env[key];
    console.log(`- ${key}: ${value ? "OK" : "MISSING"}`);
  }
};

const missing = required.filter((key) => !process.env[key]);

printList("Required", required);
printList("Optional", optional);

if (missing.length) {
  console.error(`\nEnv incompleta. Faltando ${missing.length} variaveis obrigatorias.`);
  process.exit(1);
}

console.log("\nEnv Railway valida.");
