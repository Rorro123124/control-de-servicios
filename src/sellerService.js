import { supabase } from "./supabaseClient";

export async function getSellers(businessId) {
  const { data, error } = await supabase.from("sellers").select("*").eq("business_id", businessId).order("name");
  if (error) throw error;
  return data;
}

export async function addSeller(businessId, name) {
  const { data, error } = await supabase.from("sellers").insert({ business_id: businessId, name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSeller(id) {
  const { error } = await supabase.from("sellers").delete().eq("id", id);
  if (error) throw error;
}
