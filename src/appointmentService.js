import { supabase } from "./supabaseClient";

export async function getAppointmentsByDate(businessId, date) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", businessId)
    .eq("appointment_date", date)
    .order("appointment_time");
  if (error) throw error;
  return data;
}

export async function addAppointment(businessId, form) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      business_id: businessId,
      customer_name: form.customerName,
      customer_phone: form.customerPhone || null,
      service_name: form.serviceName,
      appointment_date: form.appointmentDate,
      appointment_time: form.appointmentTime,
      duration_minutes: Number(form.durationMinutes) || 30,
      stylist_name: form.stylistName || null,
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