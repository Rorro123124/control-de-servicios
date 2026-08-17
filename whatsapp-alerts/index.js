process.on("unhandledRejection", (err) => {
  console.error("Error no atrapado (unhandledRejection), el worker sigue corriendo:", err && err.message ? err.message : err);
});
process.on("uncaughtException", (err) => {
  console.error("Error no atrapado (uncaughtException), el worker sigue corriendo:", err && err.message ? err.message : err);
});

const cron = require("node-cron");
const config = require("./config");
const { createInventoryService } = require("./inventoryService");
const { buildAlertMessage } = require("./alertEngine");
const { createWhatsappSender } = require("./whatsappService");
const { createAiService } = require("./aiService");
const { startTelegramBot } = require("./telegramBot");
const { startCustomerWhatsappBot, sendCustomerMessage } = require("./whatsappCustomerBot");
const { createServer } = require("./server");
const reportService = require("./reportService");
const { buildBackupJson } = require("./backupService");
const { buildPricingSignals } = require("./pricingCopilotService");

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

  async function sendWeeklyBackups() {
    try {
      const businesses = await inventoryService.getBusinesses();

      for (const business of businesses) {
        const chatId = business.alert_whatsapp_to || config.defaultAlertTo;
        if (!chatId) continue;

        try {
          const [products, suppliers, invoices, sellers] = await Promise.all([
            inventoryService.getProductsForBusiness(business.id),
            inventoryService.getSuppliersForBusiness(business.id),
            inventoryService.getAllInvoicesForBusiness(business.id),
            inventoryService.getSellersForBusiness(business.id),
          ]);

          const backupJson = buildBackupJson(business, products, suppliers, invoices, sellers);
          const fecha = new Date().toISOString().slice(0, 10);
          const nombreLimpio = (business.name || "negocio").replace(/[^a-zA-Z0-9]/g, "-");
          const nombreArchivo = "backup-" + nombreLimpio + "-" + fecha + ".json";

          await sendMessage.sendDocument(chatId, backupJson, nombreArchivo, "Backup automatico semanal de " + business.name);
          console.log("[" + new Date().toLocaleString() + "] " + business.name + ": backup automatico enviado.");
        } catch (err) {
          console.error("Error enviando backup de " + business.name + ":", err.message || err);
        }
      }
    } catch (err) {
      console.error("Error obteniendo negocios para backup:", err.message || err);
    }
  }

  async function sendAppointmentReminders() {
    if (!config.customerBotBusinessId) return;
    try {
      const business = await inventoryService.getBusinessById(config.customerBotBusinessId);
      if (!business) return;

      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const mananaStr = manana.toISOString().slice(0, 10);

      const citas = await inventoryService.getAppointmentsForDate(business.id, mananaStr);

      for (const cita of citas) {
        if (!cita.customer_phone) continue;
        try {
          const mensaje =
            "Hola " + cita.customer_name + "! Te recordamos tu cita manana en " + business.name +
            " a las " + cita.appointment_time.slice(0, 5) + " para " + cita.service_name +
            ". Si necesitas cambiarla, escribenos por aqui.";
          await sendCustomerMessage(cita.customer_phone, mensaje);
          console.log("[" + new Date().toLocaleString() + "] Recordatorio enviado a " + cita.customer_name);
        } catch (err) {
          console.error("Error enviando recordatorio a " + cita.customer_name + ":", err.message || err);
        }
      }
    } catch (err) {
      console.error("Error enviando recordatorios de citas:", err.message || err);
    }
  }

  async function sendPricingCopilot() {
    try {
      const businesses = await inventoryService.getBusinesses();

      for (const business of businesses) {
        const chatId = business.alert_whatsapp_to || config.defaultAlertTo;
        if (!chatId) continue;

        try {
          const products = await inventoryService.getProductsForBusiness(business.id);
          const { acelerando, estancados } = buildPricingSignals(products);

          if (acelerando.length === 0 && estancados.length === 0) {
            console.log("[" + business.name + "] copiloto de precios: nada relevante esta semana.");
            continue;
          }

          let datos = "";
          if (acelerando.length > 0) {
            datos +=
              "Productos vendiendose mas rapido de lo normal:\n" +
              acelerando
                .map((p) => "- " + p.name + ": vendiendo " + p.velocidadReciente.toFixed(1) + "/dia vs su promedio de " + p.demanda.toFixed(1) + "/dia, stock actual " + p.stock)
                .join("\n") +
              "\n\n";
          }
          if (estancados.length > 0) {
            datos +=
              "Productos sin ninguna venta en los ultimos 14 dias (con stock disponible):\n" +
              estancados.map((p) => "- " + p.name + ": stock " + p.stock).join("\n");
          }

          const prompt =
            "Eres un asistente de negocios para el dueno de la tienda '" + business.name + "'. " +
            "Con estos datos reales de esta semana, escribe un mensaje corto (maximo 5-6 lineas), en espanol sencillo, sin tecnicismos, con 1 o 2 sugerencias concretas y accionables (ej: subir precio de X, hacer promocion de Y, pedir mas de Z). " +
            "No inventes datos que no esten aqui. Usa un tono cercano, como un consejo de un amigo que sabe de negocios:\n\n" +
            datos;

          const sugerencia = await askAi(prompt);
          const mensaje = "Copiloto de precios - " + business.name + "\n\n" + sugerencia;
          await sendMessage(chatId, mensaje);
          console.log("[" + new Date().toLocaleString() + "] " + business.name + ": copiloto de precios enviado.");
        } catch (err) {
          console.error("Error en copiloto de precios de " + business.name + ":", err.message || err);
        }
      }
    } catch (err) {
      console.error("Error obteniendo negocios para copiloto de precios:", err.message || err);
    }
  }

  console.log("Worker de alertas iniciado. Revisando cada: " + config.cronSchedule);
  console.log("Reporte diario programado: " + config.reportSchedule);
  console.log("Backup automatico programado: " + config.backupSchedule);
  console.log("Recordatorios de citas programados: " + config.reminderSchedule);
  console.log("Copiloto de precios programado: " + config.pricingCopilotSchedule);
  await checkAllBusinesses();
  cron.schedule(config.cronSchedule, checkAllBusinesses);
  cron.schedule(config.reportSchedule, sendDailyReports);
  cron.schedule(config.backupSchedule, sendWeeklyBackups);
  cron.schedule(config.reminderSchedule, sendAppointmentReminders);
  cron.schedule(config.pricingCopilotSchedule, sendPricingCopilot);

  try {
    startTelegramBot({
      token: config.telegramToken,
      inventoryService: inventoryService,
      askAi: askAi,
      reportService: reportService,
    });
  } catch (err) {
    console.error("El bot de Telegram no pudo arrancar, pero el resto del worker sigue funcionando:", err.message || err);
  }

  if (config.customerBotBusinessId) {
    try {
      const business = await inventoryService.getBusinessById(config.customerBotBusinessId);
      if (!business) {
        console.log("CUSTOMER_BOT_BUSINESS_ID no coincide con ningun negocio, el bot de WhatsApp de clientes no arranca.");
      } else {
        startCustomerWhatsappBot({
          businessId: business.id,
          businessName: business.name,
          inventoryService: inventoryService,
          askAi: askAi,
        }).catch((err) => {
          console.error("El bot de WhatsApp de clientes fallo al conectar, pero el resto del worker sigue funcionando:", err.message || err);
        });
      }
    } catch (err) {
      console.error("Error preparando el bot de WhatsApp de clientes:", err.message || err);
    }
  } else {
    console.log("CUSTOMER_BOT_BUSINESS_ID no configurado, el bot de WhatsApp de clientes no arranca todavia.");
  }

  const app = createServer({ inventoryService, askAi });
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("Servidor HTTP escuchando en el puerto " + port);
  });
}

main().catch((err) => console.error("Error fatal:", err.message || err));
