import { getProducts } from "./productService";
import { getInvoices } from "./invoiceService";
import { getCustomers, getDebts } from "./debtService";
import { getExpenses } from "./expenseService";
import { getWasteRecords } from "./wasteService";

const VERDE = "FF154B3E";
const VERDE_CLARO = "FF1F6F5C";
const MOSTAZA = "FFE5A13C";
const ROJO = "FFD6483C";
const ROJO_BG = "FFFBE8E5";
const AMARILLO = "FFC98A1F";
const AMARILLO_BG = "FFFAF0DC";
const VERDE_BG = "FFE4F1EA";
const GRIS_CLARO = "FFF5F3EE";
const BLANCO = "FFFFFFFF";

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function ultimosDias(n) {
  const dias = [];
  const hoy = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

function estiloTitulo(cell, texto) {
  cell.value = texto;
  cell.font = { bold: true, size: 16, color: { argb: BLANCO } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function estiloEncabezadoTabla(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BLANCO }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: VERDE } } };
  });
  row.height = 22;
}

function pintarFilasAlternas(worksheet, filaInicio, filaFin, colInicio, colFin) {
  for (let r = filaInicio; r <= filaFin; r++) {
    if ((r - filaInicio) % 2 === 1) {
      for (let c = colInicio; c <= colFin; c++) {
        worksheet.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } };
      }
    }
  }
}

async function fetchImagenBuffer(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await blob.arrayBuffer();
}

function buildVentasChartUrl(dias, totales) {
  const config = {
    type: "bar",
    data: {
      labels: dias.map((d) => d.slice(5)),
      datasets: [{ label: "Ventas", data: totales, backgroundColor: "#1F6F5C", borderRadius: 4 }],
    },
    options: {
      plugins: { legend: { display: false }, title: { display: true, text: "Ventas de los ultimos 14 dias" } },
      scales: { y: { beginAtZero: true } },
    },
  };
  return "https://quickchart.io/chart?width=760&height=320&backgroundColor=white&c=" + encodeURIComponent(JSON.stringify(config));
}

function buildComposicionChartUrl(ingresos, costo, ganancia, fecha) {
  const config = {
    type: "doughnut",
    data: {
      labels: ["Costo", "Ganancia"],
      datasets: [{ data: [costo, ganancia], backgroundColor: ["#D6483C", "#1F6F5C"] }],
    },
    options: {
      plugins: { title: { display: true, text: "Composicion de ingresos - " + fecha } },
    },
  };
  return "https://quickchart.io/chart?width=420&height=320&backgroundColor=white&c=" + encodeURIComponent(JSON.stringify(config));
}

