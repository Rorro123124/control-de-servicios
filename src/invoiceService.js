import { supabase } from "./supabaseClient";
import { registerSale } from "./productService";

export async function createInvoice(businessId, items, buyer) {
  const itemsTotal = items.reduce((s, it) => s + Number(it.salePrice) * Number(it.qty), 0);
  const deliveryFee = Number(buyer.deliveryFee) || 0;
  const total = itemsTotal + deliveryFee;

  const paymentMethod = buyer.paymentMethod || "efectivo";
  let cashAmount = null;
  let transferAmount = null;
  if (paymentMethod === "mixto") {
    cashAmount = Number(buyer.paymentCashAmount) || 0;
    transferAmount = Number(buyer.paymentTransferAmount) || 0;
  } else if (paymentMethod === "efectivo") {
    cashAmount = total;
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      business_id: businessId,
      buyer_name: buyer.name || null,
      buyer_lastname: buyer.lastname || null,
      buyer_id: buyer.idNumber || null,
      buyer_phone: buyer.phone || null,
      buyer_address: buyer.address || null,
      delivery_type: buyer.deliveryType || "lugar",
      delivery_fee: deliveryFee,
      cashier_name: buyer.cashierName || null,
      payment_method: paymentMethod,
      payment_cash_amount: cashAmount,
      payment_transfer_amount: transferAmount,
      total,
    })
    .select()
    .single();
  if (error) throw error;

  const itemsToInsert = items.map((it) => ({
    invoice_id: invoice.id,
    product_id: it.productId,
    product_name: it.name,
    qty: Number(it.qty),
    unit_price: Number(it.salePrice),
    subtotal: Number(it.salePrice) * Number(it.qty),
  }));

  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
  if (itemsError) throw itemsError;

  for (const it of items) {
    await registerSale(it.productId, Number(it.qty), new Date().toISOString().slice(0, 10), it.variantId || null);
  }

  return invoice;
}

export async function getInvoices(businessId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
