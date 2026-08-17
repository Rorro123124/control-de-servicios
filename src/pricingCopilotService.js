const { analizarProducto } = require("./contextBuilder");

function buildPricingSignals(products) {
  const hoy = new Date();
  const acelerando = [];
  const estancados = [];

  products.forEach((p) => {
    const hist = p.salesHistory || [];

    const cutoff7 = new Date(hoy);
    cutoff7.setDate(cutoff7.getDate() - 6);
    const ventas7 = hist.filter((h) => new Date(h.date) >= cutoff7).reduce((s, h) => s + h.qty, 0);
    const velocidadReciente = ventas7 / 7;

    const analisis = analizarProducto(p);
    const demanda = analisis.demanda;

    if (demanda > 0 && velocidadReciente >= 1 && velocidadReciente > demanda * 1.4) {
      acelerando.push({
        name: p.name,
        demanda: demanda,
        velocidadReciente: velocidadReciente,
        stock: Number(p.stock),
      });
    }

    const cutoff14 = new Date(hoy);
    cutoff14.setDate(cutoff14.getDate() - 13);
    const ventas14 = hist.filter((h) => new Date(h.date) >= cutoff14).reduce((s, h) => s + h.qty, 0);

    if (hist.length > 0 && ventas14 === 0 && Number(p.stock) > 0) {
      estancados.push({ name: p.name, stock: Number(p.stock) });
    }
  });

  return { acelerando, estancados };
}

module.exports = { buildPricingSignals };
