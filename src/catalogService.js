import { supabase } from "./supabaseClient";

export async function getCatalog(businessId) {
  const { data, error } = await supabase.rpc("get_catalog", { target_business_id: businessId });
  if (error) throw error;
  return data;
}
