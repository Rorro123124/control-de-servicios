const cron = require("node-cron");
const config = require("./config");
const { createInventoryService } = require("./inventoryService");
const { buildAlertMessage } = require("./alertEngine");
const { createWhatsappSender } = require("./whatsappService");
const { createAiService } = require("./aiService");
const { startTelegramBot } = require("./telegramBot");
const { createServer } = require("./server");
const reportService = require("./reportService");

async function main() {
  const inventoryService = createInventoryService({
    supabaseUrl: config.supabase.url,
    serviceRoleKey: config.supabase.serviceRoleKey,
  });
  const sendMessage = await createWhatsappSender({ telegramToken: config.telegramToken });
  const askAi = await createAiService({ apiKey: config.groqApiKey });

  async function checkAllBusinesses() {
    try {
      const businesses = await inventoryService.getBusinesses();

      for (const business of businesses) {
        const chatId = business.alert_whatsapp_to || config.defaultAlertTo;
        if (!chatId) {
          console.log("[" + business.name + "] sin Chat ID configurado, se omite.");
          continue;
        }

        try {
          const products = await inventoryService.getProductsForBusiness(business.id);
          const message = buildAlertMessage(products);

          if (!message) {
            console.log("[" + new Date().toLocaleString() + "] " + business.name + ": inventario OK.");
            continue;
          }

          const fullMessage = business.name + "\n\n" + message;
          await sendMessage(chatId, fullMessage);
          console.log("[" + new Date().toLocaleString() + "] " + business.name + ": alerta enviada.");
        } catch (err) {
          console.error("Error revisando " + business.name + ":", err.message || err);
        }
      }
    } catch (err) {
      console.error("Error obteniendo negocios:", err.message || err);
    }
  }

  async function sendDailyReports() {
    try {
      const businesses = await inventoryService.getBusinesses();

      for (const business of businesses) {
        const chatId = business.alert_whatsapp_to || config.defaultAlertTo;
        if (!chatId) continue;

        try {
          const products = await inventoryService.getProductsForBusiness(business.id);
          const invoicesHoy = await inventoryService.getInvoicesToday(business.id);
          const todayStr = new Date().toISOString().slice(0, 10);
          const report = reportService.computeDailyReport(products, todayStr);
          const buyersLines = reportService.buildBuyersLines(invoicesHoy);
          const mensaje = reportService.buildReportMessage(business.name, report, buyersLines);

          if (report.unidadesTotales > 0) {
            const chartUrl = reportService.buildChartUrl(report);
            await sendMessage.sendPhoto(chatId, chartUrl, mensaje);
          } else {
            await sendMessage(chatId, mensaje);
          }
          console.log("[" + new Date().toLocaleString() + "] " + business.name + ": reporte diario enviado.");
        } catch (err) {
          console.error("Error enviando reporte de " + business.name + ":", err.message || err);
        }
      }
    } catch (err) {
      console.error("Error obteniendo negocios para reporte:", err.message || err);
    }
  }

  console.log("Worker de alertas iniciado. Revisando cada: " + config.cronSchedule);
  console.log("Reporte diario programado: " + config.reportSchedule);
  await checkAllBusinesses();
  cron.schedule(config.cronSchedule, checkAllBusinesses);
  cron.schedule(config.reportSchedule, sendDailyReports);

  startTelegramBot({
    token: config.telegramToken,
    inventoryService: inventoryService,
    askAi: askAi,
    reportService: reportService,
  });

  const app = createServer({ inventoryService, askAi });
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("Servidor HTTP escuchando en el puerto " + port);
  });
}

main().catch((err) => console.error("Error fatal:", err.message || err));
