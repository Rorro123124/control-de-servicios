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

  app.post("/interpretar-columnas", async (req, res) => {
    const headers = req.body && req.body.headers;
    const sampleRows = req.body && req.body.sampleRows;

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      res.status(400).json({ error: "Falta la lista de columnas del archivo." });
      return;
    }

    try {
      const camposDisponibles = ["name", "category", "stock", "salePrice", "realCost", "avgDailyDemand", "expirationDate", "barcode", "ignorar"];

      const prompt =
        "Tengo un archivo de Excel con un inventario de productos de una tienda. Estas son las columnas (encabezados) del archivo, en orden:\n" +
        JSON.stringify(headers) +
        "\n\nAqui hay unas filas de ejemplo con datos reales, en el mismo orden que las columnas:\n" +
        JSON.stringify(sampleRows || []) +
        "\n\nQuiero que me digas a cual de estos campos corresponde cada columna: " + camposDisponibles.join(", ") + ". " +
        "Los significados son: name=nombre del producto, category=categoria o tipo de producto (texto, ej: Verduras, Ropa, Aseo), stock=cantidad de unidades en inventario (numero), salePrice=precio de venta al publico, realCost=costo real o de compra del producto, avgDailyDemand=demanda diaria promedio o ventas estimadas por dia, expirationDate=fecha de vencimiento, barcode=codigo de barras, ignorar=esta columna no corresponde a ninguno de estos campos. " +
        "OJO: 'category' y 'stock' son cosas MUY distintas aunque sus nombres en espanol se parezcan (categoria vs cantidad) - category es SIEMPRE texto descriptivo (como 'Verduras' o 'Bebidas'), stock es SIEMPRE un numero de unidades. Revisa los datos de ejemplo de cada columna con cuidado antes de decidir, no te guies solo por el nombre del encabezado. " +
        "Responde SOLO con un objeto JSON valido donde cada llave es el nombre EXACTO de la columna del archivo (tal como aparece arriba) y el valor es el campo correspondiente de la lista. No agregues texto explicativo, ni comillas de markdown, ni nada mas, solo el JSON.";

      const respuesta = await askAi(prompt);
      const limpio = respuesta.replace(/```json|```/g, "").trim();
      const mapeo = JSON.parse(limpio);
      res.json({ mapping: mapeo });
    } catch (err) {
      console.error("Error interpretando columnas:", err.message || err);
      res.status(500).json({ error: "No pude interpretar las columnas del archivo, puedes mapearlas a mano." });
    }
  });

  app.post("/sugerir-categorias", async (req, res) => {
    const productNames = req.body && req.body.productNames;

    if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
      res.status(400).json({ error: "Falta la lista de nombres de productos." });
      return;
    }

    try {
      const prompt =
        "Tengo esta lista de nombres de productos de una tienda, en este orden:\n" +
        JSON.stringify(productNames) +
        "\n\nQuiero que me sugieras una categoria corta (1-2 palabras, en espanol, ej: Verduras, Bebidas, Aseo, Ropa, Snacks, Lacteos, Abarrotes) para cada uno, basandote en el nombre del producto. " +
        "Responde SOLO con un arreglo JSON de strings, en el MISMO ORDEN que la lista de arriba, un texto de categoria por cada producto. No agregues texto explicativo, ni comillas de markdown, ni nada mas, solo el arreglo JSON.";

      const respuesta = await askAi(prompt);
      const limpio = respuesta.replace(/```json|```/g, "").trim();
      const categorias = JSON.parse(limpio);

      if (!Array.isArray(categorias)) {
        throw new Error("La IA no devolvio un arreglo valido.");
      }

      res.json({ categories: categorias });
    } catch (err) {
      console.error("Error sugiriendo categorias:", err.message || err);
      res.status(500).json({ error: "No pude sugerir categorias, puedes escribirlas a mano." });
    }
  });

  return app;
}

module.exports = { createServer };
