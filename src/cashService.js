import { supabase } from "./supabaseClient";

export async function getOpenSession(businessId) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "abierta")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function openSession(businessId, openingAmount, openedBy) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({ business_id: businessId, opening_amount: Number(openingAmount) || 0, opened_by: openedBy || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function computeExpectedCash(businessId, session) {
  const { data, error } = await supabase
    .from("invoices")
    .select("total, payment_method, payment_cash_amount, created_at")
    .eq("business_id", businessId)
    .gte("created_at", session.opened_at);
  if (error) throw error;

  let ventasEfectivo = 0;
  (data || []).forEach((inv) => {
    if (inv.payment_method === "efectivo") ventasEfectivo += Number(inv.total) || 0;
    else if (inv.payment_method === "mixto") ventasEfectivo += Number(inv.payment_cash_amount) || 0;
  });

  return Number(session.opening_amount) + ventasEfectivo;
}

export async function closeSession(sessionId, countedAmount, expectedAmount) {
  const difference = Number(countedAmount) - Number(expectedAmount);
  const { error } = await supabase
    .from("cash_sessions")
    .update({
      closed_at: new Date().toISOString(),
      closing_counted: Number(countedAmount),
      closing_expected: Number(expectedAmount),
      closing_difference: difference,
      status: "cerrada",
    })
    .eq("id", sessionId);
  if (error) throw error;
  return difference;
}
