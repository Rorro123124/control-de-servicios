import { supabase } from "./supabaseClient";
import { applyStockDelta } from "./productService";

export async function getPurchaseOrders(businessId) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, purchase_order_items(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPurchaseOrder(businessId, supplierId, notes, items) {
  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({ business_id: businessId, supplier_id: supplierId || null, notes: notes || null, status: "pendiente" })
    .select()
    .single();
  if (error) throw error;

  const itemsToInsert = items.map((it) => ({
    purchase_order_id: order.id,
    business_id: businessId,
    product_id: it.productId || null,
    product_name: it.name,
    qty: Number(it.qty),
    unit_cost: Number(it.unitCost) || 0,
  }));

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert);
  if (itemsError) throw itemsError;

  return order;
}

export async function receivePurchaseOrder(order) {
  const items = order.purchase_order_items || [];

  for (const item of items) {
    if (!item.product_id) continue;
    await applyStockDelta(item.product_id, Number(item.qty), "Orden de compra recibida");
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "recibida", received_at: new Date().toISOString() })
    .eq("id", order.id);
  if (error) throw error;
}

export async function cancelPurchaseOrder(orderId) {
  const { error } = await supabase.from("purchase_orders").update({ status: "cancelada" }).eq("id", orderId);
  if (error) throw error;
}
