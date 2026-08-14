import { supabase } from "./supabaseClient";

export const MOTIVOS_MERMA = ["Dañado", "Vencido", "Otro"];

export async function getWasteRecords(businessId) {
  const { data, error } = await supabase
    .from("waste_records")
    .select("*")
    .eq("business_id", businessId)
    .order("waste_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addWasteRecord(businessId, form) {
  const { data: product } = await supabase.from("products").select("stock, name").eq("id", form.productId).single();
  if (!product) throw new Error("Producto no encontrado.");

  const qty = Number(form.qty);
  if (qty > Number(product.stock)) {
    throw new Error("No puedes dar de baja mas unidades de las que tienes en stock (" + product.stock + ").");
  }

  const { data, error } = await supabase
    .from("waste_records")
    .insert({
      business_id: businessId,
      product_id: form.productId,
      product_name: product.name,
      qty: qty,
      reason: form.reason,
      notes: form.notes || null,
      waste_date: form.wasteDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;

  const nuevoStock = Number(product.stock) - qty;
  await supabase.from("products").update({ stock: nuevoStock }).eq("id", form.productId);

  return data;
}

export async function deleteWasteRecord(id) {
  const { error } = await supabase.from("waste_records").delete().eq("id", id);
  if (error) throw error;
}
