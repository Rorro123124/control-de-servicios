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

function buildCustomerContext(products) {
  return products
    .map((p) => {
      const stock = Number(p.stock) || 0;
      const disponibilidad = stock > 0 ? "disponible" : "agotado";
      return "- " + p.name + ": $" + p.salePrice + " (" + disponibilidad + ")";
    })
    .join("\n");
}


function buildFinanceContext(products, expenses) {
  const mesActual = new Date().toISOString().slice(0, 7);
  let ingresosMes = 0;
  let costoMes = 0;

  products.forEach((p) => {
    (p.salesHistory || []).forEach((h) => {
      if (h.date.slice(0, 7) === mesActual) {
        ingresosMes += h.qty * Number(p.salePrice || 0);
        costoMes += h.qty * Number(p.realCost || 0);
      }
    });
  });

  const gananciaBrutaMes = ingresosMes - costoMes;
  const gastosMes = expenses
    .filter((g) => g.expenseDate.slice(0, 7) === mesActual)
    .reduce((s, g) => s + Number(g.amount), 0);
  const gananciaNetaMes = gananciaBrutaMes - gastosMes;

  let texto =
    "\n\nDATOS FINANCIEROS DEL MES ACTUAL:\n" +
    "- Ingresos por ventas este mes: $" + ingresosMes.toFixed(0) + "\n" +
    "- Costo de lo vendido este mes: $" + costoMes.toFixed(0) + "\n" +
    "- Ganancia bruta este mes (ingresos - costo): $" + gananciaBrutaMes.toFixed(0) + "\n" +
    "- Gastos generales registrados este mes (arriendo, servicios, etc.): $" + gastosMes.toFixed(0) + "\n" +
    "- Ganancia neta real este mes (ganancia bruta - gastos): $" + gananciaNetaMes.toFixed(0);

  if (expenses.length > 0) {
    const detalleGastos = expenses
      .filter((g) => g.expenseDate.slice(0, 7) === mesActual)
      .map((g) => "  - " + g.description + " (" + (g.category || "sin categoria") + "): $" + Number(g.amount).toFixed(0))
      .join("\n");
    if (detalleGastos) {
      texto += "\nDetalle de gastos de este mes:\n" + detalleGastos;
    }
  }

  return texto;
}

module.exports = { analizarProducto, buildContext, buildCustomerContext, buildFinanceContext };
