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

module.exports = { analizarProducto, buildContext };
