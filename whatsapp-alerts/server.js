const express = require("express");
const cors = require("cors");
const { buildContext, buildFinanceContext } = require("./contextBuilder");
const { getLatestQrImage, getConnectionStatus } = require("./whatsappCustomerBot");

function createServer({ inventoryService, askAi }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("Worker de Control de Servicios activo.");
  });

  app.get("/qr-clientes", (req, res) => {
    const estado = getConnectionStatus();
    const imagen = getLatestQrImage();

    if (estado === "conectado") {
      res.send(
        "<html><body style='font-family: sans-serif; text-align: center; padding-top: 60px;'>" +
          "<h2>El bot de WhatsApp para clientes ya esta conectado.</h2>" +
          "<p>No necesitas escanear nada.</p>" +
          "</body></html>"
      );
      return;
    }

    if (!imagen) {
      res.send(
        "<html><head><meta http-equiv='refresh' content='3'></head><body style='font-family: sans-serif; text-align: center; padding-top: 60px;'>" +
          "<h2>Generando el codigo QR...</h2>" +
          "<p>Esta pagina se refresca sola cada 3 segundos.</p>" +
          "</body></html>"
      );
      return;
    }

    res.send(
      "<html><head><meta http-equiv='refresh' content='5'></head><body style='font-family: sans-serif; text-align: center; padding-top: 40px;'>" +
        "<h2>Escanea este QR con el WhatsApp de clientes</h2>" +
        "<p>WhatsApp &gt; Configuracion &gt; Dispositivos vinculados &gt; Vincular un dispositivo</p>" +
        "<img src='" + imagen + "' style='width: 300px; height: 300px;' />" +
        "<p>Esta pagina se refresca sola cada 5 segundos.</p>" +
        "</body></html>"
    );
  });

  app.post("/chat", async (req, res) => {
    const businessId = req.body && req.body.businessId;
    const question = req.body && req.body.question;

    if (!businessId || !question) {
      res.status(400).json({ error: "Falta businessId o question." });
      return;
    }

    try {
      const products = await inventoryService.getProductsForBusiness(businessId);
      const expenses = await inventoryService.getExpensesForBusiness(businessId);
      const contexto = buildContext(products) + buildFinanceContext(products, expenses);

      const prompt =
        "Eres un asistente para el dueno de una tienda pequena en Colombia. " +
        "Responde en espanol, de forma breve, clara y directa, como si le hablaras a un tendero, sin tecnicismos. " +
        "Usa SOLO esta informacion del inventario y las finanzas para responder, no inventes datos. El campo VENDIDAS HOY es el numero real de unidades vendidas hoy de cada producto. Si preguntan por gastos, ganancia neta, o rentabilidad, usa los DATOS FINANCIEROS incluidos abajo:\n\n" +
        contexto +
        "\n\nPregunta del tendero: " + question;

      const respuesta = await askAi(prompt);
      res.json({ answer: respuesta });
    } catch (err) {
      console.error("Error en /chat:", err.message || err);
      res.status(500).json({ error: "Tuve un problema respondiendo esa pregunta." });
    }
  });

  return app;
}

module.exports = { createServer };
