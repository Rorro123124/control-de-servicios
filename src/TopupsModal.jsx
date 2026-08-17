import { useState } from "react";
import { addTopup, deleteTopup, OPERADORES } from "./topupService";

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

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function TopupsModal({ businessId, topups, onClose, onChange }) {
  const [operator, setOperator] = useState("Claro");
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [guardando, setGuardando] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const deHoy = topups.filter((t) => t.created_at.slice(0, 10) === hoy);
  const gananciaHoy = deHoy.reduce((s, t) => s + Number(t.profit), 0);

  async function guardar(e) {
    e.preventDefault();
    if (!amount) return;
    setGuardando(true);
    try {
      await addTopup(businessId, { operator, amount, profit, customerPhone });
      setAmount("");
      setProfit("");
      setCustomerPhone("");
      await onChange();
    } catch (err) {
      alert("Hubo un error registrando la recarga: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    const ok = confirm("Eliminar este registro?");
    if (!ok) return;
    try {
      await deleteTopup(id);
      await onChange();
    } catch (err) {
      alert("Hubo un error eliminando: " + err.message);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Recargas y servicios</div>
            <div style={{ fontSize: 12.5, color: "#CFE3DB", marginTop: 2 }}>Ganancia de hoy: {formatCOP(gananciaHoy)}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={guardar} style={{ padding: 18, borderBottom: "1px solid " + COLORS.borde, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select value={operator} onChange={(e) => setOperator(e.target.value)} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }}>
            {OPERADORES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" placeholder="Monto recargado" style={{ flex: "1 1 130px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
          <input value={profit} onChange={(e) => setProfit(e.target.value)} type="number" min="0" placeholder="Tu ganancia" style={{ flex: "1 1 110px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Numero (opcional)" style={{ flex: "1 1 130px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
          <button type="submit" disabled={guardando} style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            {guardando ? "Guardando..." : "Registrar"}
          </button>
        </form>

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {topups.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>
              Todavia no has registrado ninguna recarga.
            </div>
          )}
          {topups.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px", borderBottom: "1px solid " + COLORS.fondo }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.texto }}>{t.operator} · {formatCOP(t.amount)}</div>
                <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{new Date(t.created_at).toLocaleString("es-CO")}{t.customer_phone ? " · " + t.customer_phone : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.marcaClaro }}>+{formatCOP(t.profit)}</div>
                <button onClick={() => eliminar(t.id)} style={{ background: "transparent", border: "none", color: COLORS.textoSuave, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
