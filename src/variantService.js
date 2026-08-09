import { supabase } from "./supabaseClient";

export async function getVariants(productId) {
  const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", productId).order("name");
  if (error) throw error;
  return data;
}

export async function addVariant(productId, name, stock, barcode) {
  const { data, error } = await supabase
    .from("product_variants")
    .insert({ product_id: productId, name, stock: Number(stock) || 0, barcode: barcode || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVariantStock(variantId, newStock) {
  const { error } = await supabase.from("product_variants").update({ stock: Number(newStock) }).eq("id", variantId);
  if (error) throw error;
}

export async function deleteVariant(id) {
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw error;
}
