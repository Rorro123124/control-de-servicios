import { supabase } from "./supabaseClient";
import { getProducts } from "./productService";

export async function getOpenCount(businessId) {
  const { data, error } = await supabase
    .from("inventory_counts")
    .select("*, inventory_count_items(*)")
    .eq("business_id", businessId)
    .eq("status", "abierto")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startCount(businessId, countedBy) {
  const products = await getProducts(businessId);

  const { data: count, error } = await supabase
    .from("inventory_counts")
    .insert({ business_id: businessId, counted_by: countedBy || null })
    .select()
    .single();
  if (error) throw error;

  const items = [];
  products.forEach((p) => {
    if (p.itemType === "servicio") return;
    if (p.hasVariants) {
      (p.variants || []).forEach((v) => {
        items.push({
          count_id: count.id,
          product_id: p.id,
          variant_id: v.id,
          item_label: p.name + " - " + v.name,
          system_stock: v.stock,
        });
      });
    } else {
      items.push({
        count_id: count.id,
        product_id: p.id,
        variant_id: null,
        item_label: p.name,
        system_stock: p.stock,
      });
    }
  });

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("inventory_count_items").insert(items);
    if (itemsError) throw itemsError;
  }

  return getOpenCount(businessId);
}

export async function updateCountItem(itemId, countedStock, systemStock) {
  const diferencia = Number(countedStock) - Number(systemStock);
  const { error } = await supabase
    .from("inventory_count_items")
    .update({ counted_stock: Number(countedStock), difference: diferencia })
    .eq("id", itemId);
  if (error) throw error;
}

export async function applyCount(countId) {
  const { data: items, error } = await supabase.from("inventory_count_items").select("*").eq("count_id", countId);
  if (error) throw error;

  for (const item of items) {
    if (item.counted_stock === null || item.counted_stock === undefined) continue;
    if (Number(item.counted_stock) === Number(item.system_stock)) continue;

    if (item.variant_id) {
      await supabase.from("product_variants").update({ stock: item.counted_stock }).eq("id", item.variant_id);
    } else {
      await supabase.from("products").update({ stock: item.counted_stock }).eq("id", item.product_id);
    }
  }

  const { error: closeError } = await supabase
    .from("inventory_counts")
    .update({ status: "aplicado", finished_at: new Date().toISOString() })
    .eq("id", countId);
  if (closeError) throw closeError;
}

export async function cancelCount(countId) {
  const { error } = await supabase.from("inventory_counts").delete().eq("id", countId);
  if (error) throw error;
}
