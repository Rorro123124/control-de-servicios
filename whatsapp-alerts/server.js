const express = require("express");
const cors = require("cors");
const { buildContext } = require("./contextBuilder");

function createServer({ inventoryService, askAi }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (req, res) => {
    res.send("Worker de Control de Servicios activo.");
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
      const contexto = buildContext(products);

      const prompt =
        "Eres un asistente para el dueno de una tienda pequena en Colombia. " +
        "Responde en espanol, de forma breve, clara y directa, como si le hablaras a un tendero, sin tecnicismos. " +
        "Usa SOLO esta informacion del inventario para responder, no inventes datos. El campo VENDIDAS HOY es el numero real de unidades vendidas hoy de cada producto:\n\n" +
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
