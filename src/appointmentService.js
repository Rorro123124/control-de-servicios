import { supabase } from "./supabaseClient";
import { findOrCreateCustomer } from "./debtService";
import { applyStockDelta } from "./productService";

export async function getAppointmentsByDate(businessId, date) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, appointment_items(*)")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .order("appointment_time");
  if (error) throw error;
  return data;
}

export async function addAppointment(businessId, form) {
  let customerId = null;
  if ((form.customerName || "").trim()) {
    try {
      const customer = await findOrCreateCustomer(businessId, form.customerName, "", "", form.customerPhone);
      customerId = customer.id;
    } catch (err) {
      console.error("No se pudo vincular el cliente a la cita:", err.message);
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      customer_name: form.customerName,
      customer_phone: form.customerPhone || null,
      service_name: form.serviceName,
      service_price: Number(form.servicePrice) || 0,
      stylist_id: form.stylistId || null,
      stylist_name: form.stylistName || null,
      appointment_date: form.appointmentDate,
      appointment_time: form.appointmentTime,
      duration_minutes: Number(form.durationMinutes) || 30,
      notes: form.notes || null,
      status: "pendiente",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(id, status) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function getCustomerHistory(customerId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("customer_id", customerId)
    .order("appointment_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addAppointmentItems(appointmentId, businessId, items) {
  const rows = items.map((it) => ({
    appointment_id: appointmentId,
    business_id: businessId,
    product_id: it.productId,
    product_name: it.name,
    qty: Number(it.qty),
    unit_price: Number(it.unitPrice) || 0,
  }));
  const { error } = await supabase.from("appointment_items").insert(rows);
  if (error) throw error;

  for (const it of items) {
    await applyStockDelta(it.productId, -Number(it.qty));
  }
}

export async function getAppointmentsForCommissionReport(businessId, fromDate, toDate) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, sellers(name)")
    .eq("business_id", businessId)
    .eq("status", "completada")
    .gte("appointment_date", fromDate)
    .lte("appointment_date", toDate);
  if (error) throw error;
  return data;
}

// ---------- Reserva publica (sin cuenta) ----------
export async function getPublicBusinessInfo(businessId) {
  const { data, error } = await supabase.rpc("get_business_public_name", { target_business_id: businessId });
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

export async function submitPublicAppointmentRequest(businessId, form) {
  const { error } = await supabase.from("appointments").insert({
    business_id: businessId,
    customer_name: form.customerName,
    customer_phone: form.customerPhone,
    service_name: form.serviceName,
    appointment_date: form.appointmentDate,
    appointment_time: form.appointmentTime,
    duration_minutes: 30,
    notes: form.notes || null,
    status: "pendiente",
  });
  if (error) throw error;
}
