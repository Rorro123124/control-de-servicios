import jsPDF from "jspdf";

const ANCHO = 80;
const MARGEN = 4;
const CENTRO = ANCHO / 2;

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function loadImageAsBase64(url) {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

function lineaPunteada(doc, y) {
  doc.setLineDashPattern([1, 1], 0);
  doc.line(MARGEN, y, ANCHO - MARGEN, y);
  doc.setLineDashPattern([], 0);
}

export async function generateInvoicePdf(business, invoice, items) {
  const doc = new jsPDF({ unit: "mm", format: [ANCHO, 260] });
  let y = 8;

  if (business.logo_url) {
    try {
      const imgData = await loadImageAsBase64(business.logo_url);
      doc.addImage(imgData, "PNG", CENTRO - 12, y, 24, 18);
      y += 21;
    } catch (e) {
      console.log("No se pudo cargar el logo:", e.message);
    }
  }

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(business.name || "", CENTRO, y, { align: "center" });
  y += 5;

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  if (business.nit) {
    doc.text("NIT " + business.nit, CENTRO, y, { align: "center" });
    y += 4;
  }
  if (business.address) {
    doc.text(business.address, CENTRO, y, { align: "center" });
    y += 4;
  }
  if (business.phone) {
    doc.text("Tel " + business.phone, CENTRO, y, { align: "center" });
    y += 4;
  }

  y += 2;
  lineaPunteada(doc, y);
  y += 5;

  const esDomicilio = invoice.delivery_type === "domicilio";
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text((esDomicilio ? "DOMICILIO " : "PEDIDO ") + invoice.invoice_number, MARGEN, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(7);
  doc.text(new Date(invoice.created_at).toLocaleString("es-CO"), ANCHO - MARGEN, y, { align: "right" });
  y += 5;

  if (invoice.cashier_name) {
    doc.setFontSize(7);
    doc.text("Atendido por: " + invoice.cashier_name, MARGEN, y);
    y += 4;
  }

  const nombreCliente = ((invoice.buyer_name || "") + " " + (invoice.buyer_lastname || "")).trim();
  if (nombreCliente) {
    doc.setFontSize(8);
    doc.text("Cliente: " + nombreCliente, MARGEN, y);
    y += 4;
  }
  if (invoice.buyer_id) {
    doc.text("ID: " + invoice.buyer_id, MARGEN, y);
    y += 4;
  }
  if (invoice.buyer_phone) {
    doc.text("Tel: " + invoice.buyer_phone, MARGEN, y);
    y += 4;
  }
  if (esDomicilio && invoice.buyer_address) {
    const direccionLineas = doc.splitTextToSize("Direccion: " + invoice.buyer_address, ANCHO - MARGEN * 2);
    doc.text(direccionLineas, MARGEN, y);
    y += direccionLineas.length * 3.5 + 1;
  }

  y += 2;
  lineaPunteada(doc, y);
  y += 5;

  doc.setFontSize(8);
  items.forEach((it) => {
    const textoProducto = it.product_name + " x" + it.qty;
    const lineasProducto = doc.splitTextToSize(textoProducto, ANCHO - MARGEN * 2 - 22);
    doc.text(lineasProducto, MARGEN, y);
    doc.text(formatCOP(it.subtotal), ANCHO - MARGEN, y, { align: "right" });
    y += Math.max(4, lineasProducto.length * 4);
  });

  y += 1;
  lineaPunteada(doc, y);
  y += 5;

  const itemsTotal = items.reduce((s, it) => s + Number(it.subtotal), 0);
  doc.setFontSize(8);
  doc.text("Subtotal", MARGEN, y);
  doc.text(formatCOP(itemsTotal), ANCHO - MARGEN, y, { align: "right" });
  y += 4;

  if (invoice.delivery_fee > 0) {
    doc.text("Domicilio", MARGEN, y);
    doc.text(formatCOP(invoice.delivery_fee), ANCHO - MARGEN, y, { align: "right" });
    y += 4;
  }

  y += 1;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("TOTAL", MARGEN, y);
  doc.text(formatCOP(invoice.total), ANCHO - MARGEN, y, { align: "right" });
  y += 6;
  doc.setFont(undefined, "normal");

  const tasa = Number(business.tax_rate) || 0;
  if (tasa > 0) {
    y += 2;
    lineaPunteada(doc, y);
    y += 5;
    const base = itemsTotal / (1 + tasa / 100);
    const valorImpuesto = itemsTotal - base;
    const etiqueta = business.tax_label || "IVA";

    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("IMPUESTO", MARGEN, y);
    doc.text("BASE", MARGEN + 30, y);
    doc.text("VALOR", ANCHO - MARGEN, y, { align: "right" });
    doc.setFont(undefined, "normal");
    y += 4;
    doc.text(etiqueta + " " + tasa + "%", MARGEN, y);
    doc.text(formatCOP(base), MARGEN + 30, y);
    doc.text(formatCOP(valorImpuesto), ANCHO - MARGEN, y, { align: "right" });
    y += 6;
  }

  y += 2;
  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.text(business.thank_you_message || "¡Gracias por su compra!", CENTRO, y, { align: "center" });
  y += 5;

  if (business.instagram) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(7);
    doc.text("Siguenos: @" + business.instagram.replace("@", ""), CENTRO, y, { align: "center" });
    y += 4;
  }

  doc.save("factura-" + invoice.invoice_number + ".pdf");
}

export async function generateQuotePdf(business, quote, items) {
  const doc = new jsPDF({ unit: "mm", format: [ANCHO, 260] });
  let y = 8;

  if (business.logo_url) {
    try {
      const imgData = await loadImageAsBase64(business.logo_url);
      doc.addImage(imgData, "PNG", CENTRO - 12, y, 24, 18);
      y += 21;
    } catch (e) {
      console.log("No se pudo cargar el logo:", e.message);
    }
  }

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(business.name || "", CENTRO, y, { align: "center" });
  y += 5;

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  if (business.nit) {
    doc.text("NIT " + business.nit, CENTRO, y, { align: "center" });
    y += 4;
  }
  if (business.address) {
    doc.text(business.address, CENTRO, y, { align: "center" });
    y += 4;
  }
  if (business.phone) {
    doc.text("Tel " + business.phone, CENTRO, y, { align: "center" });
    y += 4;
  }

  y += 2;
  lineaPunteada(doc, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("COTIZACION " + quote.quote_number, MARGEN, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(7);
  doc.text(new Date(quote.created_at).toLocaleString("es-CO"), ANCHO - MARGEN, y, { align: "right" });
  y += 6;

  const nombreCliente = ((quote.buyer_name || "") + " " + (quote.buyer_lastname || "")).trim();
  if (nombreCliente) {
    doc.setFontSize(8);
    doc.text("Cliente: " + nombreCliente, MARGEN, y);
    y += 4;
  }
  if (quote.buyer_phone) {
    doc.text("Tel: " + quote.buyer_phone, MARGEN, y);
    y += 4;
  }
  if (quote.valid_until) {
    doc.setFont(undefined, "bold");
    doc.text("Valida hasta: " + quote.valid_until, MARGEN, y);
    doc.setFont(undefined, "normal");
    y += 4;
  }

  y += 2;
  lineaPunteada(doc, y);
  y += 5;

  doc.setFontSize(8);
  items.forEach((it) => {
    const textoProducto = it.product_name + " x" + it.qty;
    const lineasProducto = doc.splitTextToSize(textoProducto, ANCHO - MARGEN * 2 - 22);
    doc.text(lineasProducto, MARGEN, y);
    doc.text(formatCOP(it.subtotal), ANCHO - MARGEN, y, { align: "right" });
    y += Math.max(4, lineasProducto.length * 4);
  });

  y += 1;
  lineaPunteada(doc, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("TOTAL ESTIMADO", MARGEN, y);
  y += 5;
  doc.text(formatCOP(quote.total), MARGEN, y);
  y += 8;

  doc.setFontSize(7);
  doc.setFont(undefined, "normal");
  doc.text("Esta cotizacion no representa una venta ni una factura.", CENTRO, y, { align: "center", maxWidth: ANCHO - MARGEN * 2 });
  y += 8;

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.text("¡Gracias por tu interes!", CENTRO, y, { align: "center" });

  doc.save("cotizacion-" + quote.quote_number + ".pdf");
}
