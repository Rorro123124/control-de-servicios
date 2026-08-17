import { useState } from "react";
import { interpretarColumnas } from "./chatService";
import { addProduct } from "./productService";

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

const CAMPOS = [
  { value: "ignorar", label: "No importar esta columna" },
  { value: "name", label: "Nombre del producto" },
  { value: "category", label: "Categoria" },
  { value: "stock", label: "Cantidad en inventario" },
  { value: "salePrice", label: "Precio de venta" },
  { value: "realCost", label: "Costo real" },
  { value: "avgDailyDemand", label: "Demanda diaria promedio" },
  { value: "expirationDate", label: "Fecha de vencimiento" },
  { value: "barcode", label: "Codigo de barras" },
];

export default function ImportInventoryModal({ businessId, onClose, onImported }) {
  const [paso, setPaso] = useState("subir");
  const [headers, setHeaders] = useState([]);
  const [todasLasFilas, setTodasLasFilas] = useState([]);
  const [mapeo, setMapeo] = useState({});
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState({ ok: 0, fallidos: 0 });

  async function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setPaso("mapeando");

    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const hoja = workbook.worksheets[0];

      const filas = [];
      hoja.eachRow((row) => {
        filas.push(row.values.slice(1));
      });

      if (filas.length < 2) {
        setError("El archivo no tiene suficientes filas (se necesita al menos encabezados + 1 fila de datos).");
        setPaso("subir");
        return;
      }

      const encabezados = filas[0].map((h) => String(h || "").trim());
      const datos = filas.slice(1).filter((f) => f.some((c) => c !== null && c !== undefined && c !== ""));

      setHeaders(encabezados);
      setTodasLasFilas(datos);

      const muestra = datos.slice(0, 5);
      try {
        const mapeoSugerido = await interpretarColumnas(encabezados, muestra);
        const mapeoLimpio = {};
        encabezados.forEach((h) => {
          mapeoLimpio[h] = mapeoSugerido && mapeoSugerido[h] ? mapeoSugerido[h] : "ignorar";
        });
        setMapeo(mapeoLimpio);
      } catch (err) {
        console.error("No se pudo interpretar con IA, mapea a mano:", err.message);
        const mapeoVacio = {};
        encabezados.forEach((h) => (mapeoVacio[h] = "ignorar"));
        setMapeo(mapeoVacio);
      }

      setPaso("revisar");
    } catch (err) {
      setError("No se pudo leer el archivo: " + err.message);
      setPaso("subir");
    }
  }

  function filaAProducto(fila) {
    const producto = {};
    headers.forEach((h, i) => {
      const campo = mapeo[h];
      if (campo && campo !== "ignorar") {
        producto[campo] = fila[i];
      }
    });
    return producto;
  }

  async function confirmarImportacion() {
    const hayNombre = Object.values(mapeo).includes("name");
    if (!hayNombre) {
      setError("Debes indicar cual columna es el nombre del producto antes de importar.");
      return;
    }

    setPaso("importando");
    let ok = 0;
    let fallidos = 0;

    for (const fila of todasLasFilas) {
      const producto = filaAProducto(fila);
      if (!producto.name) {
        fallidos++;
        continue;
      }
      try {
        await addProduct(businessId, producto);
        ok++;
      } catch (err) {
        fallidos++;
      }
    }

    setResultado({ ok, fallidos });
    setPaso("listo");
  }

  function cerrarYActualizar() {
    if (resultado.ok > 0) onImported();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Importar inventario desde Excel</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 22, overflowY: "auto" }}>
          {error && (
            <div style={{ background: "#FBE8E5", color: COLORS.urgente, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {paso === "subir" && (
            <div>
              <p style={{ fontSize: 13.5, color: COLORS.textoSuave, marginBottom: 14 }}>
                Sube tu archivo de Excel con tu inventario, como lo tengas armado. No importa el orden de las columnas ni cómo se llamen — la IA va a tratar de reconocerlas, y tú confirmas antes de importar nada.
              </p>
              <input type="file" accept=".xlsx" onChange={onFileChange} style={{ fontSize: 13.5 }} />
            </div>
          )}

          {paso === "mapeando" && (
            <p style={{ fontSize: 13.5, color: COLORS.textoSuave, textAlign: "center", padding: 30 }}>Leyendo el archivo y pidiendole a la IA que reconozca las columnas...</p>
          )}

          {paso === "revisar" && (
            <div>
              <p style={{ fontSize: 13.5, color: COLORS.textoSuave, marginBottom: 10 }}>
                Revisa que cada columna quedo mapeada al campo correcto. La IA ya hizo una primera propuesta, ajusta lo que haga falta.
              </p>
              {headers.map((h, i) => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: "0 0 190px", overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.texto, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</div>
                    <div style={{ fontSize: 11, color: COLORS.textoSuave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ej: {String(todasLasFilas[0] && todasLasFilas[0][i] != null ? todasLasFilas[0][i] : "-")}
                    </div>
                  </div>
                  <select
                    value={mapeo[h] || "ignorar"}
                    onChange={(e) => setMapeo({ ...mapeo, [h]: e.target.value })}
                    style={{ flex: 1, padding: "7px 9px", borderRadius: 7, border: "1px solid " + COLORS.borde, fontSize: 13 }}
                  >
                    {CAMPOS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ marginTop: 16, padding: "10px 12px", background: COLORS.fondo, borderRadius: 8, fontSize: 12.5, color: COLORS.textoSuave }}>
                Se van a importar <strong>{todasLasFilas.length}</strong> productos.
              </div>

              <button
                onClick={confirmarImportacion}
                style={{ marginTop: 14, background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
              >
                Importar {todasLasFilas.length} productos
              </button>
            </div>
          )}

          {paso === "importando" && (
            <p style={{ fontSize: 13.5, color: COLORS.textoSuave, textAlign: "center", padding: 30 }}>Importando productos, no cierres esta ventana...</p>
          )}

          {paso === "listo" && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.marca, marginBottom: 8 }}>Importacion terminada</div>
              <p style={{ fontSize: 13.5, color: COLORS.textoSuave }}>
                {resultado.ok} productos importados correctamente.
                {resultado.fallidos > 0 && " " + resultado.fallidos + " filas no se pudieron importar (sin nombre valido)."}
              </p>
              <button
                onClick={cerrarYActualizar}
                style={{ marginTop: 10, background: COLORS.marca, color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
