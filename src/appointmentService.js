import { useState, useEffect } from "react";
import {
  getAppointmentsByDate,
  addAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getCustomerHistory,
  addAppointmentItems,
} from "./appointmentService";

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
  bienBg: "var(--cs-bien-bg)",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";

const ESTADO_LABEL = { pendiente: "Pendiente", confirmada: "Confirmada", "en-espera": "Lista de espera", completada: "Completada", cancelada: "Cancelada", "no-show": "No llego" };
const ESTADO_COLOR = { pendiente: COLORS.acento, confirmada: COLORS.marcaClaro, "en-espera": COLORS.acento, completada: COLORS.marcaClaro, cancelada: COLORS.urgente, "no-show": COLORS.urgente };

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function AppointmentsModal({ businessId, sellers, products, onClose }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", serviceName: "", servicePrice: "", appointmentTime: "", durationMinutes: "30", stylistId: "", notes: "" });
  const [historialCliente, setHistorialCliente] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [agregandoProductoA, setAgregandoProductoA] = useState(null);
  const [productoSel, setProductoSel] = useState("");
  const [cantidadSel, setCantidadSel] = useState("");

  async function cargarCitas() {
    setCargando(true);
    const data = await getAppointmentsByDate(businessId, fecha);
    setCitas(data);
    setCargando(false);
  }

  useEffect(() => {
    cargarCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  function cambiarDia(delta) {
    const d = new Date(fecha + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setFecha(d.toISOString().slice(0, 10));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.customerName || !form.serviceName || !form.appointmentTime) return;
    setGuardando(true);
    try {
      const estilista = sellers.find((s) => s.id === form.stylistId);
      await addAppointment(businessId, { ...form, appointmentDate: fecha, stylistName: estilista ? estilista.name : "" });
      setForm({ customerName: "", customerPhone: "", serviceName: "", servicePrice: "", appointmentTime: "", durationMinutes: "30", stylistId: "", notes: "" });
      setMostrandoForm(false);
      await cargarCitas();
    } catch (err) {
      alert("Hubo un error creando la cita: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(id, status) {
    try {
      await updateAppointmentStatus(id, status);
      await cargarCitas();
    } catch (err) {
      alert("Hubo un error actualizando la cita: " + err.message);
    }
  }

  async function eliminar(id) {
    const ok = confirm("Eliminar esta cita?");
    if (!ok) return;
    try {
      await deleteAppointment(id);
      await cargarCitas();
    } catch (err) {
      alert("Hubo un error eliminando la cita: " + err.message);
    }
  }

  async function verHistorial(customerId, customerName) {
    setCargandoHistorial(true);
    setHistorialCliente({ nombre: customerName, citas: [] });
    try {
      const data = await getCustomerHistory(customerId);
      setHistorialCliente({ nombre: customerName, citas: data });
    } catch (err) {
      alert("Hubo un error cargando el historial: " + err.message);
    } finally {
      setCargandoHistorial(false);
    }
  }

  async function agregarProducto(citaId) {
    const producto = products.find((p) => p.id === productoSel);
    if (!producto || !cantidadSel) return;
    try {
      await addAppointmentItems(citaId, businessId, [{ productId: producto.id, name: producto.name, qty: cantidadSel, unitPrice: producto.salePrice }]);
      setProductoSel("");
      setCantidadSel("");
      setAgregandoProductoA(null);
      await cargarCitas();
    } catch (err) {
      alert("Hubo un error agregando el producto: " + err.message);
    }
  }

  const linkReserva = window.location.origin + "/reservar/" + businessId;
  const fechaLegible = new Date(fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "16px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Citas</div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          <div
            onClick={() => { navigator.clipboard.writeText(linkReserva); alert("Link copiado: " + linkReserva); }}
            style={{ fontSize: 11.5, color: "#CFE3DB", marginTop: 4, cursor: "pointer", textDecoration: "underline" }}
          >
            Copiar link para que tus clientes reserven solos
          </div>
        </div>

        <div style={{ padding: "12px 22px", borderBottom: "1px solid " + COLORS.borde, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => cambiarDia(-1)} style={{ background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: COLORS.texto }}>‹</button>
            <div style={{ fontSize: 13.5, fontWeight: 600, textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>{fechaLegible}</div>
            <button onClick={() => cambiarDia(1)} style={{ background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: COLORS.texto }}>›</button>
            {fecha !== hoyISO() && (
              <button onClick={() => setFecha(hoyISO())} style={{ background: "transparent", border: "none", color: COLORS.marcaClaro, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Hoy</button>
            )}
          </div>
          <button
            onClick={() => setMostrandoForm((v) => !v)}
            style={{ background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {mostrandoForm ? "Cancelar" : "+ Nueva cita"}
          </button>
        </div>

        {mostrandoForm && (
          <form onSubmit={guardar} style={{ padding: "14px 22px", borderBottom: "1px solid " + COLORS.borde, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Nombre del cliente" style={{ flex: "1 1 160px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Telefono" style={{ flex: "1 1 140px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Servicio (ej: corte)" style={{ flex: "1 1 140px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.servicePrice} onChange={(e) => setForm({ ...form, servicePrice: e.target.value })} type="number" min="0" placeholder="Precio" style={{ width: 100, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} type="time" style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} type="number" min="5" placeholder="Min." style={{ width: 80, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <select value={form.stylistId} onChange={(e) => setForm({ ...form, stylistId: e.target.value })} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }}>
              <option value="">Quien atiende...</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Nota (opcional)" style={{ flex: "1 1 140px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <button type="submit" disabled={guardando} style={{ background: COLORS.marca, color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              {guardando ? "Guardando..." : "Agendar"}
            </button>
          </form>
        )}

        <div style={{ overflowY: "auto", padding: "6px 0" }}>
          {cargando && <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>Cargando...</div>}
          {!cargando && citas.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: COLORS.textoSuave, fontSize: 13.5 }}>No hay citas agendadas este dia.</div>
          )}
          {citas.map((c) => {
            const totalProductos = (c.appointment_items || []).reduce((s, it) => s + Number(it.qty) * Number(it.unit_price), 0);
            return (
              <div key={c.id} style={{ padding: "12px 22px", borderBottom: "1px solid " + COLORS.fondo }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{c.appointment_time.slice(0, 5)} · {c.customer_name}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.textoSuave }}>
                      {c.service_name} ({c.duration_minutes} min){c.service_price > 0 ? " · " + formatCOP(c.service_price) : ""}{c.stylist_name ? " · " + c.stylist_name : ""}{c.customer_phone ? " · " + c.customer_phone : ""}
                    </div>
                    {c.notes && <div style={{ fontSize: 12, color: COLORS.textoSuave, marginTop: 2 }}>{c.notes}</div>}
                    {totalProductos > 0 && (
                      <div style={{ fontSize: 12, color: COLORS.marcaClaro, marginTop: 2 }}>
                        + productos: {(c.appointment_items || []).map((it) => it.qty + "x " + it.product_name).join(", ")} ({formatCOP(totalProductos)})
                      </div>
                    )}
                    {c.customer_id && (
                      <button onClick={() => verHistorial(c.customer_id, c.customer_name)} style={{ fontSize: 11, background: "transparent", border: "none", color: COLORS.marcaClaro, cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: 4 }}>
                        Ver historial de este cliente
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: ESTADO_COLOR[c.status], background: c.status === "cancelada" || c.status === "no-show" ? "#FBE8E5" : COLORS.bienBg, padding: "2px 8px", borderRadius: 999 }}>
                      {ESTADO_LABEL[c.status]}
                    </span>
                    {(c.status === "pendiente" || c.status === "en-espera") && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button onClick={() => cambiarEstado(c.id, "confirmada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Confirmar</button>
                        {c.status === "pendiente" && (
                          <button onClick={() => cambiarEstado(c.id, "en-espera")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Lista espera</button>
                        )}
                        <button onClick={() => cambiarEstado(c.id, "cancelada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Cancelar</button>
                      </div>
                    )}
                    {c.status === "confirmada" && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button onClick={() => setAgregandoProductoA(agregandoProductoA === c.id ? null : c.id)} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>+ Producto</button>
                        <button onClick={() => cambiarEstado(c.id, "completada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Completada</button>
                        <button onClick={() => cambiarEstado(c.id, "no-show")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>No llego</button>
                      </div>
                    )}
                    <button onClick={() => eliminar(c.id)} style={{ fontSize: 10.5, background: "transparent", border: "none", color: COLORS.textoSuave, cursor: "pointer", textDecoration: "underline" }}>Eliminar</button>
                  </div>
                </div>

                {agregandoProductoA === c.id && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, background: COLORS.fondo, padding: 8, borderRadius: 8 }}>
                    <select value={productoSel} onChange={(e) => setProductoSel(e.target.value)} style={{ flex: 1, padding: "7px 9px", borderRadius: 7, border: "1px solid " + COLORS.borde, fontSize: 12.5 }}>
                      <option value="">Selecciona un producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCOP(p.salePrice)})</option>
                      ))}
                    </select>
                    <input value={cantidadSel} onChange={(e) => setCantidadSel(e.target.value)} type="number" min="1" placeholder="Cant." style={{ width: 70, padding: "7px 9px", borderRadius: 7, border: "1px solid " + COLORS.borde, fontSize: 12.5 }} />
                    <button onClick={() => agregarProducto(c.id)} style={{ background: COLORS.marcaClaro, color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Agregar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {historialCliente && (
        <div onClick={() => setHistorialCliente(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.6)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.panel, borderRadius: 14, width: "100%", maxWidth: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: COLORS.marca, color: "white", padding: "14px 18px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Historial de {historialCliente.nombre}</span>
              <button onClick={() => setHistorialCliente(null)} style={{ background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: 14 }}>
              {cargandoHistorial && <p style={{ fontSize: 13, color: COLORS.textoSuave }}>Cargando...</p>}
              {!cargandoHistorial && historialCliente.citas.length === 0 && <p style={{ fontSize: 13, color: COLORS.textoSuave }}>Sin citas anteriores.</p>}
              {historialCliente.citas.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid " + COLORS.fondo, fontSize: 13 }}>
                  <strong>{c.appointment_date}</strong> · {c.service_name} · {ESTADO_LABEL[c.status]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
