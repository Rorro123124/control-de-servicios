import { useState, useRef, useEffect } from "react";
import { preguntarAlAsistente } from "./chatService";

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

export default function ChatWidget({ businessId, businessName }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hola, soy tu asistente de " + (businessName || "tu tienda") + ". Preguntame lo que quieras sobre tu inventario o tus ventas." },
  ]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function enviar() {
    const pregunta = input.trim();
    if (!pregunta || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: pregunta }]);
    setInput("");
    setLoading(true);

    try {
      const respuesta = await preguntarAlAsistente(businessId, pregunta);
      setMessages((prev) => [...prev, { from: "bot", text: respuesta }]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: "bot", text: "Tuve un problema respondiendo: " + err.message }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        title="Asistente"
        style={{
          position: "fixed", bottom: 22, right: 88, width: 54, height: 54, borderRadius: "50%",
          background: COLORS.acento, color: COLORS.marca, border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px -6px rgba(229,161,60,0.6)", fontSize: 12, fontWeight: 700, zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY,
        }}
      >
        {open ? "×" : "IA"}
      </button>

      {open && (
        <div className="cs-fade-up" style={{
          position: "fixed", bottom: 86, right: 88, width: 340, height: 440, background: "var(--cs-panel)",
          borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", border: "1px solid " + COLORS.borde,
          display: "flex", flexDirection: "column", zIndex: 60, overflow: "hidden", fontFamily: FONT_BODY,
        }}>
          <div style={{ background: COLORS.marca, color: "white", padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>Asistente de inventario</div>
            <div style={{ fontSize: 11.5, color: "#CFE3DB", marginTop: 2 }}>Responde con tus datos reales</div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.from === "user" ? COLORS.marca : COLORS.fondo,
                  color: m.from === "user" ? "white" : COLORS.texto,
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: COLORS.textoSuave, fontSize: 12.5, padding: "0 4px" }}>
                Pensando...
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid " + COLORS.borde, flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={loading}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13, boxSizing: "border-box" }}
            />
            <button
              onClick={enviar}
              disabled={loading}
              style={{
                background: COLORS.marca, color: "white", border: "none", borderRadius: 8,
                padding: "0 14px", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
