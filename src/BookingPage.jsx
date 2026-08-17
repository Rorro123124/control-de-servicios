import { useState, useEffect } from "react";
import { getPublicBusinessInfo, submitPublicAppointmentRequest } from "./appointmentService";

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

export default function BookingPage({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", serviceName: "", appointmentDate: "", appointmentTime: "", notes: "" });

  useEffect(() => {
    getPublicBusinessInfo(businessId)
      .then((data) => {
        if (!data) {
          setError(true);
        } else {
          setBusiness(data);
        }
        setCargando(false);
      })
      .catch(() => {
        setError(true);
        setCargando(false);
      });
  }, [businessId]);

  async function enviar(e) {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.serviceName || !form.appointmentDate || !form.appointmentTime) return;
    setEnviando(true);
    try {
      await submitPublicAppointmentRequest(businessId, form);
      setEnviado(true);
    } catch (err) {
      alert("Hubo un error enviando tu solicitud: " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return <div style={{ textAlign: "center", marginTop: 80, fontFamily: FONT_BODY, color: COLORS.textoSuave }}>Cargando...</div>;
  }

  if (error) {
    return <div style={{ textAlign: "center", marginTop: 80, fontFamily: FONT_BODY, color: COLORS.textoSuave }}>No encontramos este negocio.</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.fondo, fontFamily: FONT_BODY, padding: "0 0 40px" }}>
      <div style={{ background: COLORS.marca, color: "white", padding: "28px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600 }}>{business.name}</div>
        <div style={{ fontSize: 13, color: "#CFE3DB", marginTop: 4 }}>Reserva tu cita</div>
      </div>

      <div style={{ maxWidth: 440, margin: "24px auto", padding: "0 16px" }}>
        {enviado ? (
          <div style={{ background: COLORS.panel, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.marca, marginBottom: 8 }}>Solicitud enviada</div>
            <p style={{ fontSize: 13.5, color: COLORS.textoSuave }}>
              Tu solicitud de cita fue enviada. El negocio se va a comunicar contigo para confirmarla.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ background: COLORS.panel, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Tu nombre</label>
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Tu telefono</label>
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Servicio que deseas</label>
            <input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Ej: corte, manicure, tinte..." required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Fecha deseada</label>
            <input value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} type="date" required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Hora deseada</label>
            <input value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} type="time" required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <label style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textoSuave }}>Nota (opcional)</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid " + COLORS.borde, fontSize: 14 }} />

            <button type="submit" disabled={enviando} style={{ marginTop: 6, background: COLORS.acento, color: "#2B2107", border: "none", borderRadius: 9, padding: "12px", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              {enviando ? "Enviando..." : "Solicitar cita"}
            </button>
            <p style={{ fontSize: 11.5, color: COLORS.textoSuave, textAlign: "center", margin: 0 }}>
              Esta es una solicitud. El negocio la va a confirmar contigo.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