export async function exportToExcel(businessId, businessName) {
  const { default: ExcelJS } = await import("exceljs");
  const products = await getProducts(businessId);
  const invoices = await getInvoices(businessId);
  const customers = await getCustomers(businessId);
  const debts = await getDebts(businessId);
  const expenses = await getExpenses(businessId);
  const wasteRecords = await getWasteRecords(businessId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessName || "Control de Servicios";
  workbook.created = new Date();

  // --------- Calculos base ---------
  const ventasData = [];
  products.forEach((p) => {
    (p.salesHistory || []).forEach((h) => {
      const ingreso = h.qty * Number(p.salePrice || 0);
      const costo = h.qty * Number(p.realCost || 0);
      ventasData.push({ fecha: h.date, producto: p.name, cantidad: h.qty, precio: p.salePrice, ingreso, costo, ganancia: ingreso - costo });
    });
  });
  ventasData.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalIngresos = ventasData.reduce((s, v) => s + v.ingreso, 0);
  const totalCosto = ventasData.reduce((s, v) => s + v.costo, 0);
  const totalGanancia = totalIngresos - totalCosto;
  const valorInventario = products.reduce((s, p) => s + Number(p.stock) * Number(p.salePrice || 0), 0);
  const totalPorCobrar = debts.reduce((s, d) => s + Number(d.balance), 0);
  const totalGastos = expenses.reduce((s, g) => s + Number(g.amount), 0);
  const gananciaNetaReal = totalGanancia - totalGastos;

  const dias14 = ultimosDias(14);
  const totalesPorDia = dias14.map((fecha) => ventasData.filter((v) => v.fecha === fecha).reduce((s, v) => s + v.ingreso, 0));

  const hoyStr = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventasData.filter((v) => v.fecha === hoyStr);
  const ingresosHoy = ventasHoy.reduce((s, v) => s + v.ingreso, 0);
  const costoHoy = ventasHoy.reduce((s, v) => s + v.costo, 0);
  const gananciaHoy = ingresosHoy - costoHoy;

  // --------- Hoja Resumen ---------
  const wsResumen = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: VERDE } } });
  wsResumen.columns = [{ width: 4 }, { width: 26 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

  wsResumen.mergeCells("A1:F2");
  const tituloCell = wsResumen.getCell("A1");
  tituloCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
  estiloTitulo(tituloCell, (businessName || "Mi negocio") + " - Reporte general");
  tituloCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const kpis = [
    { label: "Ingresos totales", valor: formatCOP(totalIngresos), color: VERDE_CLARO },
    { label: "Costo total", valor: formatCOP(totalCosto), color: ROJO },
    { label: "Ganancia total", valor: formatCOP(totalGanancia), color: VERDE_CLARO },
    { label: "Valor en inventario", valor: formatCOP(valorInventario), color: MOSTAZA },
    { label: "Productos", valor: String(products.length), color: VERDE_CLARO },
    { label: "Facturas emitidas", valor: String(invoices.length), color: MOSTAZA },
    { label: "Total por cobrar (fiado)", valor: formatCOP(totalPorCobrar), color: ROJO },
    { label: "Gastos totales", valor: formatCOP(totalGastos), color: ROJO },
    { label: "Ganancia neta real", valor: formatCOP(gananciaNetaReal), color: gananciaNetaReal >= 0 ? VERDE_CLARO : ROJO },
  ];

  let filaKpi = 4;
  kpis.forEach((k, i) => {
    const col = 2 + (i % 3) * 2;
    const fila = filaKpi + Math.floor(i / 3) * 3;
    wsResumen.mergeCells(fila, col, fila, col + 1);
    wsResumen.mergeCells(fila + 1, col, fila + 1, col + 1);
    const labelCell = wsResumen.getCell(fila, col);
    labelCell.value = k.label;
    labelCell.font = { size: 10, color: { argb: "FF736C5E" } };
    const valorCell = wsResumen.getCell(fila + 1, col);
    valorCell.value = k.valor;
    valorCell.font = { bold: true, size: 16, color: { argb: k.color } };
  });

  let filaImagenes = filaKpi + 11;

  try {
    const bufferVentas = await fetchImagenBuffer(buildVentasChartUrl(dias14, totalesPorDia));
    const idVentas = workbook.addImage({ buffer: bufferVentas, extension: "png" });
    wsResumen.addImage(idVentas, { tl: { col: 1, row: filaImagenes }, ext: { width: 570, height: 240 } });
  } catch (e) {
    console.log("No se pudo generar la grafica de ventas:", e.message);
  }

  if (ingresosHoy > 0) {
    try {
      const bufferComp = await fetchImagenBuffer(buildComposicionChartUrl(ingresosHoy, costoHoy, gananciaHoy, hoyStr));
      const idComp = workbook.addImage({ buffer: bufferComp, extension: "png" });
      wsResumen.addImage(idComp, { tl: { col: 8.3, row: filaImagenes }, ext: { width: 320, height: 240 } });
    } catch (e) {
      console.log("No se pudo generar la grafica de composicion:", e.message);
    }
  }

  // --------- Hoja Productos ---------
  const wsProductos = workbook.addWorksheet("Productos", { properties: { tabColor: { argb: VERDE_CLARO } } });
  wsProductos.columns = [
    { header: "Producto", key: "name", width: 26 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Stock", key: "stock", width: 10 },
    { header: "Precio venta", key: "salePrice", width: 16 },
    { header: "Costo real", key: "realCost", width: 16 },
    { header: "Valor inventario", key: "valor", width: 18 },
    { header: "Estado", key: "estado", width: 16 },
  ];
  estiloEncabezadoTabla(wsProductos.getRow(1));

  products.forEach((p) => {
    const demanda = (() => {
      const hist = p.salesHistory || [];
      if (hist.length === 0) return Number(p.avgDailyDemand) || 0;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 13);
      const total = hist.filter((h) => new Date(h.date) >= cutoff).reduce((s, h) => s + h.qty, 0);
      return total / 14;
    })();
    const minimo = Math.max(3, Math.ceil(demanda * 5));
    const stock = Number(p.stock) || 0;
    let estado = "Vas bien";
    if (stock <= minimo) estado = "Se esta acabando";
    else if (stock <= minimo * 2) estado = "Vigilalo";

    const row = wsProductos.addRow({
      name: p.name,
      category: p.category || "",
      stock: p.stock,
      salePrice: p.salePrice,
      realCost: p.realCost,
      valor: Number(p.stock) * Number(p.salePrice || 0),
      estado,
    });
    row.getCell(4).numFmt = '"$"#,##0';
    row.getCell(5).numFmt = '"$"#,##0';
    row.getCell(6).numFmt = '"$"#,##0';

    const estadoCell = row.getCell(7);
    if (estado === "Se esta acabando") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_BG } };
      estadoCell.font = { color: { argb: ROJO }, bold: true };
    } else if (estado === "Vigilalo") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO_BG } };
      estadoCell.font = { color: { argb: AMARILLO }, bold: true };
    } else {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_BG } };
      estadoCell.font = { color: { argb: VERDE_CLARO }, bold: true };
    }
  });
  pintarFilasAlternas(wsProductos, 2, wsProductos.rowCount, 1, 7);
  wsProductos.views = [{ state: "frozen", ySplit: 1 }];

  // --------- Hoja Ventas ---------
  const wsVentas = workbook.addWorksheet("Ventas", { properties: { tabColor: { argb: MOSTAZA } } });
  wsVentas.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Producto", key: "producto", width: 24 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Precio unitario", key: "precio", width: 16 },
    { header: "Ingreso", key: "ingreso", width: 16 },
    { header: "Costo", key: "costo", width: 16 },
    { header: "Ganancia", key: "ganancia", width: 16 },
  ];
  estiloEncabezadoTabla(wsVentas.getRow(1));

  ventasData.forEach((v) => {
    const row = wsVentas.addRow(v);
    row.getCell(4).numFmt = '"$"#,##0';
    row.getCell(5).numFmt = '"$"#,##0';
    row.getCell(6).numFmt = '"$"#,##0';
    row.getCell(7).numFmt = '"$"#,##0';
    row.getCell(6).font = { color: { argb: ROJO } };
    row.getCell(7).font = { color: { argb: VERDE_CLARO }, bold: true };
  });
  pintarFilasAlternas(wsVentas, 2, wsVentas.rowCount, 1, 7);
  wsVentas.views = [{ state: "frozen", ySplit: 1 }];

  if (ventasData.length > 0) {
    const totalRow = wsVentas.addRow({ fecha: "", producto: "TOTAL", cantidad: "", precio: "", ingreso: totalIngresos, costo: totalCosto, ganancia: totalGanancia });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_BG } };
    });
    totalRow.getCell(5).numFmt = '"$"#,##0';
    totalRow.getCell(6).numFmt = '"$"#,##0';
    totalRow.getCell(7).numFmt = '"$"#,##0';
  }

  // --------- Hoja Facturas ---------
  const wsFacturas = workbook.addWorksheet("Facturas", { properties: { tabColor: { argb: VERDE } } });
  wsFacturas.columns = [
    { header: "Numero", key: "numero", width: 10 },
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Cliente", key: "cliente", width: 24 },
    { header: "Identificacion", key: "id", width: 16 },
    { header: "Telefono", key: "telefono", width: 16 },
    { header: "Entrega", key: "entrega", width: 14 },
    { header: "Total", key: "total", width: 16 },
    { header: "Estado", key: "estado", width: 14 },
  ];
  estiloEncabezadoTabla(wsFacturas.getRow(1));

  invoices.forEach((inv) => {
    const row = wsFacturas.addRow({
      numero: inv.invoice_number,
      fecha: new Date(inv.created_at).toLocaleString("es-CO"),
      cliente: ((inv.buyer_name || "") + " " + (inv.buyer_lastname || "")).trim(),
      id: inv.buyer_id || "",
      telefono: inv.buyer_phone || "",
      entrega: inv.delivery_type === "domicilio" ? "Domicilio" : "En el lugar",
      total: inv.total,
      estado: inv.cancelled_at ? "Anulada" : "Activa",
    });
    row.getCell(7).numFmt = '"$"#,##0';
    row.getCell(7).font = { bold: true };
    if (inv.cancelled_at) {
      const estadoCell = row.getCell(8);
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_BG } };
      estadoCell.font = { color: { argb: ROJO }, bold: true };
    }
  });
  pintarFilasAlternas(wsFacturas, 2, wsFacturas.rowCount, 1, 8);
  wsFacturas.views = [{ state: "frozen", ySplit: 1 }];

  // --------- Hoja Detalle facturas ---------
  const wsDetalle = workbook.addWorksheet("Detalle facturas", { properties: { tabColor: { argb: VERDE_CLARO } } });
  wsDetalle.columns = [
    { header: "Factura #", key: "factura", width: 12 },
    { header: "Producto", key: "producto", width: 26 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Precio unitario", key: "precio", width: 16 },
    { header: "Subtotal", key: "subtotal", width: 16 },
  ];
  estiloEncabezadoTabla(wsDetalle.getRow(1));

  invoices.forEach((inv) => {
    (inv.invoice_items || []).forEach((it) => {
      const row = wsDetalle.addRow({
        factura: inv.invoice_number,
        producto: it.product_name,
        cantidad: it.qty,
        precio: it.unit_price,
        subtotal: it.subtotal,
      });
      row.getCell(4).numFmt = '"$"#,##0';
      row.getCell(5).numFmt = '"$"#,##0';
    });
  });
  pintarFilasAlternas(wsDetalle, 2, wsDetalle.rowCount, 1, 5);
  wsDetalle.views = [{ state: "frozen", ySplit: 1 }];

  // --------- Hoja Fiado ---------
  const wsFiado = workbook.addWorksheet("Fiado", { properties: { tabColor: { argb: ROJO } } });
  wsFiado.columns = [
    { header: "Cliente", key: "cliente", width: 24 },
    { header: "Identificacion", key: "id", width: 16 },
    { header: "Telefono", key: "telefono", width: 16 },
    { header: "Factura", key: "factura", width: 12 },
    { header: "Nota", key: "nota", width: 20 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Limite pago", key: "limite", width: 14 },
    { header: "Monto original", key: "monto", width: 16 },
    { header: "Saldo pendiente", key: "saldo", width: 16 },
    { header: "Estado", key: "estado", width: 14 },
  ];
  estiloEncabezadoTabla(wsFiado.getRow(1));

  const customersPorId = {};
  customers.forEach((c) => { customersPorId[c.id] = c; });

  debts.forEach((d) => {
    const cliente = d.customers || customersPorId[d.customer_id] || {};
    const row = wsFiado.addRow({
      cliente: ((cliente.name || "") + " " + (cliente.lastname || "")).trim(),
      id: cliente.id_number || "",
      telefono: cliente.phone || "",
      factura: d.invoice_id ? "Si" : "No",
      nota: d.note || "",
      fecha: new Date(d.created_at).toLocaleDateString("es-CO"),
      limite: d.due_date || "",
      monto: Number(d.amount),
      saldo: Number(d.balance),
      estado: d.status === "pagada" ? "Pagada" : d.status === "parcial" ? "Abono parcial" : "Pendiente",
    });
    row.getCell(8).numFmt = '"$"#,##0';
    row.getCell(9).numFmt = '"$"#,##0';

    const estadoCell = row.getCell(10);
    if (d.status === "pagada") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_BG } };
      estadoCell.font = { color: { argb: VERDE_CLARO }, bold: true };
    } else if (d.status === "parcial") {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMARILLO_BG } };
      estadoCell.font = { color: { argb: AMARILLO }, bold: true };
    } else {
      estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_BG } };
      estadoCell.font = { color: { argb: ROJO }, bold: true };
    }
  });
  pintarFilasAlternas(wsFiado, 2, wsFiado.rowCount, 1, 10);
  wsFiado.views = [{ state: "frozen", ySplit: 1 }];

  if (debts.length > 0) {
    const totalRow = wsFiado.addRow({ cliente: "TOTAL POR COBRAR", saldo: totalPorCobrar });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_BG } };
    });
    totalRow.getCell(9).numFmt = '"$"#,##0';
  }

  // --------- Hoja Gastos ---------
  const wsGastos = workbook.addWorksheet("Gastos", { properties: { tabColor: { argb: ROJO } } });
  wsGastos.columns = [
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Descripcion", key: "descripcion", width: 32 },
    { header: "Categoria", key: "categoria", width: 18 },
    { header: "Monto", key: "monto", width: 16 },
  ];
  estiloEncabezadoTabla(wsGastos.getRow(1));

  expenses.forEach((g) => {
    const row = wsGastos.addRow({
      fecha: g.expense_date,
      descripcion: g.description,
      categoria: g.category || "Sin categoria",
      monto: Number(g.amount),
    });
    row.getCell(4).numFmt = '"$"#,##0';
  });
  pintarFilasAlternas(wsGastos, 2, wsGastos.rowCount, 1, 4);
  wsGastos.views = [{ state: "frozen", ySplit: 1 }];

  if (expenses.length > 0) {
    const totalRowGastos = wsGastos.addRow({ descripcion: "TOTAL GASTOS", monto: totalGastos });
    totalRowGastos.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_BG } };
    });
    totalRowGastos.getCell(4).numFmt = '"$"#,##0';
  }

  // --------- Hoja Puntos ---------
  const wsPuntos = workbook.addWorksheet("Puntos", { properties: { tabColor: { argb: MOSTAZA } } });
  wsPuntos.columns = [
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "Telefono", key: "telefono", width: 16 },
    { header: "Puntos acumulados", key: "puntos", width: 18 },
  ];
  estiloEncabezadoTabla(wsPuntos.getRow(1));

  customers.forEach((c) => {
    wsPuntos.addRow({
      cliente: ((c.name || "") + " " + (c.lastname || "")).trim(),
      telefono: c.phone || "",
      puntos: Number(c.points || 0),
    });
  });
  pintarFilasAlternas(wsPuntos, 2, wsPuntos.rowCount, 1, 3);
  wsPuntos.views = [{ state: "frozen", ySplit: 1 }];

  // --------- Hoja Mermas ---------
  const wsMermas = workbook.addWorksheet("Mermas", { properties: { tabColor: { argb: ROJO } } });
  wsMermas.columns = [
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Producto", key: "producto", width: 28 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Motivo", key: "motivo", width: 16 },
    { header: "Nota", key: "nota", width: 26 },
  ];
  estiloEncabezadoTabla(wsMermas.getRow(1));

  wasteRecords.forEach((m) => {
    wsMermas.addRow({
      fecha: m.waste_date,
      producto: m.product_name,
      cantidad: Number(m.qty),
      motivo: m.reason,
      nota: m.notes || "",
    });
  });
  pintarFilasAlternas(wsMermas, 2, wsMermas.rowCount, 1, 5);
  wsMermas.views = [{ state: "frozen", ySplit: 1 }];

  // --------- Descargar ---------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreLimpio = (businessName || "negocio").replace(/[^a-zA-Z0-9]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreLimpio + "-reporte-" + fecha + ".xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
