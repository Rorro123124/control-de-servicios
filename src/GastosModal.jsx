import { useState } from "react";
import { addExpense, deleteExpense } from "./expenseService";

const COLORS = {
  marca: "#154B3E",
  marcaClaro: "#1F6F5C",
  acento: "#E5A13C",
  fondo: "#F5F3EE",
  borde: "#E4DFD3",
  texto: "#211D17",
  textoSuave: "#736C5E",
  urgente: "#D6483C",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

const CATEGORIAS = ["Arriendo", "Servicios", "Nomina", "Transporte", "Otro"];

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}
function formatMiles(value) {
  if (value === "" || value == null) return "";
  return Number(value).toLocaleString("es-CO");
}
function soloDigitos(texto) {
  return texto.replace(/\D/g, "");
}

export default function GastosModal({ businessId, gastos, onClose, onChange }) {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("Arriendo");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  const totalMes = gastos
    .filter((g) => g.expense_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, g) => s + Number(g.amount), 0);

  async function guardar(e) {
    e.preventDefault();
    if (!descripcion.trim() || !monto) return;
    setGuardando(true);
    try {
      await addExpense(businessId, { description: descripcion, amount: monto, category: categoria, expenseDate: fecha });
      setDescripcion("");
      setMonto("");
      await onChange();
    } catch (err) {
      alert("Hubo un error guardando el gasto: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    const ok = confirm("Eliminar este gasto?");
    if (!ok) return;
    try {
      await deleteExpense(id);
      await onChange();
    } catch (err) {
      alert("Hubo un error eliminando el gasto: " + err.message);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(33,29,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Gastos del negocio</div>
            <div style={{ fontSize: 12.5, color: "#CFE3DB", marginTop: 2 }}>Este mes: {formatCOP(totalMes)}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={guardar} style={{ padding: 18, borderBottom: "1px solid " + COLORS.borde, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripcion (ej: arriendo de agosto)"
            style={{ flex: "1 1 220px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <input
            value={formatMiles(monto)}
            onChange={(e) => setMonto(soloDigitos(e.target.value))}
            inputMode="numeric"
            placeholder="Monto"
            style={{ width: 130, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            type="date"
            style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5, fontFamily: FONT_BODY }}
          />
          <button
            type="submit"
            disabled={guardando}
            style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13.5, cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1 }}
          >
            {guardando ? "Guardando..." : "Agregar"}
          </button>
        </form>

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {gastos.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>
              Todavia no has registrado ningun gasto.
            </div>
          )}
          {gastos.map((g) => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px", borderBottom: "1px solid " + COLORS.fondo }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.texto }}>{g.description}</div>
                <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{g.category || "Sin categoria"} · {g.expense_date}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.urgente }}>{formatCOP(g.amount)}</div>
                <button
                  onClick={() => eliminar(g.id)}
                  title="Eliminar"
                  style={{ background: "transparent", border: "none", color: COLORS.textoSuave, cursor: "pointer", fontSize: 16 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
