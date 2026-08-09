function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function printInvoice(business, invoice, items) {
  const esDomicilio = invoice.delivery_type === "domicilio";
  const nombreCliente = ((invoice.buyer_name || "") + " " + (invoice.buyer_lastname || "")).trim();
  const itemsTotal = items.reduce((s, it) => s + Number(it.subtotal), 0);
  const tasa = Number(business.tax_rate) || 0;

  let filasProductos = "";
  items.forEach((it) => {
    filasProductos +=
      '<div class="fila"><div>' + escapeHtml(it.product_name) + " x" + it.qty + '</div><div>' + formatCOP(it.subtotal) + "</div></div>";
  });

  let bloqueImpuesto = "";
  if (tasa > 0) {
    const base = itemsTotal / (1 + tasa / 100);
    const valorImpuesto = itemsTotal - base;
    bloqueImpuesto =
      '<div class="linea"></div><div class="fila chico"><strong>IMPUESTO</strong><strong>BASE</strong><strong>VALOR</strong></div>' +
      '<div class="fila chico"><span>' + escapeHtml(business.tax_label || "IVA") + " " + tasa + '%</span><span>' + formatCOP(base) + '</span><span>' + formatCOP(valorImpuesto) + "</span></div>";
  }

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Factura ${invoice.invoice_number}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        body { font-family: Arial, sans-serif; width: 74mm; margin: 0 auto; color: #111; }
        .centro { text-align: center; }
        .logo { max-width: 55mm; max-height: 25mm; display: block; margin: 0 auto 6px; }
        h1 { font-size: 15px; margin: 4px 0; }
        p { margin: 2px 0; font-size: 11px; }
        .linea { border-top: 1px dashed #333; margin: 8px 0; }
        .fila { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; gap: 8px; }
        .fila.chico { font-size: 9px; }
        .total { font-size: 15px; font-weight: bold; }
        .gracias { text-align: center; font-weight: bold; margin-top: 10px; font-size: 12px; }
        .redes { text-align: center; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="centro">
        ${business.logo_url ? '<img class="logo" src="' + escapeHtml(business.logo_url) + '" />' : ""}
        <h1>${escapeHtml(business.name)}</h1>
        ${business.nit ? "<p>NIT " + escapeHtml(business.nit) + "</p>" : ""}
        ${business.address ? "<p>" + escapeHtml(business.address) + "</p>" : ""}
        ${business.phone ? "<p>Tel " + escapeHtml(business.phone) + "</p>" : ""}
      </div>
      <div class="linea"></div>
      <div class="fila"><strong>${esDomicilio ? "DOMICILIO " : "PEDIDO "}${invoice.invoice_number}</strong><span>${new Date(invoice.created_at).toLocaleString("es-CO")}</span></div>
      ${invoice.cashier_name ? "<p>Atendido por: " + escapeHtml(invoice.cashier_name) + "</p>" : ""}
      ${nombreCliente ? "<p>Cliente: " + escapeHtml(nombreCliente) + "</p>" : ""}
      ${invoice.buyer_id ? "<p>ID: " + escapeHtml(invoice.buyer_id) + "</p>" : ""}
      ${invoice.buyer_phone ? "<p>Tel: " + escapeHtml(invoice.buyer_phone) + "</p>" : ""}
      ${esDomicilio && invoice.buyer_address ? "<p>Direccion: " + escapeHtml(invoice.buyer_address) + "</p>" : ""}
      <div class="linea"></div>
      ${filasProductos}
      <div class="linea"></div>
      <div class="fila"><span>Subtotal</span><span>${formatCOP(itemsTotal)}</span></div>
      ${invoice.delivery_fee > 0 ? '<div class="fila"><span>Domicilio</span><span>' + formatCOP(invoice.delivery_fee) + "</span></div>" : ""}
      <div class="fila total"><span>TOTAL</span><span>${formatCOP(invoice.total)}</span></div>
      ${bloqueImpuesto}
      <p class="gracias">${escapeHtml(business.thank_you_message || "¡Gracias por su compra!")}</p>
      ${business.instagram ? '<p class="redes">Siguenos: @' + escapeHtml(business.instagram.replace("@", "")) + "</p>" : ""}
    </body>
    </html>
  `;

  const ventana = window.open("", "_blank", "width=400,height=600");
  ventana.document.write(html);
  ventana.document.close();

  const imprimirYCerrar = () => {
    ventana.focus();
    ventana.print();
  };

  if (business.logo_url) {
    const img = ventana.document.querySelector("img");
    if (img) {
      img.onload = imprimirYCerrar;
      img.onerror = imprimirYCerrar;
      setTimeout(imprimirYCerrar, 1500);
    } else {
      setTimeout(imprimirYCerrar, 300);
    }
  } else {
    setTimeout(imprimirYCerrar, 300);
  }
}
