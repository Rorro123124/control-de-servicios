import { supabase } from "./supabaseClient";

export const OPERADORES = ["Claro", "Movistar", "Tigo", "WOM", "Otro"];

export async function getTopups(businessId) {
  const { data, error } = await supabase
    .from("topups")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addTopup(businessId, form) {
  const { data, error } = await supabase
    .from("topups")
    .insert({
      business_id: businessId,
      operator: form.operator,
      amount: Number(form.amount) || 0,
      profit: Number(form.profit) || 0,
      customer_phone: form.customerPhone || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTopup(id) {
  const { error } = await supabase.from("topups").delete().eq("id", id);
  if (error) throw error;
}
