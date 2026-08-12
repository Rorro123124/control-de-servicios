const path = require("path");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { buildCustomerContext } = require("./contextBuilder");

async function startCustomerWhatsappBot(options) {
  const businessId = options.businessId;
  const businessName = options.businessName;
  const inventoryService = options.inventoryService;
  const askAi = options.askAi;

  const authFolder = path.join(__dirname, "auth_info_customer");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const connection = update.connection;
    const qr = update.qr;
    const lastDisconnect = update.lastDisconnect;

    if (qr) {
      console.log("");
      console.log("Escanea este QR con el WhatsApp que va a atender clientes:");
      qrcode.generate(qr, { small: true });
      console.log("");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect && lastDisconnect.error ? new Boom(lastDisconnect.error).output.statusCode : null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Bot de WhatsApp (clientes) desconectado. Reconectando: " + shouldReconnect);
      if (shouldReconnect) {
        startCustomerWhatsappBot(options);
      }
    } else if (connection === "open") {
      console.log("Bot de WhatsApp para clientes conectado y listo.");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages && m.messages[0];
      if (!msg || !msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith("@g.us")) return;

      const text =
        msg.message.conversation ||
        (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) ||
        "";

      if (!text.trim()) return;

      const products = await inventoryService.getProductsForBusiness(businessId);
      const contexto = buildCustomerContext(products);

      const prompt =
        "Eres el asistente virtual de la tienda '" + businessName + "'. " +
        "Le respondes a CLIENTES que preguntan por productos, precios y disponibilidad. " +
        "Responde en espanol, de forma breve, amable y directa. " +
        "Usa SOLO esta lista de productos, no inventes productos ni precios que no esten en ella. " +
        "NO des informacion de costos, ganancias, ni datos internos del negocio, solo precio de venta y si hay disponible o no:\n\n" +
        contexto +
        "\n\nPregunta del cliente: " + text;

      const respuesta = await askAi(prompt);
      await sock.sendMessage(remoteJid, { text: respuesta });
    } catch (err) {
      console.error("Error en bot de WhatsApp (clientes):", err.message || err);
    }
  });

  return sock;
}

module.exports = { startCustomerWhatsappBot };
