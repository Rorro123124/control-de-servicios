import { useState, useEffect } from "react";
import { getAppointmentsByDate, addAppointment, updateAppointmentStatus, deleteAppointment } from "./appointmentService";

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

const ESTADO_LABEL = { pendiente: "Pendiente", confirmada: "Confirmada", completada: "Completada", cancelada: "Cancelada", "no-show": "No llego" };
const ESTADO_COLOR = { pendiente: COLORS.acento, confirmada: COLORS.marcaClaro, completada: COLORS.marcaClaro, cancelada: COLORS.urgente, "no-show": COLORS.urgente };

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AppointmentsModal({ businessId, onClose }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", serviceName: "", appointmentTime: "", durationMinutes: "30", stylistName: "", notes: "" });

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
      await addAppointment(businessId, { ...form, appointmentDate: fecha });
      setForm({ customerName: "", customerPhone: "", serviceName: "", appointmentTime: "", durationMinutes: "30", stylistName: "", notes: "" });
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

  const fechaLegible = new Date(fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: COLORS.panel, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: COLORS.marca, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600 }}>Citas</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "12px 22px", borderBottom: "1px solid " + COLORS.borde, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Telefono (opcional)" style={{ flex: "1 1 140px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Servicio (ej: corte, manicure)" style={{ flex: "1 1 160px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} type="time" style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} type="number" min="5" placeholder="Min." style={{ width: 90, padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.stylistName} onChange={(e) => setForm({ ...form, stylistName: e.target.value })} placeholder="Atiende (opcional)" style={{ flex: "1 1 140px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Nota (opcional)" style={{ flex: "1 1 160px", padding: "9px 11px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 13.5 }} />
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
          {citas.map((c) => (
            <div key={c.id} style={{ padding: "12px 22px", borderBottom: "1px solid " + COLORS.fondo, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.appointment_time.slice(0, 5)} · {c.customer_name}</div>
                <div style={{ fontSize: 12.5, color: COLORS.textoSuave }}>
                  {c.service_name} ({c.duration_minutes} min){c.stylist_name ? " · " + c.stylist_name : ""}{c.customer_phone ? " · " + c.customer_phone : ""}
                </div>
                {c.notes && <div style={{ fontSize: 12, color: COLORS.textoSuave, marginTop: 2 }}>{c.notes}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: ESTADO_COLOR[c.status], background: c.status === "cancelada" || c.status === "no-show" ? "#FBE8E5" : COLORS.bienBg, padding: "2px 8px", borderRadius: 999 }}>
                  {ESTADO_LABEL[c.status]}
                </span>
                {c.status === "pendiente" && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => cambiarEstado(c.id, "confirmada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Confirmar</button>
                    <button onClick={() => cambiarEstado(c.id, "cancelada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Cancelar</button>
                  </div>
                )}
                {c.status === "confirmada" && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => cambiarEstado(c.id, "completada")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>Completada</button>
                    <button onClick={() => cambiarEstado(c.id, "no-show")} style={{ fontSize: 11, background: "transparent", border: "1px solid " + COLORS.urgente, color: COLORS.urgente, borderRadius: 6, padding: "3px 7px", cursor: "pointer" }}>No llego</button>
                  </div>
                )}
                <button onClick={() => eliminar(c.id)} style={{ fontSize: 10.5, background: "transparent", border: "none", color: COLORS.textoSuave, cursor: "pointer", textDecoration: "underline" }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
