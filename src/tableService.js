import { supabase } from "./supabaseClient";

// ============================================================
// SECTORES
// ============================================================

export async function getSectors(businessId) {
  const { data, error } = await supabase
    .from("restaurant_sectors")
    .select("*")
    .eq("business_id", businessId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function createSector(businessId, { name, color }) {
  const { data, error } = await supabase
    .from("restaurant_sectors")
    .insert({ business_id: businessId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSector(id, fields) {
  const { data, error } = await supabase
    .from("restaurant_sectors")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSector(id) {
  const { error } = await supabase.from("restaurant_sectors").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// MESAS
// ============================================================

export async function getTables(businessId) {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*, restaurant_sectors(name, color)")
    .eq("business_id", businessId)
    .order("number");
  if (error) throw error;
  return data;
}

export async function createTable(businessId, { number, name, capacity, sector_id }) {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      business_id: businessId,
      number,
      name: name || null,
      capacity: capacity || 4,
      sector_id: sector_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTable(id, fields) {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTable(id) {
  const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
  if (error) throw error;
}

export async function setTableStatus(tableId, status) {
  const { error } = await supabase
    .from("restaurant_tables")
    .update({ status })
    .eq("id", tableId);
  if (error) throw error;
}

// ============================================================
// ORDENES
// ============================================================

export async function openTableOrder(businessId, tableId, waiterName) {
  const { data: existing } = await supabase
    .from("table_orders")
    .select("id")
    .eq("table_id", tableId)
    .eq("status", "abierta")
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("table_orders")
    .insert({
      business_id: businessId,
      table_id: tableId,
      waiter_name: waiterName || null,
    })
    .select()
    .single();
  if (error) throw error;

  await setTableStatus(tableId, "ocupada");
  return data;
}

export async function getOpenOrder(tableId) {
  const { data, error } = await supabase
    .from("table_orders")
    .select("*, table_order_items(*)")
    .eq("table_id", tableId)
    .eq("status", "abierta")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addItemToOrder(orderId, { product_id, product_name, qty, unit_price, notes }) {
  const subtotal = Number(qty) * Number(unit_price);
  const { data, error } = await supabase
    .from("table_order_items")
    .insert({
      order_id: orderId,
      product_id: product_id || null,
      product_name,
      qty: Number(qty),
      unit_price: Number(unit_price),
      subtotal,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  await recalcOrderTotal(orderId);
  return data;
}

export async function removeItemFromOrder(itemId, orderId) {
  const { error } = await supabase.from("table_order_items").delete().eq("id", itemId);
  if (error) throw error;
  await recalcOrderTotal(orderId);
}

export async function updateItemQty(itemId, orderId, qty) {
  const { data: item } = await supabase
    .from("table_order_items")
    .select("unit_price")
    .eq("id", itemId)
    .single();
  const subtotal = Number(qty) * Number(item.unit_price);
  const { error } = await supabase
    .from("table_order_items")
    .update({ qty: Number(qty), subtotal })
    .eq("id", itemId);
  if (error) throw error;
  await recalcOrderTotal(orderId);
}

async function recalcOrderTotal(orderId) {
  const { data: items } = await supabase
    .from("table_order_items")
    .select("subtotal")
    .eq("order_id", orderId);
  const total = (items || []).reduce((s, i) => s + Number(i.subtotal), 0);
  await supabase.from("table_orders").update({ total }).eq("id", orderId);
}

export async function closeTableOrder(orderId, tableId) {
  const { error } = await supabase
    .from("table_orders")
    .update({ status: "cerrada", closed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
  await setTableStatus(tableId, "libre");
}

export async function getClosedOrders(businessId) {
  const { data, error } = await supabase
    .from("table_orders")
    .select("*, restaurant_tables(number, name), table_order_items(*)")
    .eq("business_id", businessId)
    .eq("status", "cerrada")
    .order("closed_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function transferOrder(orderId, newTableId, oldTableId) {
  const { error } = await supabase
    .from("table_orders")
    .update({ table_id: newTableId })
    .eq("id", orderId);
  if (error) throw error;
  await setTableStatus(oldTableId, "libre");
  await setTableStatus(newTableId, "ocupada");
}
