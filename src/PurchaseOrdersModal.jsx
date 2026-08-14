import { useState } from "react";
import { addPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } from "./purchaseOrderService";

const COLORS = {
  marca: "var(--cs-marca)",
  marcaClaro: "var(--cs-marca-claro)",
  acento: "var(--cs-acento)",
  fondo: "var(--cs-fondo)",
  panel: "var(--cs-panel)",
  borde: "var(--cs-borde)",
  texto: "var(--cs-texto)",
  textoSuave: "var(--cs-texto-suave)",
  urgente: "var(--cs-urgente)",
  bienBg: "var(--cs-bien-bg)",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function PurchaseOrdersModal({ businessId, orders, suppliers, products, onClose, onChange }) {
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [productSel, setProductSel] = useState("");
  const [qtySel, setQtySel] = useState("");
  const [costoSel, setCostoSel] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);

  function nombreProveedor(id) {
    const s = suppliers.find((s) => s.id === id);
    return s ? s.name : "Sin proveedor";
  }

  function agregarItem() {
    const producto = products.find((p) => p.id === productSel);
    if (!producto || !qtySel) return;
    setItems((prev) => [
      ...prev,
      { productId: producto.id, name: producto.name, qty: qtySel, unitCost: costoSel || producto.realCost || 0 },
    ]);
    setProductSel("");
    setQtySel("");
    setCostoSel("");
  }

  function quitarItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function guardarOrden(e) {
    e.preventDefault();
    if (items.length === 0) {
      alert("Agrega al menos un producto a la orden.");
      return;
    }
    setGuardando(true);
    try {
      await addPurchaseOrder(businessId, supplierId, notes, items);
      setSupplierId("");
      setNotes("");
      setItems([]);
      setMostrandoForm(false);
      await onChange();
    } catch (err) {
      alert("Hubo un error creando la orden: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function marcarRecibida(order) {
    const ok = confirm("Marcar esta orden como recibida? Esto va a sumar el stock de cada producto automaticamente.");
    if (!ok) return;
    setProcesandoId(order.id);
    try {
      await receivePurchaseOrder(order);
      await onChange();
    } catch (err) {
      alert("Hubo un error marcando la orden como recibida: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  }

  async function cancelar(orderId) {
    const ok = confirm("Cancelar esta orden de compra?");
    if (!ok) return;
    setProcesandoId(orderId);
    try {
      await cancelPurchaseOrder(orderId);
      await onChange();
    } catch (err) {
      alert("Hubo un error cancelando la orden: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  }

  const totalOrdenActual = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitCost), 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Ordenes de compra</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "14px 22px", borderBottom: "1px solid " + COLORS.borde }}>
          <button
            onClick={() => setMostrandoForm((v) => !v)}
            style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
          >
            {mostrandoForm ? "Cancelar" : "+ Nueva orden"}
          </button>
        </div>

        {mostrandoForm && (
          <form onSubmit={guardarOrden} style={{ padding: "14px 22px", borderBottom: "1px solid " + COLORS.borde, display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }}>
              <option value="">Sin proveedor especifico</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota (opcional)" style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <select value={productSel} onChange={(e) => setProductSel(e.target.value)} style={{ flex: "1 1 180px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }}>
                <option value="">Selecciona un producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input value={qtySel} onChange={(e) => setQtySel(e.target.value)} type="number" min="1" placeholder="Cant." style={{ width: 80, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
              <input value={costoSel} onChange={(e) => setCostoSel(e.target.value)} type="number" min="0" placeholder="Costo c/u" style={{ width: 110, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
              <button type="button" onClick={agregarItem} style={{ background: COLORS.marcaClaro, color: "white", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Agregar
              </button>
            </div>

            {items.length > 0 && (
              <div style={{ background: COLORS.fondo, borderRadius: 8, padding: 10 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                    <span>{it.qty} x {it.name} ({formatCOP(it.unitCost)} c/u)</span>
                    <button type="button" onClick={() => quitarItem(i)} style={{ background: "transparent", border: "none", color: COLORS.urgente, cursor: "pointer" }}>×</button>
                  </div>
                ))}
                <div style={{ fontWeight: 700, marginTop: 6, fontSize: 13.5 }}>Total estimado: {formatCOP(totalOrdenActual)}</div>
              </div>
            )}

            <button type="submit" disabled={guardando} style={{ background: COLORS.marca, color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              {guardando ? "Guardando..." : "Crear orden"}
            </button>
          </form>
        )}

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {orders.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>
              Todavia no has creado ninguna orden de compra.
            </div>
          )}
          {orders.map((o) => {
            const total = (o.purchase_order_items || []).reduce((s, it) => s + Number(it.qty) * Number(it.unit_cost), 0);
            return (
              <div key={o.id} style={{ padding: "12px 22px", borderBottom: "1px solid " + COLORS.fondo }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {nombreProveedor(o.supplier_id)}
                      <span
                        style={{
                          marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                          color: o.status === "recibida" ? COLORS.marcaClaro : o.status === "cancelada" ? COLORS.urgente : COLORS.acento,
                          background: o.status === "recibida" ? COLORS.bienBg : o.status === "cancelada" ? "#FBE8E5" : "#FAF0DC",
                        }}
                      >
                        {o.status === "recibida" ? "Recibida" : o.status === "cancelada" ? "Cancelada" : "Pendiente"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{new Date(o.created_at).toLocaleDateString("es-CO")} · {formatCOP(total)}</div>
                  </div>
                  {o.status === "pendiente" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => marcarRecibida(o)} disabled={procesandoId === o.id} style={{ background: COLORS.marcaClaro, color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Recibida
                      </button>
                      <button onClick={() => cancelar(o.id)} disabled={procesandoId === o.id} style={{ background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12.5, color: COLORS.textoSuave }}>
                  {(o.purchase_order_items || []).map((it) => it.qty + "x " + it.product_name).join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
