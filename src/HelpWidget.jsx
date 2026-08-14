import { useState, useMemo } from "react";

const COLORS = {
  marca: "var(--cs-marca)",
  marcaClaro: "var(--cs-marca-claro)",
  acento: "var(--cs-acento)",
  fondo: "var(--cs-fondo)",
  borde: "var(--cs-borde)",
  texto: "var(--cs-texto)",
  textoSuave: "var(--cs-texto-suave)",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

const FAQ = [
  { cat: "Facturas", q: "¿Cómo genero una factura?", a: "Dale click a '+ Nueva factura' en el panel lateral, agrega los productos con su cantidad, llena los datos del cliente, y dale a 'Descargar PDF' o 'Imprimir'." },
  { cat: "Facturas", q: "¿Cómo fío una venta?", a: "En 'Nueva factura', en 'Método de pago' elige 'Fiado (a crédito)'. Se te va a pedir el nombre del cliente, y queda registrada como deuda en la sección 'Fiado'." },
  { cat: "Facturas", q: "¿Cómo cobro un abono de una deuda?", a: "Ve a 'Fiado' en el panel lateral, busca el cliente, dale click para expandir sus deudas, escribe el monto del abono y dale 'Abonar'." },
  { cat: "Inventario", q: "¿Cómo agrego un producto con variantes (tallas, colores)?", a: "Al crear el producto, marca 'Tiene variantes'. Guárdalo, y ahí mismo se abre el gestor de variantes para agregar cada una con su stock." },
  { cat: "Inventario", q: "¿Cómo hago un conteo físico?", a: "Dale click a 'Conteo físico' en el panel lateral. Escribe cuánto contaste en cada producto, y al final dale 'Aplicar conteo' para que el stock quede actualizado." },
  { cat: "Inventario", q: "¿Qué diferencia hay entre 'Producto' y 'Servicio'?", a: "Un Producto tiene stock (se descuenta al venderlo). Un Servicio no tiene stock (ej: corte de cabello), solo registra el ingreso." },
  { cat: "Caja", q: "¿Cómo abro y cierro caja?", a: "Dale 'Abrir caja' y pon el efectivo con el que empiezas el turno. Al final del día, dale 'Cerrar caja', cuenta tu efectivo físico, y el sistema te dice si sobró o faltó." },
  { cat: "Negocio", q: "¿Cómo invito a un empleado?", a: "Ve a 'Datos negocio' (solo lo ves si eres admin), baja hasta 'Empleados', pon su correo y su rol (Vendedor o Admin), y dale 'Invitar'. Esa persona debe registrarse en la app con ese mismo correo." },
  { cat: "Negocio", q: "¿Qué ve un Vendedor que no vea yo?", a: "Al revés: un Vendedor NO ve ganancias, costos, ni puede eliminar productos, la tienda, ni entrar a Datos negocio o exportar reportes. Solo tú (Admin) ves todo." },
  { cat: "Negocio", q: "¿Cómo comparto mi catálogo?", a: "Dale click a 'Catálogo público' en el panel lateral — copia un link que puedes mandar por WhatsApp, donde el cliente ve tus productos con fotos y precios, sin necesitar cuenta." },
  { cat: "Cotizaciones", q: "¿Qué diferencia hay entre una Cotización y una Factura?", a: "La Cotización NO descuenta stock ni es una venta real, es solo un presupuesto. Si el cliente acepta, le das 'Convertir en venta' y ahí sí se vuelve una venta de verdad." },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);

  const filtradas = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return FAQ;
    return FAQ.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        title="Ayuda"
        style={{
          position: "fixed", bottom: 22, right: 22, width: 54, height: 54, borderRadius: "50%",
          background: COLORS.marca, color: "white", border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px -6px rgba(21,75,62,0.5)", fontSize: 22, zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div className="cs-fade-up" style={{
          position: "fixed", bottom: 86, right: 22, width: 340, maxHeight: "70vh", background: "var(--cs-panel)",
          borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", border: "1px solid " + COLORS.borde,
          display: "flex", flexDirection: "column", zIndex: 60, overflow: "hidden", fontFamily: FONT_BODY,
        }}>
          <div style={{ background: COLORS.marca, color: "white", padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>¿En qué te ayudamos?</div>
            <input
              placeholder="Busca una pregunta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ marginTop: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ overflowY: "auto", padding: 8 }}>
            {filtradas.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.textoSuave, padding: 10 }}>No encontré nada con eso. Prueba con otras palabras.</p>
            ) : (
              filtradas.map((f, i) => (
                <div key={i} style={{ borderBottom: "1px solid " + COLORS.borde }}>
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "10px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.texto }}>{f.q}</span>
                    <span style={{ fontSize: 11, color: COLORS.marcaClaro, flexShrink: 0 }}>{expandedIndex === i ? "−" : "+"}</span>
                  </button>
                  {expandedIndex === i && (
                    <p style={{ fontSize: 12.5, color: COLORS.textoSuave, padding: "0 8px 10px", margin: 0, lineHeight: 1.5 }}>{f.a}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
