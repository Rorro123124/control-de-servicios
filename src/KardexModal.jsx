import { useState, useEffect } from "react";
import { getKardexForProduct } from "./productService";

const COLORS = {
  marca: "var(--cs-marca)",
  panel: "var(--cs-panel)",
  borde: "var(--cs-borde)",
  texto: "var(--cs-texto)",
  textoSuave: "var(--cs-texto-suave)",
  urgente: "var(--cs-urgente)",
  bien: "var(--cs-bien)",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

export default function KardexModal({ productId, productName, onClose }) {
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getKardexForProduct(productId).then((data) => {
      setMovimientos(data);
      setCargando(false);
    });
  }, [productId]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 75, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600 }}>Kardex</div>
            <div style={{ fontSize: 12, color: "#CFE3DB" }}>{productName}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {cargando && <p style={{ padding: 20, fontSize: 13, color: COLORS.textoSuave, textAlign: "center" }}>Cargando...</p>}
          {!cargando && movimientos.length === 0 && (
            <p style={{ padding: 20, fontSize: 13, color: COLORS.textoSuave, textAlign: "center" }}>Sin movimientos registrados todavia.</p>
          )}
          {movimientos.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 20px", borderBottom: "1px solid var(--cs-fondo)", fontSize: 13 }}>
              <div>
                <div style={{ color: COLORS.texto }}>{m.motivo}</div>
                <div style={{ fontSize: 11, color: COLORS.textoSuave }}>{new Date(m.created_at).toLocaleString("es-CO")}</div>
              </div>
              <div style={{ fontWeight: 700, color: Number(m.qty_delta) >= 0 ? COLORS.bien : COLORS.urgente }}>
                {Number(m.qty_delta) >= 0 ? "+" : ""}{m.qty_delta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
