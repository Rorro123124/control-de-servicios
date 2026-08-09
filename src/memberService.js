import { supabase } from "./supabaseClient";

export async function getMembers(businessId) {
  const { data, error } = await supabase.from("business_members").select("*").eq("business_id", businessId).order("created_at");
  if (error) throw error;
  return data;
}

export async function inviteMember(businessId, email, role) {
  const { data, error } = await supabase
    .from("business_members")
    .insert({ business_id: businessId, email: email.toLowerCase().trim(), role })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeMember(id) {
  const { error } = await supabase.from("business_members").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyRole(business) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData && userData.user ? userData.user.id : null;
  const email = userData && userData.user ? userData.user.email : null;

  if (business.owner_id && uid && business.owner_id === uid) return "admin";

  const { data, error } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .or("user_id.eq." + uid + ",email.eq." + email)
    .maybeSingle();

  if (error || !data) return "vendedor";
  return data.role;
}
