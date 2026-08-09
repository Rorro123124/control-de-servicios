import { useState, useEffect } from "react";
import { getCatalog } from "./catalogService";

const COLORS = {
  marca: "#154B3E",
  marcaClaro: "#1F6F5C",
  acento: "#E5A13C",
  fondo: "#F5F3EE",
  panel: "#FFFFFF",
  borde: "#E4DFD3",
  texto: "#211D17",
  textoSuave: "#736C5E",
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function Catalog({ businessId }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCatalog(businessId)
      .then((data) => {
        setItems(data || []);
        setCargando(false);
      })
      .catch(() => {
        setError(true);
        setCargando(false);
      });
  }, [businessId]);

  if (cargando) {
    return <div style={{ textAlign: "center", marginTop: 80, fontFamily: FONT_BODY, color: COLORS.textoSuave }}>Cargando catalogo...</div>;
  }

  if (error || items.length === 0) {
    return <div style={{ textAlign: "center", marginTop: 80, fontFamily: FONT_BODY, color: COLORS.textoSuave }}>Este catalogo no esta disponible.</div>;
  }

  const info = items[0];
  const whatsappLink = info.phone ? "https://wa.me/57" + info.phone.replace(/\D/g, "") : null;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.fondo, fontFamily: FONT_BODY, color: COLORS.texto }}>
      <div style={{ background: COLORS.marca, color: "white", padding: "28px 20px", textAlign: "center" }}>
        {info.logo_url && <img src={info.logo_url} alt="Logo" style={{ maxWidth: 90, maxHeight: 90, objectFit: "contain", marginBottom: 10 }} />}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600 }}>{info.business_name}</div>
        {info.address && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{info.address}</div>}
        {whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12, padding: "9px 18px", borderRadius: 999, background: COLORS.acento, color: "#2B2107", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
            Escribir por WhatsApp
          </a>
        )}
        {info.instagram && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>@{info.instagram.replace("@", "")}</div>}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {items.map((p) => (
            <div key={p.product_id} style={{ background: COLORS.panel, borderRadius: 14, border: "1px solid " + COLORS.borde, overflow: "hidden", opacity: p.disponible ? 1 : 0.55 }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "#EEEBE3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: COLORS.textoSuave, fontSize: 12 }}>Sin foto</span>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15 }}>{p.product_name}</div>
                {p.category && <div style={{ fontSize: 11, color: COLORS.textoSuave }}>{p.category}</div>}
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6, color: COLORS.marcaClaro }}>{formatCOP(p.sale_price)}</div>
                {!p.disponible && <div style={{ fontSize: 11, color: "#D6483C", fontWeight: 700, marginTop: 4 }}>Agotado</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: 24, fontSize: 11, color: COLORS.textoSuave }}>
        Catalogo generado con Control de Servicios
      </div>
    </div>
  );
}
