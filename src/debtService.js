import { supabase } from "./supabaseClient";

// ---------- CLIENTES ----------
export async function getCustomers(businessId) {
  const { data, error } = await supabase.from("customers").select("*").eq("business_id", businessId).order("name");
  if (error) throw error;
  return data;
}

export async function addCustomer(businessId, form) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      name: form.name,
      lastname: form.lastname || null,
      id_number: form.idNumber || null,
      phone: form.phone || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findOrCreateCustomer(businessId, name, lastname, idNumber, phone) {
  const nombreCompleto = (name || "").trim();
  if (!nombreCompleto) throw new Error("Falta el nombre del cliente para fiar.");

  const { data: existentes } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("name", nombreCompleto)
    .eq("lastname", lastname || null);

  if (existentes && existentes.length > 0) return existentes[0];

  return addCustomer(businessId, { name: nombreCompleto, lastname, idNumber, phone });
}

// ---------- DEUDAS ----------
export async function getDebts(businessId) {
  const { data, error } = await supabase
    .from("debts")
    .select("*, customers(id, name, lastname, phone)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDebtsForCustomer(customerId) {
  const { data, error } = await supabase
    .from("debts")
    .select("*, debt_payments(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addDebt(businessId, customerId, amount, note, invoiceId, dueDate) {
  const { data, error } = await supabase
    .from("debts")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      invoice_id: invoiceId || null,
      amount: Number(amount),
      balance: Number(amount),
      note: note || null,
      due_date: dueDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addPayment(debtId, amount) {
  const { data: debt, error: debtError } = await supabase.from("debts").select("balance").eq("id", debtId).single();
  if (debtError) throw debtError;

  const nuevoSaldo = Math.max(0, Number(debt.balance) - Number(amount));
  const nuevoEstado = nuevoSaldo === 0 ? "pagada" : "parcial";

  const { error: payError } = await supabase.from("debt_payments").insert({ debt_id: debtId, amount: Number(amount) });
  if (payError) throw payError;

  const { error: updateError } = await supabase.from("debts").update({ balance: nuevoSaldo, status: nuevoEstado }).eq("id", debtId);
  if (updateError) throw updateError;
}
