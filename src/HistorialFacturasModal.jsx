import { useState } from "react";
import { cancelInvoice } from "./invoiceService";

const COLORS = {
  marca: "var(--cs-marca)",
  marcaClaro: "var(--cs-marca-claro)",
  acento: "var(--cs-acento)",
  fondo: "var(--cs-fondo)",
  borde: "var(--cs-borde)",
  texto: "var(--cs-texto)",
  textoSuave: "var(--cs-texto-suave)",
  urgente: "var(--cs-urgente)",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function HistorialFacturasModal({ invoices, onClose, onChange }) {
  const [expandedId, setExpandedId] = useState(null);
  const [anulando, setAnulando] = useState(null);

  async function anular(invoice) {
    const ok = confirm(
      "Anular esta factura? Esto va a devolver el stock de todos sus productos y descontar la venta del historial. No se puede deshacer."
    );
    if (!ok) return;

    setAnulando(invoice.id);
    try {
      await cancelInvoice(invoice);
      await onChange();
    } catch (err) {
      alert("Hubo un error anulando la factura: " + err.message);
    } finally {
      setAnulando(null);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(33,29,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: "var(--cs-panel)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Historial de facturas</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {invoices.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>
              Todavia no hay facturas registradas.
            </div>
          )}
          {invoices.map((inv) => {
            const cancelada = !!inv.cancelled_at;
            const expandido = expandedId === inv.id;
            return (
              <div key={inv.id} style={{ borderBottom: "1px solid " + COLORS.fondo, opacity: cancelada ? 0.6 : 1 }}>
                <div
                  onClick={() => setExpandedId(expandido ? null : inv.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.texto }}>
                      Factura #{inv.invoice_number || inv.id.slice(0, 8)}
                      {cancelada && (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: COLORS.urgente, background: "#FBE8E5", padding: "2px 8px", borderRadius: 999 }}>
                          ANULADA
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textoSuave }}>
                      {((inv.buyer_name || "") + " " + (inv.buyer_lastname || "")).trim() || "Cliente sin nombre"} · {new Date(inv.created_at).toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.marcaClaro }}>{formatCOP(inv.total)}</div>
                </div>

                {expandido && (
                  <div style={{ padding: "0 22px 14px 22px" }}>
                    {(inv.invoice_items || []).map((it) => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLORS.textoSuave, padding: "3px 0" }}>
                        <span>{it.qty} x {it.product_name}</span>
                        <span>{formatCOP(it.subtotal)}</span>
                      </div>
                    ))}
                    {!cancelada && (
                      <button
                        onClick={() => anular(inv)}
                        disabled={anulando === inv.id}
                        style={{ marginTop: 10, background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: anulando === inv.id ? "default" : "pointer", opacity: anulando === inv.id ? 0.6 : 1 }}
                      >
                        {anulando === inv.id ? "Anulando..." : "Anular factura"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
