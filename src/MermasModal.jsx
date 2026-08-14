import { useState } from "react";
import { addWasteRecord, MOTIVOS_MERMA } from "./wasteService";

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
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

export default function MermasModal({ businessId, products, mermas, onClose, onChange }) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Dañado");
  const [notes, setNotes] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  const totalUnidadesMes = mermas
    .filter((m) => m.waste_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, m) => s + Number(m.qty), 0);

  async function guardar(e) {
    e.preventDefault();
    if (!productId || !qty) return;
    setGuardando(true);
    try {
      await addWasteRecord(businessId, { productId, qty, reason, notes, wasteDate: fecha });
      setProductId("");
      setQty("");
      setNotes("");
      await onChange();
    } catch (err) {
      alert("Hubo un error registrando la merma: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Mermas</div>
            <div style={{ fontSize: 12.5, color: "#CFE3DB", marginTop: 2 }}>Unidades de baja este mes: {totalUnidadesMes}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={guardar} style={{ padding: 18, borderBottom: "1px solid " + COLORS.borde, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            style={{ flex: "1 1 200px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          >
            <option value="">Selecciona un producto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
            ))}
          </select>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            min="1"
            placeholder="Cantidad"
            style={{ width: 110, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          >
            {MOTIVOS_MERMA.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            type="date"
            style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota (opcional)"
            style={{ flex: "1 1 200px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <button
            type="submit"
            disabled={guardando}
            style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13.5, cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Registrar"}
          </button>
        </form>

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {mermas.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>
              Todavia no has registrado ninguna merma.
            </div>
          )}
          {mermas.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px", borderBottom: "1px solid " + COLORS.fondo }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.texto }}>{m.qty}x {m.product_name}</div>
                <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{m.reason} · {m.waste_date}{m.notes ? " · " + m.notes : ""}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.urgente, background: "#FBE8E5", padding: "3px 10px", borderRadius: 999 }}>
                BAJA
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
