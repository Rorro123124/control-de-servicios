import { useState, useEffect, useRef, useMemo } from "react";

const COLORS = {
  marca: "var(--cs-marca)",
  marcaClaro: "var(--cs-marca-claro)",
  acento: "var(--cs-acento)",
  fondo: "var(--cs-fondo)",
  panel: "var(--cs-panel)",
  borde: "var(--cs-borde)",
  texto: "var(--cs-texto)",
  textoSuave: "var(--cs-texto-suave)",
};
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

export default function QuickSearch({ products, suppliers, customers, actions, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = [];

    actions.forEach((a) => {
      if (!q || a.label.toLowerCase().includes(q)) {
        items.push({ tipo: "Accion", label: a.label, run: a.run });
      }
    });

    if (q) {
      products.forEach((p) => {
        if (p.name.toLowerCase().includes(q)) {
          items.push({
            tipo: "Producto",
            label: p.name,
            sub: "Stock: " + p.stock,
            run: () => actions.find((a) => a.label === "Inventario")?.run(),
          });
        }
      });

      suppliers.forEach((s) => {
        if (s.name.toLowerCase().includes(q)) {
          items.push({
            tipo: "Proveedor",
            label: s.name,
            sub: s.phone || "",
            run: () => actions.find((a) => a.label === "Proveedores")?.run(),
          });
        }
      });

      customers.forEach((c) => {
        const nombreCompleto = ((c.name || "") + " " + (c.lastname || "")).trim();
        if (nombreCompleto.toLowerCase().includes(q)) {
          items.push({
            tipo: "Cliente",
            label: nombreCompleto,
            sub: c.phone || "",
            run: () => actions.find((a) => a.label === "Fiado")?.run(),
          });
        }
      });
    }

    return items.slice(0, 20);
  }, [query, products, suppliers, customers, actions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function ejecutar(item) {
    item.run();
    onClose();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) ejecutar(results[selectedIndex]);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "10vh 16px 16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.panel, borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px -12px rgba(0,0,0,0.4)", fontFamily: FONT_BODY }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Busca un producto, cliente, proveedor, o escribe una accion..."
          style={{ padding: "16px 18px", border: "none", borderBottom: "1px solid " + COLORS.borde, fontSize: 15, outline: "none", background: "transparent", color: COLORS.texto }}
        />
        <div style={{ overflowY: "auto" }}>
          {results.length === 0 && (
            <div style={{ padding: 20, color: COLORS.textoSuave, fontSize: 13.5 }}>Sin resultados.</div>
          )}
          {results.map((item, i) => (
            <div
              key={i}
              onClick={() => ejecutar(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                padding: "10px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                background: i === selectedIndex ? COLORS.fondo : "transparent",
              }}
            >
              <div>
                <span style={{ fontSize: 14, color: COLORS.texto }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 12, color: COLORS.textoSuave, marginLeft: 8 }}>{item.sub}</span>}
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.marcaClaro, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.tipo}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 18px", borderTop: "1px solid " + COLORS.borde, fontSize: 11.5, color: COLORS.textoSuave, display: "flex", gap: 14 }}>
          <span>↑↓ moverse</span>
          <span>Enter seleccionar</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
