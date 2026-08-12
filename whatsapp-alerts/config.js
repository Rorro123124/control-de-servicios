require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Falta la variable de entorno " + name + ". Revisa tu archivo .env");
  }
  return value;
}

module.exports = {
  telegramToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  groqApiKey: requireEnv("GROQ_API_KEY"),
  supabase: {
    url: requireEnv("SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },
  defaultAlertTo: process.env.DEFAULT_ALERT_CHAT_ID || null,
  cronSchedule: process.env.CRON_SCHEDULE || "*/30 * * * *",
  reportSchedule: process.env.REPORT_SCHEDULE || "0 21 * * *",
  customerBotBusinessId: process.env.CUSTOMER_BOT_BUSINESS_ID || null,
};
