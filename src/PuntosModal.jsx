import { useState } from "react";
import { redimirPuntos, COP_POR_PUNTO } from "./loyaltyService";

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

export default function PuntosModal({ customers, onClose, onChange }) {
  const [redimiendoId, setRedimiendoId] = useState(null);
  const [montoRedimir, setMontoRedimir] = useState({});

  const conPuntos = customers.filter((c) => Number(c.points || 0) > 0 || true);

  async function redimir(customer) {
    const puntos = Number(montoRedimir[customer.id]);
    if (!puntos || puntos <= 0) return;
    setRedimiendoId(customer.id);
    try {
      await redimirPuntos(customer.id, puntos);
      setMontoRedimir((v) => ({ ...v, [customer.id]: "" }));
      await onChange();
    } catch (err) {
      alert("Hubo un error redimiendo los puntos: " + err.message);
    } finally {
      setRedimiendoId(null);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(33,29,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: "var(--cs-panel)", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Puntos de fidelizacion</div>
            <div style={{ fontSize: 12.5, color: "#CFE3DB", marginTop: 2 }}>1 punto por cada {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(COP_POR_PUNTO)} comprados</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "14px 22px" }}>
          {conPuntos.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.textoSuave }}>Aun no hay clientes registrados. Los clientes se registran solos cuando pones su nombre al hacer una factura.</p>
          ) : (
            conPuntos.map((c) => (
              <div key={c.id} style={{ border: "1px solid " + COLORS.borde, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name} {c.lastname}</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, color: COLORS.acento, fontSize: 15 }}>
                    {Number(c.points || 0)} pts
                  </div>
                </div>
                {Number(c.points || 0) > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      type="number"
                      min="1"
                      max={c.points}
                      placeholder="Puntos a redimir..."
                      value={montoRedimir[c.id] || ""}
                      onChange={(e) => setMontoRedimir((v) => ({ ...v, [c.id]: e.target.value }))}
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13 }}
                    />
                    <button
                      onClick={() => redimir(c)}
                      disabled={redimiendoId === c.id}
                      style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      {redimiendoId === c.id ? "..." : "Redimir"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
