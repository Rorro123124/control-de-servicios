import { supabase } from "./supabaseClient";

export async function getExpenses(businessId) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("business_id", businessId)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addExpense(businessId, form) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      business_id: businessId,
      description: form.description,
      amount: Number(form.amount),
      category: form.category || null,
      expense_date: form.expenseDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId) {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}
