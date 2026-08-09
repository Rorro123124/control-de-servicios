function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function computeDailyReport(products, dateStr) {
  let ingresos = 0;
  let costo = 0;
  let unidadesTotales = 0;
  const porProducto = [];

  products.forEach((p) => {
    const venta = (p.salesHistory || []).find((h) => h.date === dateStr);
    const qty = venta ? Number(venta.qty) : 0;
    if (qty > 0) {
      const ingresoP = qty * Number(p.salePrice || 0);
      const costoP = qty * Number(p.realCost || 0);
      ingresos += ingresoP;
      costo += costoP;
      unidadesTotales += qty;
      porProducto.push({ name: p.name, qty, ingresoP, costoP });
    }
  });

  porProducto.sort((a, b) => b.qty - a.qty);
  const ganancia = ingresos - costo;
  const masVendido = porProducto[0] || null;

  return { dateStr, ingresos, costo, ganancia, unidadesTotales, porProducto, masVendido };
}

function buildBuyersLines(invoices) {
  if (!invoices || invoices.length === 0) return [];
  return invoices.map((inv) => {
    const nombre = ((inv.buyer_name || "") + " " + (inv.buyer_lastname || "")).trim() || "Cliente sin nombre";
    const items = (inv.invoice_items || []).map((it) => it.product_name + " x" + it.qty).join(", ");
    return "- " + nombre + (items ? ": " + items : "");
  });
}

function buildReportMessage(businessName, report, buyersLines) {
  if (report.unidadesTotales === 0) {
    return businessName + "\n\n📊 *Reporte del " + report.dateStr + "*\n\nNo se registraron ventas este dia.";
  }

  const lineas = [
    businessName,
    "",
    "📊 *Reporte del " + report.dateStr + "*",
    "",
    "Unidades vendidas: " + report.unidadesTotales,
    "Ingresos: " + formatCOP(report.ingresos),
    "Costo de lo vendido: " + formatCOP(report.costo),
    "Ganancia real: " + formatCOP(report.ganancia),
  ];

  if (report.masVendido) {
    lineas.push("", "Producto mas vendido: " + report.masVendido.name + " (" + report.masVendido.qty + " uds.)");
  }

  if (buyersLines && buyersLines.length > 0) {
    lineas.push("", "Compradores de hoy (con factura):");
    lineas.push(...buyersLines);
  }

  return lineas.join("\n");
}

function buildChartUrl(report) {
  const config = {
    type: "bar",
    data: {
      labels: ["Ingresos", "Costo", "Ganancia"],
      datasets: [
        {
          label: report.dateStr,
          data: [report.ingresos, report.costo, report.ganancia],
          backgroundColor: ["#2f5233", "#d9534f", "#4b8f4e"],
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Reporte del " + report.dateStr },
      },
      scales: { y: { beginAtZero: true } },
    },
  };

  return "https://quickchart.io/chart?width=500&height=300&backgroundColor=white&c=" + encodeURIComponent(JSON.stringify(config));
}

module.exports = { computeDailyReport, buildReportMessage, buildChartUrl, buildBuyersLines, formatCOP };
