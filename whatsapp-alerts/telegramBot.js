const TelegramBotLib = require("node-telegram-bot-api");
const TelegramBot = TelegramBotLib.default || TelegramBotLib;
const { buildContext } = require("./contextBuilder");

const PALABRAS_REPORTE = ["resumen", "reporte", "cuanto vendi", "cuanto vendimos", "cuantas ventas", "que vendi", "que vendimos", "quien compro", "quienes compraron", "compradores"];

function esPeticionDeReporte(text) {
  const lower = text.toLowerCase();
  return PALABRAS_REPORTE.some((palabra) => lower.includes(palabra));
}

function startTelegramBot(options) {
  const token = options.token;
  const inventoryService = options.inventoryService;
  const askAi = options.askAi;
  const reportService = options.reportService;

  const bot = new TelegramBot(token, { polling: true });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    if (text === "/start") {
      bot.sendMessage(chatId, "Hola. Preguntame sobre tu inventario, o escribe 'resumen' para ver el reporte de ventas de hoy.");
      return;
    }

    try {
      const business = await inventoryService.getBusinessForChat(chatId);
      if (!business) {
        bot.sendMessage(chatId, "No encontre ningun negocio asociado a este chat todavia.");
        return;
      }

      if (esPeticionDeReporte(text)) {
        const products = await inventoryService.getProductsForBusiness(business.id);
        const invoicesHoy = await inventoryService.getInvoicesToday(business.id);
        const todayStr = new Date().toISOString().slice(0, 10);
        const report = reportService.computeDailyReport(products, todayStr);
        const buyersLines = reportService.buildBuyersLines(invoicesHoy);
        const mensaje = reportService.buildReportMessage(business.name, report, buyersLines);

        if (report.unidadesTotales > 0) {
          const chartUrl = reportService.buildChartUrl(report);
          await bot.sendPhoto(chatId, chartUrl, { caption: mensaje, parse_mode: "Markdown" });
        } else {
          await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
        }
        return;
      }

      const products = await inventoryService.getProductsForBusiness(business.id);
      const contexto = buildContext(products);

      const prompt =
        "Eres un asistente para el dueno de la tienda '" + business.name + "'. " +
        "Responde en espanol, de forma breve, clara y directa, como si le hablaras a un tendero, sin tecnicismos. " +
        "Usa SOLO esta informacion del inventario para responder, no inventes datos. El campo VENDIDAS HOY es el numero real de unidades vendidas hoy de cada producto, usalo para responder preguntas sobre ventas de hoy en vez de adivinar a partir del stock:\n\n" +
        contexto +
        "\n\nPregunta del tendero: " + text;

      const respuesta = await askAi(prompt);
      bot.sendMessage(chatId, respuesta);
    } catch (err) {
      console.error("Error respondiendo:", err.message);
      bot.sendMessage(chatId, "Tuve un problema respondiendo esa pregunta, intenta de nuevo.");
    }
  });

  console.log("Bot de Telegram escuchando preguntas...");
}

module.exports = { startTelegramBot };
