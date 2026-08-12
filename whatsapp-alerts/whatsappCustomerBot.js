const path = require("path");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { buildCustomerContext } = require("./contextBuilder");

let latestQrImage = null;
let connectionStatus = "esperando";

function getLatestQrImage() {
  return latestQrImage;
}

function getConnectionStatus() {
  return connectionStatus;
}

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

  sock.ev.on("connection.update", async (update) => {
    const connection = update.connection;
    const qr = update.qr;
    const lastDisconnect = update.lastDisconnect;

    if (qr) {
      connectionStatus = "esperando_escaneo";
      try {
        latestQrImage = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error("Error generando imagen del QR:", err.message || err);
      }
      console.log("");
      console.log("QR nuevo generado. Abre /qr-clientes en el worker para escanearlo desde el navegador.");
      qrcode.generate(qr, { small: true });
      console.log("");
    }

    if (connection === "close") {
      connectionStatus = "desconectado";
      const statusCode =
        lastDisconnect && lastDisconnect.error ? new Boom(lastDisconnect.error).output.statusCode : null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Bot de WhatsApp (clientes) desconectado. Reconectando: " + shouldReconnect);
      if (shouldReconnect) {
        startCustomerWhatsappBot(options);
      }
    } else if (connection === "open") {
      connectionStatus = "conectado";
      latestQrImage = null;
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
        "Eres el asistente virtual de ventas de la tienda '" + businessName + "'. " +
        "Le respondes a CLIENTES por WhatsApp que preguntan por productos, precios y disponibilidad. " +
        "Tu personalidad: carismatico, amable, entusiasta, como un buen vendedor de barrio que quiere ayudar. " +
        "Usa emojis con naturalidad (sin exagerar, 1-2 por mensaje esta bien) y un tono cercano colombiano. " +
        "Cuando el producto SI esta disponible, anima a comprarlo con una frase corta y genuina, no forzada. " +
        "Cuando el producto NO esta disponible o no existe en la lista, dilo con calidez, sin sonar robotico, y si tiene sentido sugiere preguntar por otra cosa. " +
        "Manten las respuestas cortas (2-3 lineas maximo), como se habla por WhatsApp, no como un correo formal. " +
        "Usa SOLO esta lista de productos, no inventes productos ni precios que no esten en ella. " +
        "NO des informacion de costos, ganancias, ni datos internos del negocio bajo ninguna circunstancia, solo precio de venta y si hay disponible o no:\n\n" +
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

module.exports = { startCustomerWhatsappBot, getLatestQrImage, getConnectionStatus };
