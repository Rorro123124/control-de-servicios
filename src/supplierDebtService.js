import { supabase } from "./supabaseClient";

export async function getSupplierDebts(businessId) {
  const { data, error } = await supabase
    .from("supplier_debts")
    .select("*, suppliers(id, name, phone), supplier_debt_payments(*)")
    .eq("business_id", businessId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createDebt(businessId, { supplier_id, description, amount, due_date }) {
  const { data, error } = await supabase
    .from("supplier_debts")
    .insert({
      business_id:  businessId,
      supplier_id:  supplier_id || null,
      description:  description || null,
      amount:       Number(amount),
      due_date:     due_date || null,
      status:       "pendiente",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function registerPayment(debtId, amount, notes = "") {
  const { data, error } = await supabase
    .from("supplier_debt_payments")
    .insert({ debt_id: debtId, amount: Number(amount), notes: notes || null })
    .select()
    .single();
  if (error) throw error;

  // Verificar si la deuda quedo saldada
  const { data: payments } = await supabase
    .from("supplier_debt_payments")
    .select("amount")
    .eq("debt_id", debtId);

  const { data: debt } = await supabase
    .from("supplier_debts")
    .select("amount")
    .eq("id", debtId)
    .single();

  const totalPagado = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
  if (totalPagado >= Number(debt.amount)) {
    await supabase.from("supplier_debts").update({ status: "pagada" }).eq("id", debtId);
  }

  return data;
}

export async function deleteDebt(id) {
  const { error } = await supabase.from("supplier_debts").delete().eq("id", id);
  if (error) throw error;
}

// Calcula el saldo pendiente de una deuda
export function getBalance(debt) {
  const paid = (debt.supplier_debt_payments || []).reduce(
    (s, p) => s + Number(p.amount),
    0
  );
  return Math.max(0, Number(debt.amount) - paid);
}

// Resumen total de lo que se le debe a cada proveedor
export function buildDebtSummary(debts) {
  const summary = {};
  (debts || []).forEach((d) => {
    if (d.status === "pagada") return;
    const name = d.suppliers?.name || "Sin proveedor";
    if (!summary[name]) summary[name] = 0;
    summary[name] += getBalance(d);
  });
  return Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => ({ name, total }));
}
