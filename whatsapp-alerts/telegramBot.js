const TelegramBotLib = require("node-telegram-bot-api");
const TelegramBot = TelegramBotLib.default || TelegramBotLib;

function analizarProducto(p) {
  const hist = p.salesHistory || [];
  let demanda = Number(p.avgDailyDemand) || 0;
  if (hist.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 13);
    const total = hist.filter((h) => new Date(h.date) >= cutoff).reduce((s, h) => s + h.qty, 0);
    demanda = total / 14;
  }
  const stock = Number(p.stock) || 0;
  const minimo = Math.max(3, Math.ceil(demanda * 5));
  let estado = "bien";
  if (stock <= minimo) estado = "urgente";
  else if (stock <= minimo * 2) estado = "vigilar";

  let vence = null;
  if (p.expirationDate) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const exp = new Date(p.expirationDate + "T00:00:00");
    vence = Math.ceil((exp - hoy) / 86400000);
  }

  return { demanda, estado, vence };
}

function buildContext(products) {
  const hoy = new Date().toISOString().slice(0, 10);
  return products
    .map((p) => {
      const a = analizarProducto(p);
      const ventaHoy = (p.salesHistory || []).find((h) => h.date === hoy);
      const vendidasHoy = ventaHoy ? ventaHoy.qty : 0;
      let linea =
        "- " + p.name + ": stock " + p.stock + " uds, se vende ~" + a.demanda.toFixed(1) + "/dia, estado: " + a.estado +
        ", precio de venta $" + p.salePrice + ", costo real $" + p.realCost + ", VENDIDAS HOY: " + vendidasHoy + " uds";
      if (a.vence != null) linea += ", vence en " + a.vence + " dias";
      return linea;
    })
    .join("\n");
}

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
